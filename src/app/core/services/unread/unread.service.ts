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
   * @param conversationId Channel ID or Conversation ID
   * @param isDirectMessage Whether the conversation is a direct message
   * @description
   * This facade forwards the DM flag explicitly so downstream persistence can keep
   * DM unread counters and lastRead markers in sync.
   */
  async markAsRead(conversationId: string, isDirectMessage: boolean = false): Promise<void> {
    await this.marker.markAsRead(conversationId, isDirectMessage);
  }

  /**
   * Check if conversation has unread messages
   * @param conversationId Channel ID or Conversation ID
   * @param lastMessageAt Last message timestamp in conversation
   * @returns true if unread
   * @description
   * Exposing this on the facade keeps components decoupled from tracker internals.
   */
  hasUnread(conversationId: string, lastMessageAt?: Date): boolean {
    return this.tracker.hasUnread(conversationId, lastMessageAt);
  }

  /**
   * Check if a specific thread has unread messages
   * Uses per-thread tracking: conversationId_thread_messageId
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
   * @param conversationId Channel ID or Conversation ID
   * @param lastMessageAt Latest conversation activity timestamp
   * @returns true if the conversation should be preloaded to verify thread unread state
   * @description
   * This method exists to preserve thread-only unread cases on reload without introducing
   * global always-on listeners.
   */
  hasPotentialThreadUnreadActivity(conversationId: string, lastMessageAt?: Date): boolean {
    return this.tracker.hasPotentialThreadUnreadActivity(conversationId, lastMessageAt);
  }

  /**
   * Mark a specific thread as read
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
