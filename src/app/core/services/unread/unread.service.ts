/**
 * @fileoverview Unread Messages Service
 * @description Coordinates tracking and marking of unread messages for channels and direct messages
 * @module UnreadService
 */

import { Injectable, inject } from '@angular/core';
import { UnreadListenerService } from './unread-listener.service';
import { UnreadMarkerService } from './unread-marker.service';
import { UnreadTrackerService } from './unread-tracker.service';

@Injectable({
  providedIn: 'root',
})
export class UnreadService {
  private listener = inject(UnreadListenerService);
  private tracker = inject(UnreadTrackerService);
  private marker = inject(UnreadMarkerService);

  constructor() {
    // Start the listener once at service bootstrap so unread checks are synchronous later.
    // Initialize real-time listener on service creation
    this.listener.initialize();
  }

  /**
   * Mark a channel or conversation as read
   * @description Facade that forwards to UnreadMarkerService; passing the DM flag ensures DM unread counters in conversation metadata are also reset.
   * @param conversationId Channel ID or Conversation ID
   * @param isDirectMessage Whether the conversation is a direct message
   */
  async markAsRead(conversationId: string, isDirectMessage: boolean = false): Promise<void> {
    await this.marker.markAsRead(conversationId, isDirectMessage);
  }

  /**
   * Check if conversation has unread messages
   * @description Facade exposing tracker state to components without coupling them to UnreadTrackerService internals.
   * @param conversationId Channel ID or Conversation ID
   * @param lastMessageAt Last message timestamp in conversation
   * @returns true if unread
   */
  hasUnread(conversationId: string, lastMessageAt?: Date): boolean {
    return this.tracker.hasUnread(conversationId, lastMessageAt);
  }

  /**
   * Check if a specific thread has unread messages
   * Uses per-thread tracking: conversationId_thread_messageId
   * @description Delegates thread-level unread state checks to the tracker so thread badges can be computed without duplicating tracking logic.
   * @param conversationId Channel ID or Conversation ID
   * @param messageId Parent message ID of the thread
   * @param lastThreadTimestamp Last thread activity timestamp
   * @returns true if this specific thread has unread messages
   */
  hasThreadUnread(conversationId: string, messageId: string, lastThreadTimestamp?: Date): boolean {
    return this.tracker.hasThreadUnread(conversationId, messageId, lastThreadTimestamp);
  }

  /**
   * Check whether conversation metadata suggests possible unread thread activity after a reload.
   * @description Conservative pre-check to decide whether to load thread messages on reload; avoids always-on per-thread listeners by using conversation-level metadata as a signal.
   * @param conversationId Channel ID or Conversation ID
   * @param lastMessageAt Latest conversation activity timestamp
   * @returns true if the conversation should be preloaded to verify thread unread state
   */
  hasPotentialThreadUnreadActivity(conversationId: string, lastMessageAt?: Date): boolean {
    return this.tracker.hasPotentialThreadUnreadActivity(conversationId, lastMessageAt);
  }

  /**
   * Mark a specific thread as read
   * @description Delegates to the marker service to persist the thread-level lastRead timestamp without touching the parent conversation’s read marker.
   * @param conversationId Channel ID or Conversation ID
   * @param messageId Parent message ID of the thread
   * @param isDirectMessage Whether the conversation is a direct message
   */
  async markThreadAsRead(
    conversationId: string,
    messageId: string,
    isDirectMessage: boolean = false,
  ): Promise<void> {
    await this.marker.markThreadAsRead(conversationId, messageId, isDirectMessage);
  }

  /**
   * Mark both thread and parent message/conversation as read
   * Convenience method to prevent own messages from showing as unread
   * @description Batches all three lastRead writes (thread, parent, conversation) in one call to prevent own sent/replied messages from showing as unread.
   * @param conversationId Channel ID or Conversation ID
   * @param parentMessageId Parent message ID of the thread
   * @param isDirectMessage Whether the conversation is a direct message
   */
  async markThreadAndParentAsRead(
    conversationId: string,
    parentMessageId: string,
    isDirectMessage: boolean = false,
  ): Promise<void> {
    await this.marker.markThreadAndParentAsRead(conversationId, parentMessageId, isDirectMessage);
  }
}
