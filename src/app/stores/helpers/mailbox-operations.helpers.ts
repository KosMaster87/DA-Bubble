/**
 * @fileoverview Mailbox Operations Helper Functions
 * @description Firestore CRUD operations for mailbox messages
 * @module stores/helpers
 */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  Firestore,
  Timestamp,
  updateDoc,
} from '@angular/fire/firestore';
import { CreateMailboxMessageRequest } from '../mailbox/mailbox.store';

/**
 * Send a mailbox message to Firestore
 * @description Writes a new mailbox message with Timestamp.now() for both createdAt and updatedAt so the Firestore document is immediately queryable by time.
 */
export const sendMailboxMessage = async (
  firestore: Firestore,
  request: CreateMailboxMessageRequest,
): Promise<void> => {
  const messagesRef = collection(firestore, 'mailbox');
  const now = Timestamp.now();
  await addDoc(messagesRef, {
    recipientId: request.recipientId,
    authorId: request.authorId,
    subject: request.subject,
    content: request.content,
    type: request.type,
    isRead: false,
    createdAt: now,
    updatedAt: now,
    reactions: [],
    attachments: [],
  });
};

/**
 * Update message read status in Firestore
 * @description Patches only isRead and updatedAt to avoid overwriting other fields when the user reads a message.
 */
export const updateMessageReadStatus = async (
  firestore: Firestore,
  messageId: string,
  isRead: boolean,
): Promise<void> => {
  const messageRef = doc(firestore, 'mailbox', messageId);
  await updateDoc(messageRef, {
    isRead,
    updatedAt: Timestamp.now(),
  });
};

/**
 * Delete message from Firestore
 * @description Hard-deletes the mailbox document so deleted messages don't appear in future listener snapshots.
 */
export const deleteMailboxMessage = async (
  firestore: Firestore,
  messageId: string,
): Promise<void> => {
  const messageRef = doc(firestore, 'mailbox', messageId);
  await deleteDoc(messageRef);
};
