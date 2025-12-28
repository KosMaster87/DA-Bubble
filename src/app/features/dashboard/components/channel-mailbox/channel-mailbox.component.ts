/**
 * @fileoverview Channel Mailbox Component
 * @description Mailbox for receiving messages from contacts, admins, system notifications
 * @module features/dashboard/components/channel-mailbox
 */

import { Component, signal, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { DummyChannelsService } from '../../services/dummy-channels.service';
import { DummyMailboxService } from '../../services/dummy-mailbox.service';

@Component({
  selector: 'app-channel-mailbox',
  imports: [DatePipe],
  templateUrl: './channel-mailbox.component.html',
  styleUrl: './channel-mailbox.component.scss',
})
export class ChannalMailboxComponent {
  protected channelsService = inject(DummyChannelsService);
  protected mailboxService = inject(DummyMailboxService);

  /**
   * Mailbox title from service
   */
  protected mailboxTitle = computed(() => {
    const channel = this.channelsService.getChannelById('mailbox');
    return channel?.name || 'Mailbox';
  });

  /**
   * Mailbox description from service
   */
  protected mailboxDescription = computed(() => {
    const channel = this.channelsService.getChannelById('mailbox');
    return channel?.description || 'Messages from contacts, admins, and system notifications';
  });

  /**
   * Messages from mailbox service
   */
  protected messages = computed(() => this.mailboxService.messages());

  /**
   * Handle message click
   */
  onMessageClick(messageId: string): void {
    this.mailboxService.markAsRead(messageId);
    console.log('Message clicked:', messageId);
    // TODO: Open chat window with this message
  }
}
