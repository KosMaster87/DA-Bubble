/**
 * @fileoverview Unread Messages Service
 * @description Coordinates tracking and marking of unread messages for channels and direct messages
 * @module UnreadService
 */

import { Injectable, inject } from '@angular/core';
import { UnreadListenerService } from './unread-listener.service';
import { UnreadTrackerService } from './unread-tracker.service';
import { UnreadMarkerService } from './unread-marker.service';

@Injectable({
  providedIn: 'root',
})
export class UnreadService {
  private listener = inject(UnreadListenerService);
  private tracker = inject(UnreadTrackerService);
  private marker = inject(UnreadMarkerService);

  constructor() {
    // Initialize real-time listener on service creation
    this.listener.initialize();
  }

  /**
   * Mark a channel or conversation as read
   * @param conversationId Channel ID or Conversation ID
   */
  async markAsRead(conversationId: string): Promise<void> {
    await this.marker.markAsRead(conversationId);
  }

  /**
   * Check if conversation has unread messages
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
   * @param conversationId Channel ID or Conversation ID
   * @param messageId Parent message ID of the thread
   * @param lastThreadTimestamp Last thread activity timestamp
   * @returns true if this specific thread has unread messages
   */
  hasThreadUnread(conversationId: string, messageId: string, lastThreadTimestamp?: Date): boolean {
    return this.tracker.hasThreadUnread(conversationId, messageId, lastThreadTimestamp);
  }

  /**
   * Mark a specific thread as read
   * @param conversationId Channel ID or Conversation ID
   * @param messageId Parent message ID of the thread
   */
  async markThreadAsRead(conversationId: string, messageId: string): Promise<void> {
    await this.marker.markThreadAsRead(conversationId, messageId);
  }

  /**
   * Mark both thread and parent message/conversation as read
   * Convenience method to prevent own messages from showing as unread
   * @param conversationId Channel ID or Conversation ID
   * @param parentMessageId Parent message ID of the thread
   */
  async markThreadAndParentAsRead(conversationId: string, parentMessageId: string): Promise<void> {
    await this.marker.markThreadAndParentAsRead(conversationId, parentMessageId);
  }
}
