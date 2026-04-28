/**
 * @fileoverview Mailbox Listener Helper Functions
 * @description Firestore listener setup and management for mailbox
 * @module stores/helpers
 */

import {
  collection,
  Firestore,
  onSnapshot,
  orderBy,
  query,
  Unsubscribe,
  where,
} from '@angular/fire/firestore';

/**
 * Setup Firestore listener for mailbox messages
 * @description Creates a recipient-scoped listener so each user only receives mailbox updates addressed to their UID.
 */
export const setupMailboxListener = (
  firestore: Firestore,
  userId: string,
  onSnapshotCallback: (snapshot: any) => void,
  onErrorCallback: (error: any) => void,
): Unsubscribe => {
  const messagesRef = collection(firestore, 'mailbox');
  const q = query(messagesRef, where('recipientId', '==', userId), orderBy('createdAt', 'desc'));
  return onSnapshot(q, onSnapshotCallback, onErrorCallback);
};
