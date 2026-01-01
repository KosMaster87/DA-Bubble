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
export { UserStore } from './user.store';
export { UserPresenceStore } from './user-presence.store';
export { ChannelStore } from './channel.store';
export { ChannelMemberStore } from './channel-member.store';
export { MessageStore } from './message.store';
export { ChannelMessageStore } from './channel-message.store';
export { DirectMessageStore } from './direct-message.store';
export { ThreadStore } from './thread.store';
export { MailboxStore } from './mailbox.store';

// Type exports (required by isolatedModules compiler option)
export type { AuthState } from './auth';
export type { UserState } from './user.store';
export type { UserPresenceState } from './user-presence.store';
export type { ChannelState } from './channel.store';
export type { ChannelMemberState } from './channel-member.store';
export type { MessageState, CreateMessageRequest } from './message.store';
export type { ChannelMessageState } from './channel-message.store';
export type { DirectMessageState } from './direct-message.store';

// Utility exports
export { useStores } from './store.utils';
