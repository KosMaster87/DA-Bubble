/**
 * @fileoverview Direct Message Listener Management Helpers
 * @module DirectMessageListenerHelpers
 */

import {
  Firestore,
  collection,
  query,
  where,
  orderBy,
  onSnapshot as firestoreOnSnapshot,
  Unsubscribe,
} from '@angular/fire/firestore';
import { DirectMessage } from '@core/models/direct-message.model';

/**
 * Setup Firestore listener for conversations
 */
export const setupConversationsFirestoreListener = (
  firestore: Firestore,
  userConversationIds: string[],
  currentUnsubscribe: Unsubscribe | null,
  snapshotHandler: (snapshot: any) => void,
  errorHandler: (error: any) => void
): Unsubscribe => {
  if (currentUnsubscribe) {
    currentUnsubscribe();
  }
  const q = query(
    collection(firestore, 'direct-messages'),
    where('__name__', 'in', userConversationIds)
  );
  return firestoreOnSnapshot(q, snapshotHandler, errorHandler);
};

/**
 * Setup Firestore listener for messages
 */
export const setupMessagesFirestoreListener = (
  firestore: Firestore,
  conversationId: string,
  messagesUnsubscribers: Map<string, Unsubscribe>,
  snapshotHandler: (snapshot: any) => void,
  errorHandler: (error: any) => void
): Unsubscribe => {
  if (messagesUnsubscribers.has(conversationId)) {
    messagesUnsubscribers.get(conversationId)!();
  }
  const q = query(
    collection(firestore, 'direct-messages', conversationId, 'messages'),
    orderBy('createdAt', 'asc')
  );
  return firestoreOnSnapshot(q, snapshotHandler, errorHandler);
};

/**
 * Filter messages that have threads
 */
export const filterMessagesWithThreads = (messages: DirectMessage[]): DirectMessage[] =>
  messages.filter((m) => m.lastThreadTimestamp);

/**
 * Check if error is permission denied
 */
export const isPermissionError = (error: any): boolean =>
  error.code === 'permission-denied' || error.message?.includes('permissions');
