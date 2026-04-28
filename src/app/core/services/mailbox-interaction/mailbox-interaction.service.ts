/**
 * @fileoverview Mailbox Interaction Service
 * @description Encapsulates mailbox message actions so read, bulk-read, and delete flows share one interaction boundary.
 * @module core/services/mailbox-interaction
 */

import { Injectable, inject } from '@angular/core';
import { MailboxStore } from '@stores/mailbox/mailbox.store';

/**
 * Service for mailbox message interactions
 */
@Injectable({
  providedIn: 'root',
})
export class MailboxInteractionService {
  private mailboxStore = inject(MailboxStore);

  /**
   * Handle message click and mark as read
   * @description Marks the message as read in the store when clicked; the TODO note tracks the pending navigation to the originating chat.
   * @param messageId Message ID to mark as read
   */
  handleMessageClick = async (messageId: string): Promise<void> => {
    await this.mailboxStore.markAsRead(messageId);
    console.log('Message clicked:', messageId);
    // TODO: Open chat window with this message
  };

  /**
   * Mark all messages as read
   * @description Bulk-clears all unread mailbox messages so the badge count resets to zero without opening each message individually.
   */
  markAllAsRead = async (): Promise<void> => {
    await this.mailboxStore.markAllAsRead();
  };

  /**
   * Delete a message
   * @description Removes the mailbox message from the store and Firestore; does not affect the original channel message.
   * @param messageId Message ID to delete
   */
  deleteMessage = async (messageId: string): Promise<void> => {
    await this.mailboxStore.deleteMessage(messageId);
  };
}
