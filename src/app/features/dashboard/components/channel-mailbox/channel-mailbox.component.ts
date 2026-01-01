/**
 * @fileoverview Channel Mailbox Component
 * @description Mailbox for receiving messages from contacts, admins, system notifications
 * @module features/dashboard/components/channel-mailbox
 */

import { Component, signal, computed, inject, effect } from '@angular/core';
import { ChannelStore, MailboxStore } from '@stores/index';
import { AuthStore } from '@stores/auth';

@Component({
  selector: 'app-channel-mailbox',
  imports: [],
  templateUrl: './channel-mailbox.component.html',
  styleUrl: './channel-mailbox.component.scss',
})
export class ChannalMailboxComponent {
  protected channelStore = inject(ChannelStore);
  protected mailboxStore = inject(MailboxStore);
  protected authStore = inject(AuthStore);

  constructor() {
    // Load mailbox messages when user changes
    effect(() => {
      const currentUser = this.authStore.user();
      if (currentUser?.uid) {
        this.mailboxStore.setCurrentUser(currentUser.uid);
      }
    });
  }

  /**
   * Mailbox title from ChannelStore
   */
  protected mailboxTitle = computed(() => {
    const channel = this.channelStore.getChannelById()('mailbox');
    return channel?.name || 'Mailbox';
  });

  /**
   * Mailbox description from ChannelStore
   */
  protected mailboxDescription = computed(() => {
    const channel = this.channelStore.getChannelById()('mailbox');
    return channel?.description || 'Messages from contacts, admins, and system notifications';
  });

  /**
   * Messages from mailbox store
   */
  protected messages = computed(() => this.mailboxStore.messages());

  /**
   * Unread message count
   */
  protected unreadCount = computed(() => this.mailboxStore.unreadCount());

  /**
   * Loading state
   */
  protected loading = computed(() => this.mailboxStore.loading());

  /**
   * Handle message click
   */
  async onMessageClick(messageId: string): Promise<void> {
    await this.mailboxStore.markAsRead(messageId);
    console.log('Message clicked:', messageId);
    // TODO: Open chat window with this message
  }

  /**
   * Mark all messages as read
   */
  async markAllAsRead(): Promise<void> {
    await this.mailboxStore.markAllAsRead();
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string): Promise<void> {
    await this.mailboxStore.deleteMessage(messageId);
  }
}
