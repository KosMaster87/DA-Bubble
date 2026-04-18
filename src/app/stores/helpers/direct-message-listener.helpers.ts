/**
 * @fileoverview Direct Message Listener Management Helpers
 * @description Helper functions for setting up and managing Firestore listeners for direct messages
 * @module DirectMessageListenerHelpers
 */

import {
  collection,
  DocumentData,
  Firestore,
  onSnapshot as firestoreOnSnapshot,
  getDocs,
  limit,
  orderBy,
  query,
  QueryDocumentSnapshot,
  startAfter,
  Unsubscribe,
  where,
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
  errorHandler: (error: any) => void,
): Unsubscribe => {
  if (currentUnsubscribe) {
    currentUnsubscribe();
  }
  const q = query(
    collection(firestore, 'direct-messages'),
    where('__name__', 'in', userConversationIds),
  );
  return firestoreOnSnapshot(q, snapshotHandler, errorHandler);
};

/**
 * Setup Firestore listener for messages
 * @description
 * Uses newest-first query to bound reads to recent data, then downstream helpers can
 * normalize order for rendering and unread calculations.
 */
export const setupMessagesFirestoreListener = (
  firestore: Firestore,
  conversationId: string,
  messagesUnsubscribers: Map<string, Unsubscribe>,
  snapshotHandler: (snapshot: any) => void,
  errorHandler: (error: any) => void,
  options?: { once?: boolean },
): Unsubscribe => {
  if (messagesUnsubscribers.has(conversationId)) {
    messagesUnsubscribers.get(conversationId)!();
  }
  // Load only last 100 messages to reduce Firestore reads
  const q = query(
    collection(firestore, 'direct-messages', conversationId, 'messages'),
    orderBy('createdAt', 'desc'),
    limit(100),
  );
  const once = options?.once === true;
  let handledFirstSnapshot = false;

  return firestoreOnSnapshot(
    q,
    (snapshot) => {
      if (once && handledFirstSnapshot) return;
      if (once) {
        handledFirstSnapshot = true;
        const existing = messagesUnsubscribers.get(conversationId);
        if (existing) {
          existing();
          messagesUnsubscribers.delete(conversationId);
        }
      }

      snapshotHandler(snapshot);
    },
    errorHandler,
  );
};

/**
 * Filter messages that have threads
 * @description
 * Thread loads are restricted to candidate parent messages to avoid unnecessary
 * subcollection listeners.
 */
export const filterMessagesWithThreads = (messages: DirectMessage[]): DirectMessage[] =>
  messages.filter((m) => m.lastThreadTimestamp);

/**
 * Check if error is permission denied
 */
export const isPermissionError = (error: any): boolean =>
  error.code === 'permission-denied' || error.message?.includes('permissions');

/**
 * Load older messages for pagination
 */
export const loadOlderDMMessages = async (
  firestore: Firestore,
  conversationId: string,
  lastMessage: QueryDocumentSnapshot<DocumentData>,
  limitCount: number = 100,
): Promise<DirectMessage[]> => {
  const q = query(
    collection(firestore, 'direct-messages', conversationId, 'messages'),
    orderBy('createdAt', 'desc'),
    startAfter(lastMessage),
    limit(limitCount),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data()['createdAt']?.toDate() || new Date(),
          updatedAt: doc.data()['updatedAt']?.toDate() || new Date(),
          editedAt: doc.data()['editedAt']?.toDate(),
          lastThreadTimestamp: doc.data()['lastThreadTimestamp']?.toDate(),
          reactions: doc.data()['reactions'] || [],
          threadCount: doc.data()['threadCount'] || 0,
        }) as DirectMessage,
    )
    .reverse();
};
