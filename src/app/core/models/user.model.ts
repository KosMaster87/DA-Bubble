/**
 * @fileoverview User Model Definitions for DABubble
 * @description TypeScript interfaces for User data structures
 * @module UserModel
 */

/**
 * Scroll state for a conversation (channel, thread, DM)
 */
export interface ScrollState {
  /** Whether auto-scroll is enabled */
  autoScroll: boolean;
  /** ID of the last read message */
  lastRead: string | null;
  /** Timestamp when last read */
  lastReadAt: Date | null;
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  isOnline: boolean;
  lastSeen: Date;
  lastHeartbeat?: Date; // Timestamp of last heartbeat for offline detection
  channels: string[]; // Channel IDs where user is member
  directMessages: string[]; // User IDs for direct conversations
  createdAt: Date;
  updatedAt: Date;
  /** Scroll state per conversation for multi-device sync */
  scrollState?: Record<string, ScrollState>;
  /** Last read timestamp per channel/conversation (channelId or conversationId -> timestamp) */
  lastRead?: Record<string, Date>;
}

export interface CreateUserRequest {
  email: string;
  displayName: string;
  photoURL?: string;
}

export interface UpdateUserRequest {
  displayName?: string;
  photoURL?: string;
  isOnline?: boolean;
  channels?: string[];
  directMessages?: string[];
}

export interface UserPresence {
  uid: string;
  isOnline: boolean;
  lastSeen: Date;
}
