/**
 * @fileoverview Unread Tracker Service
 * @description Checks if conversations and threads have unread messages
 * @module core/services/unread
 */

import { Injectable, inject } from '@angular/core';
import { UnreadListenerService } from './unread-listener.service';

/**
 * Service for tracking unread message status
 *
 * Why this split exists:
 * Tracker methods stay pure/read-only so UI and stores can evaluate unread state
 * frequently without causing Firestore writes.
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
   * @description
   * Missing lastRead is treated as unread on purpose so first-load users do not miss
   * existing activity before they open a conversation once.
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
   * @description
   * Thread-level keys intentionally do not reuse conversation-level keys because
   * thread unread and normal unread are separate UX signals.
   */
  hasThreadUnread(conversationId: string, messageId: string, lastThreadTimestamp?: Date): boolean {
    if (!lastThreadTimestamp) return false;

    const threadKey = this.buildThreadKey(conversationId, messageId);
    const lastRead = this.lastReadCache()[threadKey];
    if (!lastRead) return true; // Never read

    return lastThreadTimestamp > lastRead;
  }

  /**
   * Check whether a conversation should be reloaded to verify possible unread thread activity.
   * This is a conservative fallback for reload scenarios where only conversation metadata is loaded.
   * @param conversationId Channel ID or Conversation ID
   * @param lastMessageAt Latest conversation activity timestamp
   * @returns true if prior thread tracking exists and the conversation has newer activity
   */
  hasPotentialThreadUnreadActivity(conversationId: string, lastMessageAt?: Date): boolean {
    if (!lastMessageAt) return false;

    const cache = this.lastReadCache();
    const prefix = `${conversationId}_thread_`;

    return Object.entries(cache).some(([key, lastRead]) => {
      return key.startsWith(prefix) && lastMessageAt > lastRead;
    });
  }

  /**
   * Build thread key for lastRead tracking
   * @param conversationId Channel ID or Conversation ID
   * @param messageId Parent message ID
   * @returns Thread key in format: conversationId_thread_messageId
   * @description
   * Stable key format keeps old read markers compatible across releases.
   */
  private buildThreadKey(conversationId: string, messageId: string): string {
    return `${conversationId}_thread_${messageId}`;
  }
}
