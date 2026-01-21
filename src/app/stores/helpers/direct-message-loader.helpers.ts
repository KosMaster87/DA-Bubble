/**
 * @fileoverview DirectMessage loader helpers
 * @description Complex loader functions for conversations and messages
 * @module DirectMessageLoaderHelpers
 */

import { Firestore, Unsubscribe, QuerySnapshot, DocumentData } from '@angular/fire/firestore';
import { DirectMessageConversation, DirectMessage } from '@core/models/direct-message.model';
import {
  handleConversationsSnapshot,
  handleConversationsError,
  setupConversationsListener as setupConvListener,
  handleMessagesSnapshot,
  handleMessagesError,
  setupMessagesListener as setupMsgListener,
} from './direct-message-snapshot.helpers';
import { logError } from './shared-error.helpers';

/**
 * Load conversations with debounce and error handling
 * @param {Firestore} firestore - Firestore instance
 * @param {string[]} userConversationIds - Conversation IDs
 * @param {any} conversationsDebounceTimer - Debounce timer
 * @param {(timer: any) => void} setConversationsDebounceTimer - Set timer
 * @param {(state: any) => void} patchState - Patch state function
 * @param {() => DirectMessageConversation[]} getConversations - Get conversations
 * @param {Unsubscribe | null} conversationsUnsubscribe - Existing unsubscribe
 * @param {(unsub: Unsubscribe | null) => void} setConversationsUnsubscribe - Set unsubscribe
 * @param {number} conversationsRetryCount - Retry count
 * @param {(count: number) => void} setConversationsRetryCount - Set retry count
 * @param {number} MAX_RETRIES - Max retries
 * @param {number} DEBOUNCE_MS - Debounce milliseconds
 * @param {number} SNAPSHOT_DEBOUNCE_MS - Snapshot debounce milliseconds
 * @param {any} initialState - Initial state
 * @returns {void}
 */
export const loadConversations = (
  firestore: Firestore,
  userConversationIds: string[],
  conversationsDebounceTimer: any,
  setConversationsDebounceTimer: (timer: any) => void,
  patchState: (state: any) => void,
  getConversations: () => DirectMessageConversation[],
  conversationsUnsubscribe: Unsubscribe | null,
  setConversationsUnsubscribe: (unsub: Unsubscribe | null) => void,
  conversationsRetryCount: number,
  setConversationsRetryCount: (count: number) => void,
  MAX_RETRIES: number,
  DEBOUNCE_MS: number,
  SNAPSHOT_DEBOUNCE_MS: number,
  initialState: any
): void => {
  if (userConversationIds.length === 0) {
    patchState({ conversations: [], isLoading: false });
    return;
  }
  if (conversationsDebounceTimer) clearTimeout(conversationsDebounceTimer);
  const timer = setTimeout(() => {
    patchState({ isLoading: true, error: null });
    setConversationsRetryCount(0);
    try {
      const handleSnapshot = (snapshot: any): void => {
        if (conversationsDebounceTimer) clearTimeout(conversationsDebounceTimer);
        const snapshotTimer = setTimeout(() => {
          handleConversationsSnapshot(snapshot, (conversations: DirectMessageConversation[]) => {
            patchState({ conversations, isLoading: false });
          });
        }, SNAPSHOT_DEBOUNCE_MS);
        setConversationsDebounceTimer(snapshotTimer);
      };
      const handleError = (error: any): void => {
        handleConversationsError(
          error,
          userConversationIds,
          () => {
            if (conversationsUnsubscribe) conversationsUnsubscribe();
            setConversationsUnsubscribe(null);
            patchState(initialState);
          },
          (ids: string[]) => {
            setConversationsRetryCount(conversationsRetryCount + 1);
            loadConversations(
              firestore,
              ids,
              conversationsDebounceTimer,
              setConversationsDebounceTimer,
              patchState,
              getConversations,
              conversationsUnsubscribe,
              setConversationsUnsubscribe,
              conversationsRetryCount,
              setConversationsRetryCount,
              MAX_RETRIES,
              DEBOUNCE_MS,
              SNAPSHOT_DEBOUNCE_MS,
              initialState
            );
          },
          (errorMsg: string) => patchState({ error: errorMsg, isLoading: false }),
          conversationsRetryCount,
          MAX_RETRIES
        );
      };
      const unsub = setupConvListener(
        firestore,
        userConversationIds,
        conversationsUnsubscribe,
        handleSnapshot,
        handleError
      );
      setConversationsUnsubscribe(unsub);
    } catch (error: any) {
      logError('setupConversationsListener', error);
      patchState({ error: error.message, isLoading: false });
    }
  }, DEBOUNCE_MS);
  setConversationsDebounceTimer(timer);
};

/**
 * Load messages with debounce and error handling
 * @param {Firestore} firestore - Firestore instance
 * @param {string} conversationId - Conversation ID
 * @param {Map<string, any>} messagesDebounceTimers - Debounce timers
 * @param {Map<string, QuerySnapshot<DocumentData>>} messagesSnapshots - Snapshots
 * @param {Map<string, Unsubscribe>} messagesUnsubscribers - Unsubscribers
 * @param {Map<string, number>} messagesRetryCounters - Retry counters
 * @param {(state: any) => void} patchState - Patch state function
 * @param {() => { [conversationId: string]: DirectMessage[] }} getMessages - Get messages
 * @param {() => number} getUpdateCounter - Get update counter
 * @param {() => { [conversationId: string]: boolean }} getHasMoreMessages - Get hasMoreMessages
 * @param {any} threadStore - Thread store
 * @param {number} MAX_RETRIES - Max retries
 * @param {number} DEBOUNCE_MS - Debounce milliseconds
 * @param {number} SNAPSHOT_DEBOUNCE_MS - Snapshot debounce milliseconds
 * @returns {void}
 */
export const loadMessages = (
  firestore: Firestore,
  conversationId: string,
  messagesDebounceTimers: Map<string, any>,
  messagesSnapshots: Map<string, QuerySnapshot<DocumentData>>,
  messagesUnsubscribers: Map<string, Unsubscribe>,
  messagesRetryCounters: Map<string, number>,
  patchState: (state: any) => void,
  getMessages: () => { [conversationId: string]: DirectMessage[] },
  getUpdateCounter: () => number,
  getHasMoreMessages: () => { [conversationId: string]: boolean },
  threadStore: any,
  MAX_RETRIES: number,
  DEBOUNCE_MS: number,
  SNAPSHOT_DEBOUNCE_MS: number
): void => {
  if (messagesDebounceTimers.has(conversationId)) {
    clearTimeout(messagesDebounceTimers.get(conversationId));
  }
  const timer = setTimeout(() => {
    messagesRetryCounters.set(conversationId, 0);
    try {
      const handleSnapshot = (snapshot: any): void => {
        messagesSnapshots.set(conversationId, snapshot);
        if (messagesDebounceTimers.has(conversationId)) {
          clearTimeout(messagesDebounceTimers.get(conversationId));
        }
        const snapshotTimer = setTimeout(() => {
          handleMessagesSnapshot(
            conversationId,
            snapshot,
            (convId: string, messages: DirectMessage[]) => {
              patchState({
                messages: { ...getMessages(), [convId]: messages },
                updateCounter: getUpdateCounter() + 1,
                hasMoreMessages: { ...getHasMoreMessages(), [convId]: messages.length >= 100 },
              });
            },
            threadStore
          );
        }, SNAPSHOT_DEBOUNCE_MS);
        messagesDebounceTimers.set(conversationId, snapshotTimer);
      };
      const handleError = (error: any): void => {
        const retryCount = messagesRetryCounters.get(conversationId) || 0;
        handleMessagesError(
          conversationId,
          error,
          () => {
            const unsubscribe = messagesUnsubscribers.get(conversationId);
            if (unsubscribe) unsubscribe();
            messagesUnsubscribers.delete(conversationId);
          },
          (convId: string) => {
            const currentRetry = messagesRetryCounters.get(convId) || 0;
            messagesRetryCounters.set(convId, currentRetry + 1);
            loadMessages(
              firestore,
              convId,
              messagesDebounceTimers,
              messagesSnapshots,
              messagesUnsubscribers,
              messagesRetryCounters,
              patchState,
              getMessages,
              getUpdateCounter,
              getHasMoreMessages,
              threadStore,
              MAX_RETRIES,
              DEBOUNCE_MS,
              SNAPSHOT_DEBOUNCE_MS
            );
          },
          (errorMsg: string) => patchState({ error: errorMsg }),
          retryCount,
          MAX_RETRIES
        );
      };
      const unsub = setupMsgListener(
        firestore,
        conversationId,
        messagesUnsubscribers,
        handleSnapshot,
        handleError
      );
      messagesUnsubscribers.set(conversationId, unsub);
    } catch (error: any) {
      logError('setupMessagesListener', error);
      patchState({ error: error.message });
    }
  }, DEBOUNCE_MS);
  messagesDebounceTimers.set(conversationId, timer);
};
