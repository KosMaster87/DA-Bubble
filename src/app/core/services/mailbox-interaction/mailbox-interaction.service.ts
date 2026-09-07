/**
 * @fileoverview Mailbox Interaction Service
 * @description Encapsulates mailbox message actions so read, bulk-read, and delete flows share one interaction boundary.
 * @module core/services/mailbox-interaction
 */

import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MailboxStore } from '@stores/mailbox/mailbox.store';

/**
 * Service for mailbox message interactions
 */
@Injectable({
  providedIn: 'root',
})
export class MailboxInteractionService {
  private mailboxStore = inject(MailboxStore);
  private router = inject(Router);

  /**
   * Handle message click and mark as read
   * @description Marks the message as read and navigates to the linked target if present.
   * @param messageId Message ID to handle
   */
  handleMessageClick = async (messageId: string): Promise<void> => {
    await this.mailboxStore.markAsRead(messageId);

    const message = this.mailboxStore.getMessageById(messageId);
    if (!message?.link) {
      return;
    }

    const { type, targetId, threadId } = message.link;

    switch (type) {
      case 'channel': {
        if (threadId) {
          await this.router.navigate(['/dashboard', 'channel', targetId, 'thread', threadId]);
        } else {
          await this.router.navigate(['/dashboard', 'channel', targetId]);
        }
        break;
      }
      case 'dm': {
        if (threadId) {
          await this.router.navigate(['/dashboard', 'dm', targetId, 'thread', threadId]);
        } else {
          await this.router.navigate(['/dashboard', 'dm', targetId]);
        }
        break;
      }
      case 'thread': {
        await this.router.navigate(['/dashboard', 'channel', targetId, 'thread', threadId]);
        break;
      }
      default:
        break;
    }
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
