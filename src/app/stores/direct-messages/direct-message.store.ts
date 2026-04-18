/**
 * @fileoverview Direct Message Store with proper conversation structure
 * @description Signal store managing direct message conversations and messages with Firestore integration.
 * @module DirectMessageStore
 */

import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

import {
  doc,
  DocumentData,
  Firestore,
  getDoc,
  QuerySnapshot,
  serverTimestamp,
  Unsubscribe,
  updateDoc,
} from '@angular/fire/firestore';
import {
  DirectMessage,
  DirectMessageConversation,
  getConversationId,
} from '@core/models/direct-message.model';
import { MentionParserService } from '@core/services/mention-parser/mention-parser.service';
import { ReactionService } from '@core/services/reaction/reaction.service';
import { startOrResumeConversation } from '../helpers/direct-message-conversation.helpers';
import { loadOlderDMMessages } from '../helpers/direct-message-listener.helpers';
import {
  loadConversations as loadConversationsHelper,
  loadMessages as loadMessagesHelper,
} from '../helpers/direct-message-loader.helpers';
import {
  deleteMessageWithThreads,
  sendMessageToFirestore,
  updateConversationPreview,
} from '../helpers/direct-message-operations.helpers';
import {
  buildHasMoreMessagesState,
  buildLeaveConversationState,
  buildLoadingOlderMessagesState,
  buildOlderMessagesSuccessState,
  cleanupAllListeners,
  cleanupSingleMessageListener,
  clearDebounceTimers,
  removeConversationFromUserDoc,
} from '../helpers/direct-message-state.helpers';
import { logError } from '../helpers/shared-error.helpers';
import { ThreadStore } from '../threads/thread.store';

type TimerHandle = ReturnType<typeof setTimeout>;

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
        (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime(),
      ),
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
    const mentionParser = inject(MentionParserService);
    const MAX_RETRIES = 3;
    const DEBOUNCE_MS = 100;
    const SNAPSHOT_DEBOUNCE_MS = 50;
    let conversationsUnsubscribe: Unsubscribe | null = null;
    let messagesSnapshots: Map<string, QuerySnapshot<DocumentData>> = new Map();
    let messagesUnsubscribers: Map<string, Unsubscribe> = new Map();
    let conversationsDebounceTimer: TimerHandle | null = null;
    let conversationsRetryCount = 0;
    let messagesDebounceTimers: Map<string, TimerHandle> = new Map();
    let messagesRetryCounters: Map<string, number> = new Map();

    const loadConversations = (userConversationIds: string[]): void => {
      loadConversationsHelper({
        firestore,
        userConversationIds,
        getConversationsDebounceTimer: () => conversationsDebounceTimer,
        setConversationsDebounceTimer: (timer) => {
          conversationsDebounceTimer = timer;
        },
        patchState: (state) => patchState(store, state),
        getConversationsUnsubscribe: () => conversationsUnsubscribe,
        setConversationsUnsubscribe: (unsub) => {
          conversationsUnsubscribe = unsub;
        },
        getConversationsRetryCount: () => conversationsRetryCount,
        setConversationsRetryCount: (count) => {
          conversationsRetryCount = count;
        },
        maxRetries: MAX_RETRIES,
        debounceMs: DEBOUNCE_MS,
        snapshotDebounceMs: SNAPSHOT_DEBOUNCE_MS,
        initialState,
      });
    };

    const loadMessages = (conversationId: string, options?: { once?: boolean }): void => {
      loadMessagesHelper({
        firestore,
        conversationId,
        once: options?.once,
        messagesDebounceTimers,
        messagesSnapshots,
        messagesUnsubscribers,
        messagesRetryCounters,
        patchState: (state) => patchState(store, state),
        getMessages: () => store.messages(),
        getUpdateCounter: () => store.updateCounter(),
        getHasMoreMessages: () => store.hasMoreMessages(),
        threadStore,
        maxRetries: MAX_RETRIES,
        debounceMs: DEBOUNCE_MS,
        snapshotDebounceMs: SNAPSHOT_DEBOUNCE_MS,
      });
    };

    const shouldSkipOlderMessagesLoad = (
      conversationId: string,
      snapshot: QuerySnapshot<DocumentData> | undefined,
    ): boolean => {
      return !snapshot || store.loadingOlderMessages()[conversationId];
    };

    const markNoMoreOlderMessages = (conversationId: string): void => {
      patchState(store, {
        hasMoreMessages: buildHasMoreMessagesState(store.hasMoreMessages(), conversationId, false),
      });
    };

    const startOlderMessagesLoading = (conversationId: string): void => {
      patchState(store, {
        loadingOlderMessages: buildLoadingOlderMessagesState(
          store.loadingOlderMessages(),
          conversationId,
          true,
        ),
      });
    };

    const finishOlderMessagesLoading = (conversationId: string): void => {
      patchState(store, {
        loadingOlderMessages: buildLoadingOlderMessagesState(
          store.loadingOlderMessages(),
          conversationId,
          false,
        ),
      });
    };

    const applyOlderMessagesSuccess = (
      conversationId: string,
      olderMessages: DirectMessage[],
    ): void => {
      patchState(
        store,
        buildOlderMessagesSuccessState(
          store.messages(),
          store.loadingOlderMessages(),
          store.hasMoreMessages(),
          conversationId,
          olderMessages,
        ),
      );
    };

    return {
      /**
       * Load conversations for user
       * @param {string[]} userConversationIds - User conversation IDs
       * @returns {Promise<void>}
       */
      loadConversations: (userConversationIds: string[]): Promise<void> => {
        loadConversations(userConversationIds);
        return Promise.resolve();
      },

      /**
       * Load messages for conversation
       * @param {string} conversationId - Conversation ID
       * @param options - Optional loading behavior
       * @returns {Promise<void>}
       */
      loadMessages: (conversationId: string, options?: { once?: boolean }): Promise<void> => {
        loadMessages(conversationId, options);
        return Promise.resolve();
      },

      /**
       * Start or resume conversation with user
       * @param {string} currentUserId - Current user ID
       * @param {string} otherUserId - Other user ID
       * @returns {Promise<{id: string; participants: [string, string]}>}
       */
      startConversation: async (
        currentUserId: string,
        otherUserId: string,
      ): Promise<{ id: string; participants: [string, string] }> => {
        const conversationId = getConversationId(currentUserId, otherUserId);
        const { conversations, result } = await startOrResumeConversation(
          firestore,
          conversationId,
          currentUserId,
          otherUserId,
          store.conversations(),
        );
        patchState(store, { conversations });
        return result;
      },

      /**
       * Send message to conversation
       * @param {string} conversationId - Conversation ID
       * @param {string} authorId - Author user ID
       * @param {string} content - Message content
       * @returns {Promise<void>}
       */
      sendMessage: async (
        conversationId: string,
        authorId: string,
        content: string,
      ): Promise<void> => {
        const mentionedUserIds = mentionParser.extractMentionedUserIds(content);
        await sendMessageToFirestore(
          firestore,
          conversationId,
          authorId,
          content,
          mentionedUserIds,
        );
        const conversationSnap = await getDoc(doc(firestore, 'direct-messages', conversationId));
        if (conversationSnap.exists()) {
          await updateConversationPreview(firestore, conversationId, content, authorId);
        }
      },

      /**
       * Update message content
       * @param {string} conversationId - Conversation ID
       * @param {string} messageId - Message ID
       * @param {string} content - New content
       * @returns {Promise<void>}
       */
      updateMessage: async (
        conversationId: string,
        messageId: string,
        content: string,
      ): Promise<void> => {
        await updateDoc(doc(firestore, `direct-messages/${conversationId}/messages/${messageId}`), {
          content,
          isEdited: true,
          editedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      },

      /**
       * Delete message and its threads
       * @param {string} conversationId - Conversation ID
       * @param {string} messageId - Message ID
       * @returns {Promise<void>}
       */
      deleteMessage: async (conversationId: string, messageId: string): Promise<void> => {
        await deleteMessageWithThreads(firestore, conversationId, messageId);
      },

      /**
       * Set active conversation
       * @param {string | null} conversationId - Conversation ID or null
       * @returns {void}
       */
      setActiveConversation: (conversationId: string | null): void => {
        patchState(store, { activeConversationId: conversationId });
        if (conversationId && !store.messages()[conversationId]) {
          loadMessages(conversationId);
        }
      },

      /**
       * Mark conversation as read
       * @param {string} conversationId - Conversation ID
       * @param {string} userId - User ID
       * @returns {Promise<void>}
       */
      markAsRead: async (conversationId: string, userId: string): Promise<void> => {
        await updateDoc(doc(firestore, 'direct-messages', conversationId), {
          [`unreadCount.${userId}`]: 0,
        });
      },

      /**
       * Toggle reaction on message
       * @param {string} conversationId - Conversation ID
       * @param {string} messageId - Message ID
       * @param {string} emojiId - Emoji ID
       * @param {string} userId - User ID
       * @returns {Promise<void>}
       */
      toggleReaction: async (
        conversationId: string,
        messageId: string,
        emojiId: string,
        userId: string,
      ): Promise<void> => {
        const messageRef = reactionService.getMessageRef(
          'direct-messages',
          conversationId,
          'messages',
          messageId,
        );
        await reactionService.toggleReaction(messageRef, emojiId, userId);
      },

      /**
       * Leave conversation
       * @param {string} conversationId - Conversation ID
       * @param {string} userId - User ID
       * @returns {Promise<void>}
       */
      leaveConversation: async (conversationId: string, userId: string): Promise<void> => {
        await removeConversationFromUserDoc(firestore, conversationId, userId);
        const nextState = buildLeaveConversationState(
          store.conversations(),
          store.messages(),
          store.activeConversationId(),
          conversationId,
        );
        patchState(store, nextState);
        cleanupSingleMessageListener(messagesUnsubscribers, conversationId);
      },
      /**
       * Load older messages for conversation
       * @param {string} conversationId - Conversation ID
       * @returns {Promise<void>}
       */
      loadOlderMessages: async (conversationId: string): Promise<void> => {
        const snapshot = messagesSnapshots.get(conversationId);
        if (!snapshot || shouldSkipOlderMessagesLoad(conversationId, snapshot)) return;
        const firstDoc = snapshot.docs[0];
        if (!firstDoc) {
          markNoMoreOlderMessages(conversationId);
          return;
        }
        startOlderMessagesLoading(conversationId);
        try {
          const olderMessages = await loadOlderDMMessages(firestore, conversationId, firstDoc);
          applyOlderMessagesSuccess(conversationId, olderMessages);
        } catch (error) {
          logError('loadOlderMessages', error);
          finishOlderMessagesLoading(conversationId);
        }
      },

      /**
       * Cleanup store listeners and timers
       * @returns {void}
       */
      destroy: (): void => {
        clearDebounceTimers(
          conversationsDebounceTimer,
          messagesDebounceTimers,
          messagesRetryCounters,
        );
        conversationsDebounceTimer = null;
        cleanupAllListeners(conversationsUnsubscribe, messagesUnsubscribers);
        conversationsUnsubscribe = null;
      },
    };
  }),
);
