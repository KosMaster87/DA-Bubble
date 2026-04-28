/**
 * @fileoverview DirectMessage store callback helpers
 * @description Callback creators for store operations
 * @module DirectMessageCallbackHelpers
 */

import { DirectMessage, DirectMessageConversation } from '@core/models/direct-message.model';

/**
 * Create snapshot update callback for conversations
 * @param {(conversations: DirectMessageConversation[]) => void} updateFn - Update function
 * @returns {(conversations: DirectMessageConversation[]) => void}
 * @description Wraps the store update function in a stable closure so the snapshot listener always calls the most-current update logic.
 */
export const createConversationsUpdateCallback = (
  updateFn: (conversations: DirectMessageConversation[]) => void,
) => {
  return (conversations: DirectMessageConversation[]): void => {
    updateFn(conversations);
  };
};

/**
 * Create error callbacks for conversations
 * @param {() => void} cleanupFn - Cleanup function
 * @param {() => void} resetStateFn - Reset state function
 * @returns {{ cleanup: () => void }}
 * @description Composes cleanup and state reset into a single callback to prevent half-cleaned state when a conversation listener terminates.
 */
export const createConversationsCleanup = (cleanupFn: () => void, resetStateFn: () => void) => {
  return (): void => {
    cleanupFn();
    resetStateFn();
  };
};

/**
 * Create retry callback for conversations
 * @param {(ids: string[]) => void} loadFn - Load function
 * @param {() => number} getRetryCount - Get retry count
 * @param {(count: number) => void} setRetryCount - Set retry count
 * @returns {(ids: string[]) => void}
 * @description Increments the retry counter inside the returned callback so each retry is automatically tracked without exposing the counter to the store.
 */
export const createConversationsRetry = (
  loadFn: (ids: string[]) => void,
  getRetryCount: () => number,
  setRetryCount: (count: number) => void,
) => {
  return (ids: string[]): void => {
    setRetryCount(getRetryCount() + 1);
    loadFn(ids);
  };
};

/**
 * Create messages update callback
 * @param {(convId: string, messages: DirectMessage[]) => void} updateFn - Update function
 * @returns {(convId: string, messages: DirectMessage[]) => void}
 * @description Isolates the store update closure for message snapshots, keeping the listener setup code free of direct store references.
 */
export const createMessagesUpdateCallback = (
  updateFn: (convId: string, messages: DirectMessage[]) => void,
) => {
  return (convId: string, messages: DirectMessage[]): void => {
    updateFn(convId, messages);
  };
};

/**
 * Create cleanup callback for messages
 * @param {(conversationId: string) => void} cleanupFn - Cleanup function
 * @returns {() => void}
 * @description Closes over the conversationId so the returned callback can be used as a zero-argument unsubscribe handler.
 */
export const createMessagesCleanup = (
  cleanupFn: (conversationId: string) => void,
  conversationId: string,
) => {
  return (): void => {
    cleanupFn(conversationId);
  };
};

/**
 * Create retry callback for messages
 * @param {(convId: string) => void} loadFn - Load function
 * @param {(convId: string, count: number) => void} setRetryCount - Set retry count
 * @param {(convId: string) => number} getRetryCount - Get retry count
 * @returns {(convId: string) => void}
 * @description Increments the per-conversation retry counter and delegates to loadFn so error handlers don't need to manage the counter themselves.
 */
export const createMessagesRetry = (
  loadFn: (convId: string) => void,
  setRetryCount: (convId: string, count: number) => void,
  getRetryCount: (convId: string) => number,
) => {
  return (convId: string): void => {
    const currentCount = getRetryCount(convId);
    setRetryCount(convId, currentCount + 1);
    loadFn(convId);
  };
};
