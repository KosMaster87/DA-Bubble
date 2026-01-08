/**
 * @fileoverview Mailbox Store Helper Functions
 * @description Core mapping and utility functions for mailbox store
 * @module stores/helpers
 */

import { QueryDocumentSnapshot, DocumentData, Timestamp } from '@angular/fire/firestore';
import { MailboxMessage, MailboxMessageType } from '../mailbox.store';

/**
 * Convert Timestamp to Date
 */
export const toDate = (timestamp: any): Date => {
  if (!timestamp) return new Date();
  return timestamp instanceof Timestamp ? timestamp.toDate() : new Date();
};

/**
 * Convert Firestore document to MailboxMessage
 */
export const mapMailboxMessage = (doc: QueryDocumentSnapshot<DocumentData>): MailboxMessage => {
  const data = doc.data();
  return {
    id: doc.id,
    recipientId: data['recipientId'],
    authorId: data['authorId'],
    subject: data['subject'],
    content: data['content'],
    createdAt: toDate(data['createdAt']),
    updatedAt: toDate(data['updatedAt']),
    isRead: data['isRead'] || false,
    type: (data['type'] || 'user') as MailboxMessageType,
    reactions: data['reactions'] || [],
    attachments: data['attachments'] || [],
  };
};

/**
 * Check if error is a permission denied error
 */
export const isPermissionDeniedError = (error: any): boolean =>
  error.code === 'permission-denied' || error.message?.includes('permissions');

/**
 * Check if error is a missing index error
 */
export const isMissingIndexError = (error: any): boolean =>
  error.code === 'failed-precondition' && error.message?.includes('index');

/**
 * Log missing index error with instructions
 */
export const logMissingIndexError = (error: any): void => {
  console.error('❌ FIREBASE INDEX FEHLT!');
  console.error('📋 Bitte klicke auf diesen Link um den Index zu erstellen:');
  console.error(error.message);
  console.error('');
  console.error('ℹ️ Dies ist ein einmaliger Setup-Schritt (1 Klick).');
  console.error('   Nach der Index-Erstellung funktionieren Invitations automatisch.');
};
