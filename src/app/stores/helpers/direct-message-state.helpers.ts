/**
 * @fileoverview Direct Message State Management Helpers
 * @module DirectMessageStateHelpers
 */

import { arrayRemove, doc, Firestore, Unsubscribe, updateDoc } from '@angular/fire/firestore';
import { DirectMessage, DirectMessageConversation } from '@core/models/direct-message.model';

type TimerHandle = ReturnType<typeof setTimeout>;

export interface LeaveConversationState {
  conversations: DirectMessageConversation[];
  messages: { [conversationId: string]: DirectMessage[] };
  activeConversationId: string | null;
}

export interface LoadOlderMessagesState {
  messages: { [conversationId: string]: DirectMessage[] };
  loadingOlderMessages: { [conversationId: string]: boolean };
  hasMoreMessages: { [conversationId: string]: boolean };
}

/**
 * Filter conversations by ID
 */
export const filterConversationsById = (
  conversations: DirectMessageConversation[],
  excludeId: string,
): DirectMessageConversation[] => conversations.filter((c) => c.id !== excludeId);

/**
 * Filter messages by conversation ID
 */
export const filterMessagesByConversationId = (
  messages: { [conversationId: string]: DirectMessage[] },
  excludeId: string,
): { [conversationId: string]: DirectMessage[] } =>
  Object.fromEntries(Object.entries(messages).filter(([id]) => id !== excludeId));

/**
 * Remove conversation ID from user's directMessages array
 */
export const removeConversationFromUserDoc = async (
  firestore: Firestore,
  conversationId: string,
  userId: string,
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
  conversationId: string,
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
  conversationsTimer: TimerHandle | null,
  messagesTimers: Map<string, TimerHandle>,
  retryCounters: Map<string, number>,
): null => {
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
  messagesUnsubscribers: Map<string, Unsubscribe>,
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
  conversationId: string,
): boolean => conversations.some((c) => c.id === conversationId);

/**
 * Build state patch after leaving a conversation.
 */
export const buildLeaveConversationState = (
  conversations: DirectMessageConversation[],
  messages: { [conversationId: string]: DirectMessage[] },
  activeConversationId: string | null,
  conversationId: string,
): LeaveConversationState => {
  const nextState: LeaveConversationState = {
    conversations: filterConversationsById(conversations, conversationId),
    messages: filterMessagesByConversationId(messages, conversationId),
    activeConversationId,
  };

  if (activeConversationId === conversationId) {
    nextState.activeConversationId = null;
  }

  return nextState;
};

/**
 * Build loadingOlderMessages state patch for a single conversation.
 */
export const buildLoadingOlderMessagesState = (
  loadingOlderMessages: { [conversationId: string]: boolean },
  conversationId: string,
  isLoading: boolean,
): { [conversationId: string]: boolean } => ({
  ...loadingOlderMessages,
  [conversationId]: isLoading,
});

/**
 * Build hasMoreMessages state patch for a single conversation.
 */
export const buildHasMoreMessagesState = (
  hasMoreMessages: { [conversationId: string]: boolean },
  conversationId: string,
  hasMore: boolean,
): { [conversationId: string]: boolean } => ({
  ...hasMoreMessages,
  [conversationId]: hasMore,
});

/**
 * Build success state patch for older messages loading.
 */
export const buildOlderMessagesSuccessState = (
  messages: { [conversationId: string]: DirectMessage[] },
  loadingOlderMessages: { [conversationId: string]: boolean },
  hasMoreMessages: { [conversationId: string]: boolean },
  conversationId: string,
  olderMessages: DirectMessage[],
): LoadOlderMessagesState => {
  const currentMessages = messages[conversationId] || [];
  return {
    messages: { ...messages, [conversationId]: [...olderMessages, ...currentMessages] },
    loadingOlderMessages: buildLoadingOlderMessagesState(
      loadingOlderMessages,
      conversationId,
      false,
    ),
    hasMoreMessages: buildHasMoreMessagesState(
      hasMoreMessages,
      conversationId,
      olderMessages.length >= 100,
    ),
  };
};
