/**
 * @fileoverview Central export point for NgRx SignalStores
 * Provides exports for all stores and their corresponding state types
 * to enable clean imports throughout the application.
 * @description This barrel file exports all store instances and state interfaces
 * for authentication, user management, channel management, and message handling.
 * @module StoreExports
 */

// Store exports
export { AuthStore } from './auth';
export { ChannelMemberStore, ChannelMessageStore, ChannelStore, MessageStore } from './channels';
export { DirectMessageStore } from './direct-messages';
export { MailboxStore } from './mailbox';
export { ThreadStore } from './threads';
export { UserPresenceStore, UserStore } from './users';

// Type exports (required by isolatedModules compiler option)
export type { AuthState } from './auth';
export type {
  ChannelMemberState,
  ChannelMessageState,
  ChannelState,
  CreateMessageRequest,
  MessageState,
} from './channels';
export type { DirectMessageState } from './direct-messages';
export type { UserPresenceState, UserState } from './users';

// Utility exports
export { useStores } from './core';
