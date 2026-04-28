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
 * @description Returns a new array excluding the given conversation so the leave-conversation flow can update state immutably.
 */
export const filterConversationsById = (
  conversations: DirectMessageConversation[],
  excludeId: string,
): DirectMessageConversation[] => conversations.filter((c) => c.id !== excludeId);

/**
 * Filter messages by conversation ID
 * @description Removes a single conversation's message map entry so the store state stays in sync with the conversation list after leaving.
 */
export const filterMessagesByConversationId = (
  messages: { [conversationId: string]: DirectMessage[] },
  excludeId: string,
): { [conversationId: string]: DirectMessage[] } =>
  Object.fromEntries(Object.entries(messages).filter(([id]) => id !== excludeId));

/**
 * Remove conversation ID from user's directMessages array
 * @description Cleans up the user document so re-fetching the DM list on the next login no longer includes the left conversation.
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
 * @description Tears down a specific per-conversation Firestore listener to prevent memory leaks when a conversation is left.
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
 * @description Cancels all pending debounce timers and clears retry counters so no stale callbacks fire after a full cleanup.
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
 * @description Unsubscribes both the conversation-level and all per-message Firestore listeners in one call to prevent duplicate updates.
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
 * @description Guards against duplicate conversation entries before adding a newly loaded conversation to the store.
 */
export const conversationExists = (
  conversations: DirectMessageConversation[],
  conversationId: string,
): boolean => conversations.some((c) => c.id === conversationId);

/**
 * Build state patch after leaving a conversation.
 * @description Computes the full leave-conversation state patch in one place so the store's patchState call stays readable.
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
 * @description Immutably merges the loading flag for one conversation without touching flags for other conversations.
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
 * @description Immutably merges the hasMore flag for one conversation so pagination state is managed per-conversation.
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
 * @description Prepends older messages to the existing list and resets pagination flags for the conversation in one combined patch.
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
