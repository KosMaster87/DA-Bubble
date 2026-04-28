/**
 * @fileoverview Channel State Service
 * @description Coordinates channel message hydration and auto-read side effects so channel views stay synchronized with unread state.
 * @module core/services/channel-state
 */

import { Injectable, Signal, effect, inject, untracked } from '@angular/core';
import { UnreadService } from '@core/services/unread/unread.service';
import { AuthStore } from '@stores/auth';
import { ChannelMessageStore } from '@stores/channels/channel-message.store';

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
   * @description Reacts to channel ID changes and triggers a fresh message load each time the user navigates to a different channel.
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
   * @description Loads channel messages and marks the channel as read after a short delay to allow the snapshot to settle.
   * @param channelId Channel ID to load
   */
  private loadMessagesForChannel = (channelId: string): void => {
    this.channelMessageStore.loadChannelMessages(channelId);
    setTimeout(() => this.unreadService.markAsRead(channelId), 200);
  };

  /**
   * Setup auto-mark-as-read effect when new messages arrive
   * @description Watches the message count and automatically marks the channel as read whenever new messages appear while the user is viewing it.
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
   * @description Reads the message count from the store for use in change-detection comparisons; does not trigger additional Firestore reads.
   * @param channelId Channel ID
   * @returns Number of messages in channel
   */
  private getMessageCount = (channelId: string): number => {
    const messages = this.channelMessageStore.getMessagesByChannel()(channelId);
    return messages.length;
  };

  /**
   * Check if channel should be marked as read
   * @description Returns true only when count has grown, so re-renders of an unchanged list don’t trigger redundant read-marks.
   * @param currentCount Current message count
   * @param previousCount Previous message count
   * @returns True if should mark as read
   */
  private shouldMarkAsRead = (currentCount: number, previousCount: number): boolean => {
    return currentCount > previousCount && currentCount > 0;
  };

  /**
   * Mark channel as read
   * @description Wraps the read-mark call in untracked() to prevent the effect from re-triggering itself when the unread state changes.
   * @param channelId Channel ID to mark
   */
  private markChannelAsRead = (channelId: string): void => {
    untracked(() => this.unreadService.markAsRead(channelId));
  };
}
