/**
 * @fileoverview Channel State Service
 * @description Manages channel message loading and read state effects
 * @module core/services/channel-state
 */

import { Injectable, inject, effect, untracked, Signal } from '@angular/core';
import { ChannelMessageStore } from '@stores/channel-message.store';
import { AuthStore } from '@stores/auth';
import { UnreadService } from '@core/services/unread/unread.service';

/**
 * Service for managing channel state and effects
 */
@Injectable({
  providedIn: 'root',
})
export class ChannelStateService {
  private channelMessageStore = inject(ChannelMessageStore);
  private authStore = inject(AuthStore);
  private unreadService = inject(UnreadService);

  /**
   * Setup message loading effect for channel
   * @param channelIdSignal Signal containing current channel ID
   */
  setupLoadMessagesEffect = (channelIdSignal: Signal<string>): void => {
    effect(() => {
      const channelId = channelIdSignal();
      if (channelId) {
        this.loadMessagesForChannel(channelId);
      }
    });
  };

  /**
   * Load messages and mark channel as read
   * @param channelId Channel ID to load
   */
  private loadMessagesForChannel = (channelId: string): void => {
    this.channelMessageStore.loadChannelMessages(channelId);
    setTimeout(() => this.unreadService.markAsRead(channelId), 200);
  };

  /**
   * Setup auto-mark-as-read effect when new messages arrive
   * @param channelIdSignal Signal containing current channel ID
   */
  setupAutoMarkAsReadEffect = (channelIdSignal: Signal<string>): void => {
    let previousMessageCount = 0;
    effect(() => {
      const channelId = channelIdSignal();
      const currentUserId = untracked(() => this.authStore.user()?.uid);

      if (!channelId || !currentUserId) return;

      const currentCount = this.getMessageCount(channelId);

      if (this.shouldMarkAsRead(currentCount, previousMessageCount)) {
        this.markChannelAsRead(channelId);
      }
      previousMessageCount = currentCount;
    });
  };

  /**
   * Get message count for channel
   * @param channelId Channel ID
   * @returns Number of messages in channel
   */
  private getMessageCount = (channelId: string): number => {
    const messages = this.channelMessageStore.getMessagesByChannel()(channelId);
    return messages.length;
  };

  /**
   * Check if channel should be marked as read
   * @param currentCount Current message count
   * @param previousCount Previous message count
   * @returns True if should mark as read
   */
  private shouldMarkAsRead = (currentCount: number, previousCount: number): boolean => {
    return currentCount > previousCount && currentCount > 0;
  };

  /**
   * Mark channel as read
   * @param channelId Channel ID to mark
   */
  private markChannelAsRead = (channelId: string): void => {
    untracked(() => this.unreadService.markAsRead(channelId));
  };
}
