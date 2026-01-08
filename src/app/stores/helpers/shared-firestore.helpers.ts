/**
 * @fileoverview Shared Firestore Operation Helpers
 * @description Common Firestore patterns and timestamp utilities used across all stores
 * @module stores/helpers/shared
 */

import { Timestamp, serverTimestamp } from '@angular/fire/firestore';

/**
 * Convert Firestore Timestamp to JavaScript Date
 */
export const timestampToDate = (timestamp: any): Date => {
  if (!timestamp) return new Date();
  if (timestamp instanceof Timestamp) return timestamp.toDate();
  if (timestamp instanceof Date) return timestamp;
  return new Date();
};

/**
 * Get current server timestamp
 */
export const getServerTimestamp = () => serverTimestamp();

/**
 * Create timestamps for new document
 */
export const createTimestamps = () => {
  const now = serverTimestamp();
  return {
    createdAt: now,
    updatedAt: now,
  };
};

/**
 * Create update timestamp
 */
export const createUpdateTimestamp = () => ({
  updatedAt: serverTimestamp(),
});

/**
 * Build base message data with timestamps
 */
export const buildBaseMessageData = (authorId: string, content: string) => ({
  authorId,
  content,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  isEdited: false,
  reactions: [],
  attachments: [],
});

/**
 * Build message update data
 */
export const buildMessageUpdate = (content: string) => ({
  content,
  isEdited: true,
  editedAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});

/**
 * Build soft delete data
 */
export const buildSoftDeleteData = () => ({
  content: '[Message deleted]',
  isEdited: true,
  updatedAt: serverTimestamp(),
});

/**
 * Build read status update
 */
export const buildReadStatusUpdate = (isRead: boolean) => ({
  isRead,
  updatedAt: serverTimestamp(),
});
