/**
 * @fileoverview Mailbox Operations Helper Functions
 * @description Firestore CRUD operations for mailbox messages
 * @module stores/helpers
 */

import {
  Firestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from '@angular/fire/firestore';
import { CreateMailboxMessageRequest } from '../mailbox/mailbox.store';

/**
 * Send a mailbox message to Firestore
 */
export const sendMailboxMessage = async (
  firestore: Firestore,
  request: CreateMailboxMessageRequest
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
 */
export const updateMessageReadStatus = async (
  firestore: Firestore,
  messageId: string,
  isRead: boolean
): Promise<void> => {
  const messageRef = doc(firestore, 'mailbox', messageId);
  await updateDoc(messageRef, {
    isRead,
    updatedAt: Timestamp.now(),
  });
};

/**
 * Delete message from Firestore
 */
export const deleteMailboxMessage = async (
  firestore: Firestore,
  messageId: string
): Promise<void> => {
  const messageRef = doc(firestore, 'mailbox', messageId);
  await deleteDoc(messageRef);
};
