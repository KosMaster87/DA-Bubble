/**
 * @fileoverview Unread Tracker Service
 * @description Checks if conversations and threads have unread messages
 * @module core/services/unread
 */

import { Injectable, inject, computed } from '@angular/core';
import { UnreadListenerService } from './unread-listener.service';

/**
 * Service for tracking unread message status
 */
@Injectable({
  providedIn: 'root',
})
export class UnreadTrackerService {
  private listenerService = inject(UnreadListenerService);
  private lastReadCache = this.listenerService.getLastReadCache();

  /**
   * Check if conversation has unread messages
   * @param conversationId Channel ID or Conversation ID
   * @param lastMessageAt Last message timestamp in conversation
   * @returns true if unread
   */
  hasUnread(conversationId: string, lastMessageAt?: Date): boolean {
    if (!lastMessageAt) return false;

    const lastRead = this.lastReadCache()[conversationId];
    if (!lastRead) return true; // Never read

    return lastMessageAt > lastRead;
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
    if (!lastThreadTimestamp) return false;

    const threadKey = this.buildThreadKey(conversationId, messageId);
    const lastRead = this.lastReadCache()[threadKey];
    if (!lastRead) return true; // Never read

    return lastThreadTimestamp > lastRead;
  }

  /**
   * Build thread key for lastRead tracking
   * @param conversationId Channel ID or Conversation ID
   * @param messageId Parent message ID
   * @returns Thread key in format: conversationId_thread_messageId
   */
  private buildThreadKey(conversationId: string, messageId: string): string {
    return `${conversationId}_thread_${messageId}`;
  }
}
