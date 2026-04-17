/**
 * @fileoverview Mailbox Store Helper Functions
 * @description Core mapping and utility functions for mailbox store
 * @module stores/helpers
 */

import { DocumentData, QueryDocumentSnapshot, Timestamp } from '@angular/fire/firestore';
import { MailboxMessage, MailboxMessageType } from '../mailbox/mailbox.store';
import { ErrorLike } from '../core/store.types';
import { isMissingIndexError, isPermissionError } from './shared-error.helpers';

export { isMissingIndexError, isPermissionError as isPermissionDeniedError };

/**
 * Convert Timestamp to Date
 */
export const toDate = (timestamp: Timestamp | Date | null | undefined): Date => {
  if (!timestamp) return new Date();
  return timestamp instanceof Timestamp ? timestamp.toDate() : new Date();
};

/**
 * Build base MailboxMessage fields from Firestore document data.
 */
const buildMailboxMessageBase = (id: string, data: DocumentData) => ({
  id,
  recipientId: data['recipientId'],
  authorId: data['authorId'],
  subject: data['subject'],
  content: data['content'],
  createdAt: toDate(data['createdAt']),
  updatedAt: toDate(data['updatedAt']),
});

/**
 * Convert Firestore document to MailboxMessage
 */
export const mapMailboxMessage = (doc: QueryDocumentSnapshot<DocumentData>): MailboxMessage => {
  const data = doc.data();
  return {
    ...buildMailboxMessageBase(doc.id, data),
    isRead: data['isRead'] || false,
    type: (data['type'] || 'user') as MailboxMessageType,
    reactions: data['reactions'] || [],
    attachments: data['attachments'] || [],
  };
};

/**
 * Log missing index error with instructions
 */
export const logMissingIndexError = (error: unknown): void => {
  const e = error as ErrorLike;
  console.error('❌ FIREBASE INDEX FEHLT!');
  console.error('📋 Bitte klicke auf diesen Link um den Index zu erstellen:');
  console.error(e.message);
  console.error('');
  console.error('ℹ️ Dies ist ein einmaliger Setup-Schritt (1 Klick).');
  console.error('   Nach der Index-Erstellung funktionieren Invitations automatisch.');
};
