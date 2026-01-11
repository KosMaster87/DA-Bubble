/**
 * @fileoverview Direct Message Store with proper conversation structure
 * @description Signal store managing direct message conversations and messages with Firestore integration.
 * @module DirectMessageStore
 */

import { computed, inject } from '@angular/core';
import { signalStore, withState, withMethods, withComputed, patchState } from '@ngrx/signals';
import {
  Firestore,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  Unsubscribe,
  QuerySnapshot,
  DocumentData,
} from '@angular/fire/firestore';
import { ThreadStore } from './thread.store';
import {
  DirectMessageConversation,
  DirectMessage,
  getConversationId,
} from '@core/models/direct-message.model';
import { ReactionService } from '@core/services/reaction/reaction.service';
import { mapConversation, mapMessage } from './helpers/direct-message-store.helpers';
import {
  createConversationDoc,
  buildNewConversation,
  updateBothUsersDirectMessages,
  checkAndReaddConversation,
  sendMessageToFirestore,
  updateConversationPreview,
  deleteMessageWithThreads,
} from './helpers/direct-message-operations.helpers';
import {
  setupConversationsFirestoreListener,
  setupMessagesFirestoreListener,
  filterMessagesWithThreads,
  loadOlderDMMessages,
} from './helpers/direct-message-listener.helpers';
import {
  filterConversationsById,
  filterMessagesByConversationId,
  removeConversationFromUserDoc,
  cleanupSingleMessageListener,
  clearDebounceTimers,
  cleanupAllListeners,
  conversationExists,
} from './helpers/direct-message-state.helpers';
import { isPermissionError, isFirestoreInternalError, logError } from './helpers/shared-error.helpers';

export interface DirectMessageState {
  conversations: DirectMessageConversation[];
  messages: { [conversationId: string]: DirectMessage[] };
  activeConversationId: string | null;
  isLoading: boolean;
  error: string | null;
  updateCounter: number;
  hasMoreMessages: { [conversationId: string]: boolean };
  loadingOlderMessages: { [conversationId: string]: boolean };
}

const initialState: DirectMessageState = {
  conversations: [],
  messages: {},
  activeConversationId: null,
  isLoading: false,
  error: null,
  updateCounter: 0,
  hasMoreMessages: {},
  loadingOlderMessages: {},
};

export const DirectMessageStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    sortedConversations: computed(() =>
      [...store.conversations()].sort(
        (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime()
      )
    ),
    activeMessages: computed(() => {
      const activeId = store.activeConversationId();
      return activeId ? store.messages()[activeId] || [] : [];
    }),
    activeConversation: computed(() => {
      const activeId = store.activeConversationId();
      return store.conversations().find((c) => c.id === activeId) || null;
    }),
  })),
  withMethods((store) => {
    const firestore = inject(Firestore);
    const reactionService = inject(ReactionService);
    const threadStore = inject(ThreadStore);
    let conversationsUnsubscribe: Unsubscribe | null = null;
    let messagesSnapshots: Map<string, QuerySnapshot<DocumentData>> = new Map();
    let messagesUnsubscribers: Map<string, Unsubscribe> = new Map();
    let conversationsDebounceTimer: any = null;
    let conversationsRetryCount = 0;
    let messagesDebounceTimers: Map<string, any> = new Map();
    let messagesRetryCounters: Map<string, number> = new Map();
    const MAX_RETRIES = 3;
    const DEBOUNCE_MS = 100;
    const SNAPSHOT_DEBOUNCE_MS = 50;

    const handleConversationsSnapshot = (snapshot: any) => {
      if (conversationsDebounceTimer) clearTimeout(conversationsDebounceTimer);
      conversationsDebounceTimer = setTimeout(() => {
        const conversations = snapshot.docs.map(mapConversation);
        patchState(store, { conversations, isLoading: false });
      }, SNAPSHOT_DEBOUNCE_MS);
    };

    const handleConversationsError = (error: any, userConversationIds: string[]) => {
      if (isPermissionError(error)) {
        console.log('🔓 Permission error - cleaning up conversations subscription');
        if (conversationsUnsubscribe) conversationsUnsubscribe();
        conversationsUnsubscribe = null;
        patchState(store, initialState);
        return;
      }
      if (isFirestoreInternalError(error)) {
        retryConversationsLoad(userConversationIds, error);
        return;
      }
      logError('DM conversations', error);
      patchState(store, { error: error.message, isLoading: false });
    };

    const retryConversationsLoad = (userConversationIds: string[], error: any) => {
      console.warn(`⚠️ Firestore error in DM conversations (${conversationsRetryCount + 1}/${MAX_RETRIES})`);
      if (conversationsRetryCount < MAX_RETRIES) {
        conversationsRetryCount++;
        setTimeout(() => loadConversations(userConversationIds), 500 * conversationsRetryCount);
        return;
      }
      console.error('❌ Max retries reached for DM conversations');
    };

    const setupConversationsListener = (userConversationIds: string[]) => {
      conversationsUnsubscribe = setupConversationsFirestoreListener(
        firestore,
        userConversationIds,
        conversationsUnsubscribe,
        handleConversationsSnapshot,
        (error) => handleConversationsError(error, userConversationIds)
      );
    };

    const loadConversations = (userConversationIds: string[]): void => {
      if (userConversationIds.length === 0) {
        patchState(store, { conversations: [], isLoading: false });
        return;
      }
      if (conversationsDebounceTimer) clearTimeout(conversationsDebounceTimer);
      conversationsDebounceTimer = setTimeout(() => {
        patchState(store, { isLoading: true, error: null });
        conversationsRetryCount = 0;
        try {
          setupConversationsListener(userConversationIds);
        } catch (error: any) {
          logError('setupConversationsListener', error);
          patchState(store, { error: error.message, isLoading: false });
        }
      }, DEBOUNCE_MS);
    };

    const handleMessagesSnapshot = (conversationId: string, snapshot: any) => {
      messagesSnapshots.set(conversationId, snapshot);
      if (messagesDebounceTimers.has(conversationId)) {
        clearTimeout(messagesDebounceTimers.get(conversationId));
      }
      const snapshotTimer = setTimeout(() => {
        const messages = snapshot.docs.map(mapMessage);
        loadThreadsForMessages(conversationId, messages);
        patchState(store, {
          messages: { ...store.messages(), [conversationId]: messages },
          updateCounter: store.updateCounter() + 1,
          hasMoreMessages: { ...store.hasMoreMessages(), [conversationId]: messages.length >= 100 },
        });
      }, SNAPSHOT_DEBOUNCE_MS);
      messagesDebounceTimers.set(conversationId, snapshotTimer);
    };

    const loadThreadsForMessages = (conversationId: string, messages: DirectMessage[]) => {
      const messagesWithThreads = filterMessagesWithThreads(messages);
      if (messagesWithThreads.length > 0) {
        messagesWithThreads.forEach((msg) => threadStore.loadThreads(conversationId, msg.id, true));
      }
    };

    const handleMessagesError = (conversationId: string, error: any) => {
      if (isPermissionError(error)) {
        console.log('🔓 Permission error - cleaning up DM messages subscription');
        const unsubscribe = messagesUnsubscribers.get(conversationId);
        if (unsubscribe) unsubscribe();
        messagesUnsubscribers.delete(conversationId);
        return;
      }
      if (isFirestoreInternalError(error)) {
        retryMessagesLoad(conversationId, error);
        return;
      }
      logError(`DM messages ${conversationId}`, error);
      patchState(store, { error: error.message });
    };

    const retryMessagesLoad = (conversationId: string, error: any) => {
      const retryCount = messagesRetryCounters.get(conversationId) || 0;
      console.warn(`⚠️ Firestore error in DM messages ${conversationId} (${retryCount + 1}/${MAX_RETRIES})`);
      if (retryCount < MAX_RETRIES) {
        messagesRetryCounters.set(conversationId, retryCount + 1);
        setTimeout(() => loadMessages(conversationId), 500 * (retryCount + 1));
        return;
      }
      console.error(`❌ Max retries reached for DM messages: ${conversationId}`);
    };

    const setupMessagesListener = (conversationId: string) => {
      const unsubscribe = setupMessagesFirestoreListener(
        firestore,
        conversationId,
        messagesUnsubscribers,
        (snapshot) => handleMessagesSnapshot(conversationId, snapshot),
        (error) => handleMessagesError(conversationId, error)
      );
      messagesUnsubscribers.set(conversationId, unsubscribe);
    };

    const loadMessages = (conversationId: string): void => {
      if (messagesDebounceTimers.has(conversationId)) {
        clearTimeout(messagesDebounceTimers.get(conversationId));
      }
      const debounceTimer = setTimeout(() => {
        messagesRetryCounters.set(conversationId, 0);
        try {
          setupMessagesListener(conversationId);
        } catch (error: any) {
          logError('setupMessagesListener', error);
          patchState(store, { error: error.message });
        }
      }, DEBOUNCE_MS);
      messagesDebounceTimers.set(conversationId, debounceTimer);
    };

    const createNewConv = async (
      conversationId: string,
      currentUserId: string,
      otherUserId: string
    ) => {
      await createConversationDoc(firestore, conversationId, currentUserId, otherUserId);
      const newConversation = buildNewConversation(conversationId, currentUserId, otherUserId);
      patchState(store, { conversations: [...store.conversations(), newConversation] });
      await updateBothUsersDirectMessages(firestore, currentUserId, otherUserId, conversationId);
    };

    const readdConversationIfNeeded = async (
      conversationId: string,
      conversationSnap: any,
      currentUserId: string
    ) => {
      const wasReadded = await checkAndReaddConversation(firestore, conversationId, currentUserId);
      if (wasReadded && !conversationExists(store.conversations(), conversationId)) {
        patchState(store, {
          conversations: [...store.conversations(), mapConversation(conversationSnap)],
        });
      }
    };

    const removeConversationFromState = (conversationId: string) => {
      const filteredConversations = filterConversationsById(store.conversations(), conversationId);
      const filteredMessages = filterMessagesByConversationId(store.messages(), conversationId);
      patchState(store, { conversations: filteredConversations, messages: filteredMessages });
      if (store.activeConversationId() === conversationId) {
        patchState(store, { activeConversationId: null });
      }
    };

    const cleanupMessageListener = (conversationId: string) => {
      cleanupSingleMessageListener(messagesUnsubscribers, conversationId);
    };

    const clearAllDebounceTimers = () => {
      clearDebounceTimers(conversationsDebounceTimer, messagesDebounceTimers, messagesRetryCounters);
      conversationsDebounceTimer = null;
    };

    const clearAllListeners = () => {
      cleanupAllListeners(conversationsUnsubscribe, messagesUnsubscribers);
      conversationsUnsubscribe = null;
    };

    return {
      loadConversations: (userConversationIds: string[]): Promise<void> => {
        loadConversations(userConversationIds);
        return Promise.resolve();
      },

      loadMessages: (conversationId: string): Promise<void> => {
        loadMessages(conversationId);
        return Promise.resolve();
      },

      async startConversation(
        currentUserId: string,
        otherUserId: string
      ): Promise<{ id: string; participants: [string, string] }> {
        const conversationId = getConversationId(currentUserId, otherUserId);
        const conversationRef = doc(firestore, 'direct-messages', conversationId);
        try {
          const conversationSnap = await getDoc(conversationRef);
          if (!conversationSnap.exists()) {
            await createNewConv(conversationId, currentUserId, otherUserId);
          } else {
            await readdConversationIfNeeded(conversationId, conversationSnap, currentUserId);
          }
          return {
            id: conversationId,
            participants: [currentUserId, otherUserId].sort() as [string, string],
          };
        } catch (error: any) {
          console.error('❌ Error starting conversation:', error);
          throw error;
        }
      },

      async sendMessage(conversationId: string, authorId: string, content: string): Promise<void> {
        await sendMessageToFirestore(firestore, conversationId, authorId, content);
        const conversationSnap = await getDoc(doc(firestore, 'direct-messages', conversationId));
        if (conversationSnap.exists()) {
          await updateConversationPreview(firestore, conversationId, content, authorId);
        }
      },

      async updateMessage(
        conversationId: string,
        messageId: string,
        content: string
      ): Promise<void> {
        await updateDoc(doc(firestore, `direct-messages/${conversationId}/messages/${messageId}`), {
          content,
          isEdited: true,
          editedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      },

      async deleteMessage(conversationId: string, messageId: string): Promise<void> {
        await deleteMessageWithThreads(firestore, conversationId, messageId);
      },

      setActiveConversation(conversationId: string | null): void {
        patchState(store, { activeConversationId: conversationId });
        if (conversationId && !store.messages()[conversationId]) {
          this.loadMessages(conversationId);
        }
      },

      async markAsRead(conversationId: string, userId: string): Promise<void> {
        await updateDoc(doc(firestore, 'direct-messages', conversationId), {
          [`unreadCount.${userId}`]: 0,
        });
      },

      async toggleReaction(
        conversationId: string,
        messageId: string,
        emojiId: string,
        userId: string
      ): Promise<void> {
        const messageRef = reactionService.getMessageRef(
          'direct-messages',
          conversationId,
          'messages',
          messageId
        );
        await reactionService.toggleReaction(messageRef, emojiId, userId);
      },

      async leaveConversation(conversationId: string, userId: string): Promise<void> {
        await removeConversationFromUserDoc(firestore, conversationId, userId);
        removeConversationFromState(conversationId);
        cleanupMessageListener(conversationId);
      },
      async loadOlderMessages(conversationId: string): Promise<void> {
        const snapshot = messagesSnapshots.get(conversationId);
        if (!snapshot || store.loadingOlderMessages()[conversationId]) {
          return;
        }

        const firstDoc = snapshot.docs[0];
        if (!firstDoc) {
          patchState(store, {
            hasMoreMessages: { ...store.hasMoreMessages(), [conversationId]: false },
          });
          return;
        }

        patchState(store, {
          loadingOlderMessages: { ...store.loadingOlderMessages(), [conversationId]: true },
        });

        try {
          const olderMessages = await loadOlderDMMessages(firestore, conversationId, firstDoc);

          if (olderMessages.length === 0) {
            patchState(store, {
              hasMoreMessages: { ...store.hasMoreMessages(), [conversationId]: false },
              loadingOlderMessages: { ...store.loadingOlderMessages(), [conversationId]: false },
            });
            return;
          }

          const currentMessages = store.messages()[conversationId] || [];
          const allMessages = [...olderMessages, ...currentMessages];

          patchState(store, {
            messages: { ...store.messages(), [conversationId]: allMessages },
            loadingOlderMessages: { ...store.loadingOlderMessages(), [conversationId]: false },
            hasMoreMessages: { ...store.hasMoreMessages(), [conversationId]: olderMessages.length >= 100 },
          });
        } catch (error) {
          logError('loadOlderMessages', error);
          patchState(store, {
            loadingOlderMessages: { ...store.loadingOlderMessages(), [conversationId]: false },
          });
        }
      },
      destroy: (): void => {
        clearAllDebounceTimers();
        clearAllListeners();
      },
    };
  })
);
