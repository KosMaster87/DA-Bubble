/**
 * @fileoverview Shared Firestore Operation Helpers
 * @description Common Firestore patterns and timestamp utilities used across all stores
 * @module stores/helpers/shared
 */

import { Timestamp, serverTimestamp } from '@angular/fire/firestore';

/**
 * Convert Firestore Timestamp to JavaScript Date
 * @description Handles all possible timestamp shapes (Firestore Timestamp, Date, or null) that arrive from Firestore snapshots so callers don't need defensive checks.
 */
export const timestampToDate = (timestamp: any): Date => {
  if (!timestamp) return new Date();
  if (timestamp instanceof Timestamp) return timestamp.toDate();
  if (timestamp instanceof Date) return timestamp;
  return new Date();
};

/**
 * Get current server timestamp
 * @description Wraps serverTimestamp() behind a named export so the call site reads semantically and the wrapper can be swapped in tests.
 */
export const getServerTimestamp = () => serverTimestamp();

/**
 * Create timestamps for new document
 * @description Builds both createdAt and updatedAt in one call to ensure new documents are created with consistent timestamp fields.
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
 * @description Supplies only updatedAt to avoid accidentally overwriting createdAt when patching existing documents.
 */
export const createUpdateTimestamp = () => ({
  updatedAt: serverTimestamp(),
});

/**
 * Build base message data with timestamps
 * @description Defines the canonical shape for new messages so every creation path uses the same field set and no fields are accidentally omitted.
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
 * @description Constructs the minimal update payload for content edits, always setting isEdited and editedAt to maintain edit history.
 */
export const buildMessageUpdate = (content: string) => ({
  content,
  isEdited: true,
  editedAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});

/**
 * Build soft delete data
 * @description Soft-deletes a message by replacing content with a placeholder rather than removing the document, preserving thread counts.
 */
export const buildSoftDeleteData = () => ({
  content: '[Message deleted]',
  isEdited: true,
  updatedAt: serverTimestamp(),
});

/**
 * Build read status update
 * @description Isolates the read-status mutation to a dedicated builder so it is not accidentally mixed with content update builders.
 */
export const buildReadStatusUpdate = (isRead: boolean) => ({
  isRead,
  updatedAt: serverTimestamp(),
});
