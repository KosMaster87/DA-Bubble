/**
 * @fileoverview Conversation Loader Service
 * @description Centralizes conversation loading logic for channels, DMs, and threads.
 * Handles message loading, markAsRead debouncing, and subscription management.
 * @module core/services/conversation-loader
 */

import { inject, Injectable } from '@angular/core';
import { ChannelMessageStore } from '@stores/channels/channel-message.store';
import { DirectMessageStore } from '@stores/direct-messages/direct-message.store';
import { ThreadStore } from '@stores/threads/thread.store';
import { UnreadService } from '@core/services/unread/unread.service';

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
   * @param conversationId - Conversation ID to load
   */
  loadDirectMessageConversation(conversationId: string): void {
    // Load messages
    this.directMessageStore.loadMessages(conversationId);

    // Debounce markAsRead to prevent race conditions
    this.debouncedMarkAsRead(conversationId);
  }

  /**
   * Load thread messages and mark as read
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
   * @param conversationId - Channel or DM ID
   */
  markAsReadImmediate(conversationId: string): void {
    // Clear any pending debounced markAsRead
    this.clearMarkAsReadTimer(conversationId);

    // Mark as read immediately
    this.unreadService.markAsRead(conversationId);
  }

  /**
   * Mark thread as read immediately
   * @param channelId - Channel or DM ID
   * @param messageId - Parent message ID
   */
  markThreadAsReadImmediate(channelId: string, messageId: string): void {
    this.unreadService.markThreadAsRead(channelId, messageId);
  }

  /**
   * Debounced mark as read - prevents race conditions on rapid navigation
   * @param conversationId - Conversation ID to mark as read
   */
  private debouncedMarkAsRead(conversationId: string): void {
    // Clear existing timer for this conversation
    this.clearMarkAsReadTimer(conversationId);

    // Set new debounced timer
    const timer = setTimeout(() => {
      this.unreadService.markAsRead(conversationId);
      this.markAsReadTimers.delete(conversationId);
    }, this.MARK_AS_READ_DEBOUNCE_MS);

    this.markAsReadTimers.set(conversationId, timer);
  }

  /**
   * Clear pending markAsRead timer for a conversation
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
   */
  cleanup(): void {
    this.markAsReadTimers.forEach((timer) => clearTimeout(timer));
    this.markAsReadTimers.clear();
  }
}
