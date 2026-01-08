/**
 * @fileoverview Direct Message Store Helper Functions
 * @module DirectMessageStoreHelpers
 */

import { Timestamp } from '@angular/fire/firestore';
import { DirectMessage, DirectMessageConversation } from '@core/models/direct-message.model';

/**
 * Convert Firestore Timestamp to Date
 */
export const toDate = (ts: Timestamp | null): Date => (ts ? ts.toDate() : new Date());

/**
 * Map Firestore document to DirectMessageConversation
 */
export const mapConversation = (docSnap: any): DirectMessageConversation => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    participants: data['participants'] as [string, string],
    createdAt: toDate(data['createdAt']),
    lastMessageAt: toDate(data['lastMessageAt']),
    lastMessageContent: data['lastMessageContent'],
    lastMessageBy: data['lastMessageBy'],
    unreadCount: data['unreadCount'] || {},
  };
};

/**
 * Map Firestore document to DirectMessage
 */
export const mapMessage = (docSnap: any): DirectMessage => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    authorId: data['authorId'],
    content: data['content'],
    createdAt: toDate(data['createdAt']),
    updatedAt: toDate(data['updatedAt']),
    isEdited: data['isEdited'] || false,
    editedAt: data['editedAt'] ? toDate(data['editedAt']) : undefined,
    reactions: data['reactions'] || [],
    attachments: data['attachments'] || [],
    threadCount: data['threadCount'] || 0,
    lastThreadTimestamp: data['lastThreadTimestamp'] ? toDate(data['lastThreadTimestamp']) : undefined,
  };
};

/**
 * Check if error is a Firestore internal state error
 */
export const isFirestoreStateError = (error: any): boolean => {
  const msg = error.message || '';
  return (
    msg.includes('INTERNAL ASSERTION FAILED') ||
    msg.includes('ID: ca9') ||
    msg.includes('ID: b815') ||
    msg.includes('BloomFilter')
  );
};
