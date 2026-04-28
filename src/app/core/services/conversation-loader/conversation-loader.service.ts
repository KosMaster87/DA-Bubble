/**
 * @fileoverview Conversation Loader Service
 * @description Centralizes conversation loading logic for channels, DMs, and threads.
 * Handles message loading, markAsRead debouncing, and subscription management.
 * @module core/services/conversation-loader
 */

import { inject, Injectable } from '@angular/core';
import { UnreadService } from '@core/services/unread/unread.service';
import { ChannelMessageStore } from '@stores/channels/channel-message.store';
import { DirectMessageStore } from '@stores/direct-messages/direct-message.store';
import { ThreadStore } from '@stores/threads/thread.store';

/**
 * Service for loading and managing conversations
 */
@Injectable({
  providedIn: 'root',
})
export class ConversationLoaderService {
  private channelMessageStore = inject(ChannelMessageStore);
  private directMessageStore = inject(DirectMessageStore);
  private threadStore = inject(ThreadStore);
  private unreadService = inject(UnreadService);

  private markAsReadTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly MARK_AS_READ_DEBOUNCE_MS = 500;

  /**
   * Load channel conversation and mark as read (with debounce)
   * @description Triggers the channel message load and schedules a debounced read-mark to avoid race conditions on rapid navigation.
   * @param channelId - Channel ID to load
   */
  loadChannelConversation(channelId: string): void {
    // Load messages
    this.channelMessageStore.loadChannelMessages(channelId);

    // Debounce markAsRead to prevent race conditions
    this.debouncedMarkAsRead(channelId);
  }

  /**
   * Load direct message conversation and mark as read (with debounce)
   * @description Triggers the DM message load and schedules a debounced read-mark so switching conversations quickly doesn’t prematurely mark unread messages.
   * @param conversationId - Conversation ID to load
   */
  loadDirectMessageConversation(conversationId: string): void {
    // Load messages
    this.directMessageStore.loadMessages(conversationId);

    // Debounce markAsRead to prevent race conditions
    this.debouncedMarkAsRead(conversationId, true);
  }

  /**
   * Load thread messages and mark as read
   * @description Loads thread replies and immediately marks the thread as read — no debounce needed since threads are only opened explicitly.
   * @param channelId - Channel or DM ID
   * @param messageId - Parent message ID
   * @param isDirectMessage - Whether this is a DM thread
   */
  loadThread(channelId: string, messageId: string, isDirectMessage?: boolean): void {
    // Load thread messages
    this.threadStore.loadThreads(channelId, messageId, isDirectMessage);

    // Mark thread as read immediately (no debounce needed for threads)
    this.unreadService.markAsRead(messageId);
  }

  /**
   * Mark conversation as read immediately (no debounce)
   * Use this when user actively sends a message
   * @description Bypasses the debounce and marks immediately — used after a user sends a message to ensure their own messages are never counted as unread.
   * @param conversationId - Channel or DM ID
   */
  markAsReadImmediate(conversationId: string, isDirectMessage: boolean = false): void {
    // Clear any pending debounced markAsRead
    this.clearMarkAsReadTimer(conversationId);

    // Mark as read immediately
    this.unreadService.markAsRead(conversationId, isDirectMessage);
  }

  /**
   * Mark thread as read immediately
   * @description Marks the thread as read without debouncing since thread-view is explicitly opened by the user.
   * @param channelId - Channel or DM ID
   * @param messageId - Parent message ID
   */
  markThreadAsReadImmediate(
    channelId: string,
    messageId: string,
    isDirectMessage: boolean = false,
  ): void {
    this.unreadService.markThreadAsRead(channelId, messageId, isDirectMessage);
  }

  /**
   * Debounced mark as read - prevents race conditions on rapid navigation
   * @description Clears any existing timer and sets a fresh one so only the final navigation in a burst triggers the actual read-mark.
   * @param conversationId - Conversation ID to mark as read
   */
  private debouncedMarkAsRead(conversationId: string, isDirectMessage: boolean = false): void {
    // Clear existing timer for this conversation
    this.clearMarkAsReadTimer(conversationId);

    // Set new debounced timer
    const timer = setTimeout(() => {
      this.unreadService.markAsRead(conversationId, isDirectMessage);
      this.markAsReadTimers.delete(conversationId);
    }, this.MARK_AS_READ_DEBOUNCE_MS);

    this.markAsReadTimers.set(conversationId, timer);
  }

  /**
   * Clear pending markAsRead timer for a conversation
   * @description Cancels the debounce timer when navigating away so a deferred read-mark for the previous conversation doesn’t fire unexpectedly.
   * @param conversationId - Conversation ID
   */
  private clearMarkAsReadTimer(conversationId: string): void {
    const existingTimer = this.markAsReadTimers.get(conversationId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.markAsReadTimers.delete(conversationId);
    }
  }

  /**
   * Clean up all timers (call on service destroy if needed)
   * @description Clears all pending read-mark timers to prevent memory leaks or stale callbacks after the service is destroyed.
   */
  cleanup(): void {
    this.markAsReadTimers.forEach((timer) => clearTimeout(timer));
    this.markAsReadTimers.clear();
  }
}
