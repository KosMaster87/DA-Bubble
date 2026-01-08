/**
 * @fileoverview Direct Message State Management Helpers
 * @module DirectMessageStateHelpers
 */

import { Firestore, doc, updateDoc, arrayRemove, Unsubscribe } from '@angular/fire/firestore';
import { DirectMessageConversation, DirectMessage } from '@core/models/direct-message.model';

/**
 * Filter conversations by ID
 */
export const filterConversationsById = (
  conversations: DirectMessageConversation[],
  excludeId: string
): DirectMessageConversation[] => conversations.filter((c) => c.id !== excludeId);

/**
 * Filter messages by conversation ID
 */
export const filterMessagesByConversationId = (
  messages: { [conversationId: string]: DirectMessage[] },
  excludeId: string
): { [conversationId: string]: DirectMessage[] } =>
  Object.fromEntries(Object.entries(messages).filter(([id]) => id !== excludeId));

/**
 * Remove conversation ID from user's directMessages array
 */
export const removeConversationFromUserDoc = async (
  firestore: Firestore,
  conversationId: string,
  userId: string
) => {
  await updateDoc(doc(firestore, 'users', userId), {
    directMessages: arrayRemove(conversationId),
  });
};

/**
 * Cleanup single message listener
 */
export const cleanupSingleMessageListener = (
  messagesUnsubscribers: Map<string, Unsubscribe>,
  conversationId: string
) => {
  if (messagesUnsubscribers.has(conversationId)) {
    messagesUnsubscribers.get(conversationId)!();
    messagesUnsubscribers.delete(conversationId);
  }
};

/**
 * Clear all debounce timers
 */
export const clearDebounceTimers = (
  conversationsTimer: any,
  messagesTimers: Map<string, any>,
  retryCounters: Map<string, number>
): any => {
  if (conversationsTimer) {
    clearTimeout(conversationsTimer);
  }
  messagesTimers.forEach((timer) => clearTimeout(timer));
  messagesTimers.clear();
  retryCounters.clear();
  return null;
};

/**
 * Cleanup all listeners
 */
export const cleanupAllListeners = (
  conversationsUnsubscribe: Unsubscribe | null,
  messagesUnsubscribers: Map<string, Unsubscribe>
) => {
  if (conversationsUnsubscribe) conversationsUnsubscribe();
  messagesUnsubscribers.forEach((unsubscribe) => unsubscribe());
  messagesUnsubscribers.clear();
};

/**
 * Check if conversation exists in list
 */
export const conversationExists = (
  conversations: DirectMessageConversation[],
  conversationId: string
): boolean => conversations.some((c) => c.id === conversationId);
