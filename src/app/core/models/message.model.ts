/**
 * @fileoverview Message Model Definitions for DABubble
 * @description TypeScript interfaces for Message data structures
 * @module MessageModel
 */

export interface Message {
  id: string;
  content: string;
  authorId: string;
  channelId?: string;
  recipientId?: string;
  type: MessageType;
  attachments: MessageAttachment[];
  reactions: MessageReaction[];
  mentionedUserIds?: string[];
  threadCount?: number;
  lastThreadTimestamp?: Date;
  isEdited: boolean;
  editedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  SYSTEM = 'system',
}

export interface MessageAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  downloadURL: string;
  thumbnailURL?: string;
}

export interface MessageReaction {
  emoji: string;
  users: string[];
  count: number;
}

export interface CreateMessageRequest {
  content: string;
  channelId?: string;
  recipientId?: string;
  type: MessageType;
  attachments?: MessageAttachment[];
}

export interface UpdateMessageRequest {
  content: string;
}
