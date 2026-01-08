/**
 * @fileoverview Mailbox State Helper Functions
 * @description State filtering and utility functions for mailbox
 * @module stores/helpers
 */

import { MailboxMessage, MailboxMessageType } from '../mailbox.store';

/**
 * Filter messages by read status
 */
export const filterByReadStatus = (messages: MailboxMessage[], isRead: boolean): MailboxMessage[] =>
  messages.filter((m) => m.isRead === isRead);

/**
 * Filter messages by type
 */
export const filterByType = (messages: MailboxMessage[], type: MailboxMessageType): MailboxMessage[] =>
  messages.filter((m) => m.type === type);

/**
 * Count unread messages
 */
export const countUnreadMessages = (messages: MailboxMessage[]): number =>
  messages.filter((m) => !m.isRead).length;

/**
 * Find message by ID
 */
export const findMessageById = (messages: MailboxMessage[], messageId: string): MailboxMessage | undefined =>
  messages.find((m) => m.id === messageId);

/**
 * Get unread messages
 */
export const getUnreadMessages = (messages: MailboxMessage[]): MailboxMessage[] =>
  filterByReadStatus(messages, false);

/**
 * Cleanup listener
 */
export const cleanupListener = (unsubscribe: (() => void) | null): void => {
  if (unsubscribe) {
    unsubscribe();
  }
};
