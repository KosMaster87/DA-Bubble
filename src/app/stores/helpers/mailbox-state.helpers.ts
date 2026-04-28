/**
 * @fileoverview Mailbox State Helper Functions
 * @description State filtering and utility functions for mailbox
 * @module stores/helpers
 */

import { MailboxMessage, MailboxMessageType } from '../mailbox/mailbox.store';

/**
 * Filter messages by read status
 * @description Separates read and unread messages so the mailbox can show different lists without multiple store slices.
 */
export const filterByReadStatus = (messages: MailboxMessage[], isRead: boolean): MailboxMessage[] =>
  messages.filter((m) => m.isRead === isRead);

/**
 * Filter messages by type
 * @description Allows the UI to show type-specific tabs (mentions, replies) from a single shared message array.
 */
export const filterByType = (
  messages: MailboxMessage[],
  type: MailboxMessageType,
): MailboxMessage[] => messages.filter((m) => m.type === type);

/**
 * Count unread messages
 * @description Computed count drives the mailbox badge without the component needing to iterate the raw array.
 */
export const countUnreadMessages = (messages: MailboxMessage[]): number =>
  messages.filter((m) => !m.isRead).length;

/**
 * Find message by ID
 * @description Provides typed lookup so action handlers can retrieve a message by ID before applying mutations.
 */
export const findMessageById = (
  messages: MailboxMessage[],
  messageId: string,
): MailboxMessage | undefined => messages.find((m) => m.id === messageId);

/**
 * Get unread messages
 * @description Convenience alias for filterByReadStatus(false) used by notification count and unread-list components.
 */
export const getUnreadMessages = (messages: MailboxMessage[]): MailboxMessage[] =>
  filterByReadStatus(messages, false);

/**
 * Cleanup listener
 * @description Null-guards the unsubscribe function so every call site avoids a manual null check before tearing down a listener.
 */
export const cleanupListener = (unsubscribe: (() => void) | null): void => {
  if (unsubscribe) {
    unsubscribe();
  }
};
