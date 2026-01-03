/**
 * @fileoverview Direct Message Model Definitions for DABubble
 * @description TypeScript interfaces for Direct Message and Conversation data structures
 * @module DirectMessageModel
 */

import { MessageAttachment, MessageReaction } from './message.model';

/**
 * Direct Message Conversation metadata
 * Stored in /direct-messages/{conversationId}
 */
export interface DirectMessageConversation {
  id: string; // Format: "uid1_uid2" (alphabetically sorted)
  participants: [string, string]; // [uid1, uid2]
  createdAt: Date;
  lastMessageAt: Date;
  lastMessageContent: string; // Preview of last message
  lastMessageBy: string; // UID of last message author
  unreadCount: { [uid: string]: number }; // Unread messages per participant
}

/**
 * Direct Message (stored in subcollection)
 * Path: /direct-messages/{conversationId}/messages/{messageId}
 */
export interface DirectMessage {
  id: string;
  authorId: string; // UID of message sender
  content: string;
  createdAt: Date;
  updatedAt: Date;
  isEdited: boolean;
  editedAt?: Date;
  reactions: MessageReaction[];
  attachments: MessageAttachment[];
  threadCount?: number; // Number of thread replies
  lastThreadTimestamp?: Date; // Timestamp of last thread reply
}

/**
 * Request to create a new direct message
 */
export interface CreateDirectMessageRequest {
  recipientId: string; // Other user's UID
  content: string;
  attachments?: MessageAttachment[];
}

/**
 * Request to update an existing direct message
 */
export interface UpdateDirectMessageRequest {
  content: string;
}

/**
 * Helper to generate conversation ID from two UIDs
 * @param uid1 First user ID
 * @param uid2 Second user ID
 * @returns Conversation ID (alphabetically sorted UIDs joined with underscore)
 */
export function getConversationId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('_');
}

/**
 * Helper to extract other participant UID from conversation
 * @param conversationId Conversation ID (format: "uid1_uid2")
 * @param currentUid Current user's UID
 * @returns Other participant's UID
 */
export function getOtherParticipant(conversationId: string, currentUid: string): string {
  const [uid1, uid2] = conversationId.split('_');
  return uid1 === currentUid ? uid2 : uid1;
}
