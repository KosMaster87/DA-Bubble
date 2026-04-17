/**
 * @fileoverview Direct Message Store Helper Functions
 * @module DirectMessageStoreHelpers
 */

import { Timestamp } from '@angular/fire/firestore';
import { DirectMessage, DirectMessageConversation } from '@core/models/direct-message.model';
import { MessageAttachment, MessageReaction } from '@core/models/message.model';

interface SnapshotLike {
  id: string;
  data: () => Record<string, unknown>;
}

interface FirestoreErrorLike {
  message?: string;
}

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const asTimestamp = (value: unknown): Timestamp | null =>
  value instanceof Timestamp ? value : null;

const asDate = (value: unknown): Date => toDate(asTimestamp(value));

const asBoolean = (value: unknown): boolean => value === true;

const asParticipants = (value: unknown): [string, string] => {
  if (!Array.isArray(value) || value.length < 2) {
    return ['', ''];
  }

  return [asString(value[0]), asString(value[1])];
};

const asUnreadCount = (value: unknown): { [uid: string]: number } => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const entries = Object.entries(value as Record<string, unknown>).map(([uid, count]) => [
    uid,
    typeof count === 'number' ? count : 0,
  ]);
  return Object.fromEntries(entries);
};

const asReactions = (value: unknown): MessageReaction[] => {
  return Array.isArray(value) ? (value as MessageReaction[]) : [];
};

const asAttachments = (value: unknown): MessageAttachment[] => {
  return Array.isArray(value) ? (value as MessageAttachment[]) : [];
};

const asOptionalDate = (value: unknown): Date | undefined => {
  return asTimestamp(value) ? asDate(value) : undefined;
};

const asNumber = (value: unknown, fallback = 0): number =>
  typeof value === 'number' ? value : fallback;

/**
 * Convert Firestore Timestamp to Date
 */
export const toDate = (ts: Timestamp | null): Date => (ts ? ts.toDate() : new Date());

/**
 * Map Firestore document to DirectMessageConversation
 */
export const mapConversation = (docSnap: SnapshotLike): DirectMessageConversation => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    participants: asParticipants(data['participants']),
    createdAt: asDate(data['createdAt']),
    lastMessageAt: asDate(data['lastMessageAt']),
    lastMessageContent: asString(data['lastMessageContent']),
    lastMessageBy: asString(data['lastMessageBy']),
    unreadCount: asUnreadCount(data['unreadCount']),
  };
};

/**
 * Map Firestore document to DirectMessage
 */
export const mapMessage = (docSnap: SnapshotLike): DirectMessage => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    authorId: asString(data['authorId']),
    content: asString(data['content']),
    createdAt: asDate(data['createdAt']),
    updatedAt: asDate(data['updatedAt']),
    isEdited: asBoolean(data['isEdited']),
    editedAt: asOptionalDate(data['editedAt']),
    reactions: asReactions(data['reactions']),
    attachments: asAttachments(data['attachments']),
    threadCount: asNumber(data['threadCount']),
    lastThreadTimestamp: asOptionalDate(data['lastThreadTimestamp']),
  };
};

/**
 * Check if error is a Firestore internal state error
 */
export const isFirestoreStateError = (error: unknown): boolean => {
  const msg = (error as FirestoreErrorLike).message || '';
  return (
    msg.includes('INTERNAL ASSERTION FAILED') ||
    msg.includes('ID: ca9') ||
    msg.includes('ID: b815') ||
    msg.includes('BloomFilter')
  );
};
