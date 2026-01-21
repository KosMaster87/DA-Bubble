/**
 * @fileoverview DirectMessage snapshot and error handling helpers
 * @description Helper functions for managing Firestore snapshots and errors in DirectMessageStore
 * @module DirectMessageSnapshotHelpers
 */

import { DirectMessageConversation, DirectMessage } from '@core/models/direct-message.model';
import { mapConversation, mapMessage } from './direct-message-store.helpers';
import {
  setupConversationsFirestoreListener,
  setupMessagesFirestoreListener,
  filterMessagesWithThreads,
} from './direct-message-listener.helpers';
import { isPermissionError, isFirestoreInternalError, logError } from './shared-error.helpers';
import { Firestore, Unsubscribe, QuerySnapshot, DocumentData } from '@angular/fire/firestore';

/**
 * Handle conversations snapshot update
 * Updates store with new conversations data after debounce
 * @param {any} snapshot - Firestore snapshot
 * @param {(conversations: DirectMessageConversation[]) => void} updateStore - Callback to update store
 * @returns {void}
 */
export const handleConversationsSnapshot = (
  snapshot: any,
  updateStore: (conversations: DirectMessageConversation[]) => void
): void => {
  const conversations = snapshot.docs.map(mapConversation);
  updateStore(conversations);
};

/**
 * Handle conversations Firestore error
 * Manages permission errors, retry logic, and error state
 * @param {any} error - Firestore error object
 * @param {string[]} userConversationIds - User conversation IDs for retry
 * @param {() => void} cleanup - Cleanup function
 * @param {(userConversationIds: string[]) => void} retry - Retry function
 * @param {(error: string) => void} setError - Set error function
 * @param {number} retryCount - Current retry count
 * @param {number} maxRetries - Maximum retries
 * @returns {void}
 */
export const handleConversationsError = (
  error: any,
  userConversationIds: string[],
  cleanup: () => void,
  retry: (userConversationIds: string[]) => void,
  setError: (error: string) => void,
  retryCount: number,
  maxRetries: number
): void => {
  if (isPermissionError(error)) {
    console.log('🔓 Permission error - cleaning up conversations subscription');
    cleanup();
    return;
  }
  if (isFirestoreInternalError(error)) {
    retryConversationsLoad(userConversationIds, retry, retryCount, maxRetries);
    return;
  }
  logError('DM conversations', error);
  setError(error.message);
};

/**
 * Retry loading conversations after Firestore error
 * Implements exponential backoff up to MAX_RETRIES
 * @param {string[]} userConversationIds - User conversation IDs to reload
 * @param {(userConversationIds: string[]) => void} retry - Retry function
 * @param {number} retryCount - Current retry count
 * @param {number} maxRetries - Maximum retries
 * @returns {void}
 */
export const retryConversationsLoad = (
  userConversationIds: string[],
  retry: (userConversationIds: string[]) => void,
  retryCount: number,
  maxRetries: number
): void => {
  console.warn(`⚠️ Firestore error in DM conversations (${retryCount + 1}/${maxRetries})`);
  if (retryCount < maxRetries) {
    setTimeout(() => retry(userConversationIds), 500 * (retryCount + 1));
    return;
  }
  console.error('❌ Max retries reached for DM conversations');
};

/**
 * Setup Firestore listener for conversations
 * @param {Firestore} firestore - Firestore instance
 * @param {string[]} userConversationIds - Conversation IDs to listen to
 * @param {Unsubscribe | null} existingUnsubscribe - Existing unsubscribe function
 * @param {(snapshot: any) => void} onSnapshot - Snapshot handler
 * @param {(error: any) => void} onError - Error handler
 * @returns {Unsubscribe}
 */
export const setupConversationsListener = (
  firestore: Firestore,
  userConversationIds: string[],
  existingUnsubscribe: Unsubscribe | null,
  onSnapshot: (snapshot: any) => void,
  onError: (error: any) => void
): Unsubscribe => {
  return setupConversationsFirestoreListener(
    firestore,
    userConversationIds,
    existingUnsubscribe,
    onSnapshot,
    onError
  );
};

/**
 * Handle messages snapshot update
 * Updates store with new messages and loads threads
 * @param {string} conversationId - Conversation ID
 * @param {any} snapshot - Firestore snapshot
 * @param {(conversationId: string, messages: DirectMessage[]) => void} updateStore - Store update callback
 * @param {any} threadStore - Thread store instance
 * @returns {void}
 */
export const handleMessagesSnapshot = (
  conversationId: string,
  snapshot: any,
  updateStore: (conversationId: string, messages: DirectMessage[]) => void,
  threadStore: any
): void => {
  const messages = snapshot.docs.map(mapMessage);
  loadThreadsForMessages(conversationId, messages, threadStore);
  updateStore(conversationId, messages);
};

/**
 * Load threads for messages that have thread count
 * @param {string} conversationId - Conversation ID
 * @param {DirectMessage[]} messages - Messages to check for threads
 * @param {any} threadStore - Thread store instance
 * @returns {void}
 */
export const loadThreadsForMessages = (
  conversationId: string,
  messages: DirectMessage[],
  threadStore: any
): void => {
  const messagesWithThreads = filterMessagesWithThreads(messages);
  if (messagesWithThreads.length > 0) {
    messagesWithThreads.forEach((msg) => threadStore.loadThreads(conversationId, msg.id, true));
  }
};

/**
 * Handle messages Firestore error
 * @param {string} conversationId - Conversation ID
 * @param {any} error - Firestore error
 * @param {() => void} cleanup - Cleanup function
 * @param {(conversationId: string) => void} retry - Retry function
 * @param {(error: string) => void} setError - Set error function
 * @param {number} retryCount - Current retry count
 * @param {number} maxRetries - Maximum retries
 * @returns {void}
 */
export const handleMessagesError = (
  conversationId: string,
  error: any,
  cleanup: () => void,
  retry: (conversationId: string) => void,
  setError: (error: string) => void,
  retryCount: number,
  maxRetries: number
): void => {
  if (isPermissionError(error)) {
    console.log('🔓 Permission error - cleaning up DM messages subscription');
    cleanup();
    return;
  }
  if (isFirestoreInternalError(error)) {
    retryMessagesLoad(conversationId, retry, retryCount, maxRetries);
    return;
  }
  logError(`DM messages ${conversationId}`, error);
  setError(error.message);
};

/**
 * Retry loading messages after error
 * @param {string} conversationId - Conversation ID
 * @param {(conversationId: string) => void} retry - Retry function
 * @param {number} retryCount - Current retry count
 * @param {number} maxRetries - Maximum retries
 * @returns {void}
 */
export const retryMessagesLoad = (
  conversationId: string,
  retry: (conversationId: string) => void,
  retryCount: number,
  maxRetries: number
): void => {
  console.warn(`⚠️ Firestore error in DM messages ${conversationId} (${retryCount + 1}/${maxRetries})`);
  if (retryCount < maxRetries) {
    setTimeout(() => retry(conversationId), 500 * (retryCount + 1));
    return;
  }
  console.error(`❌ Max retries reached for DM messages: ${conversationId}`);
};

/**
 * Setup Firestore listener for messages
 * @param {Firestore} firestore - Firestore instance
 * @param {string} conversationId - Conversation ID
 * @param {Map<string, Unsubscribe>} messagesUnsubscribers - Map of unsubscribers
 * @param {(snapshot: any) => void} onSnapshot - Snapshot handler
 * @param {(error: any) => void} onError - Error handler
 * @returns {Unsubscribe}
 */
export const setupMessagesListener = (
  firestore: Firestore,
  conversationId: string,
  messagesUnsubscribers: Map<string, Unsubscribe>,
  onSnapshot: (snapshot: any) => void,
  onError: (error: any) => void
): Unsubscribe => {
  return setupMessagesFirestoreListener(
    firestore,
    conversationId,
    messagesUnsubscribers,
    onSnapshot,
    onError
  );
};
