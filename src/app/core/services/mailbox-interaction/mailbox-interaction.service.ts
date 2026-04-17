/**
 * @fileoverview Mailbox Interaction Service
 * @description Handles mailbox message interactions
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
   * @param messageId Message ID to mark as read
   */
  handleMessageClick = async (messageId: string): Promise<void> => {
    await this.mailboxStore.markAsRead(messageId);
    console.log('Message clicked:', messageId);
    // TODO: Open chat window with this message
  };

  /**
   * Mark all messages as read
   */
  markAllAsRead = async (): Promise<void> => {
    await this.mailboxStore.markAllAsRead();
  };

  /**
   * Delete a message
   * @param messageId Message ID to delete
   */
  deleteMessage = async (messageId: string): Promise<void> => {
    await this.mailboxStore.deleteMessage(messageId);
  };
}
