/**
 * @fileoverview Mailbox Listener Helper Functions
 * @description Firestore listener setup and management for mailbox
 * @module stores/helpers
 */

import {
  Firestore,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Unsubscribe,
} from '@angular/fire/firestore';
import { mapMailboxMessage } from './mailbox-store.helpers';

/**
 * Setup Firestore listener for mailbox messages
 */
export const setupMailboxListener = (
  firestore: Firestore,
  userId: string,
  onSnapshotCallback: (snapshot: any) => void,
  onErrorCallback: (error: any) => void
): Unsubscribe => {
  const messagesRef = collection(firestore, 'mailbox');
  const q = query(
    messagesRef,
    where('recipientId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, onSnapshotCallback, onErrorCallback);
};
