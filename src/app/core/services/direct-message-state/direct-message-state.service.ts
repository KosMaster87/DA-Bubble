/**
 * @fileoverview Direct Message State Service
 * @description Coordinates DM conversation loading and read-state effects so message views remain synchronized with unread tracking.
 * @module core/services/direct-message-state
 */

import { Injectable, Signal, effect, inject, untracked } from '@angular/core';
import { UnreadService } from '@core/services/unread/unread.service';
import { AuthStore } from '@stores/auth';
import { DirectMessageStore } from '@stores/direct-messages/direct-message.store';

/**
 * Service for managing direct message conversation state
 */
@Injectable({
  providedIn: 'root',
})
export class DirectMessageStateService {
  private directMessageStore = inject(DirectMessageStore);
  private authStore = inject(AuthStore);
  private unreadService = inject(UnreadService);

  /**
   * Setup message loading effect for conversation
   * @description Reacts to conversation ID changes and triggers a fresh message load each time the user navigates to a different DM.
   * @param conversationIdSignal Signal containing current conversation ID
   */
  setupLoadMessagesEffect = (conversationIdSignal: Signal<string>): void => {
    effect(() => {
      const conversationId = conversationIdSignal();
      const currentUserId = untracked(() => this.authStore.user()?.uid);

      if (conversationId && currentUserId) {
        this.loadMessagesForConversation(conversationId);
      }
    });
  };

  /**
   * Load messages and mark conversation as read
   * @description Loads DM messages and marks the conversation as read after a short delay to allow the snapshot to settle.
   * @param conversationId Conversation ID to load
   */
  loadMessagesForConversation = (conversationId: string): void => {
    this.directMessageStore.loadMessages(conversationId);
    setTimeout(() => this.unreadService.markAsRead(conversationId, true), 200);
  };

  /**
   * Setup auto-mark-as-read effect when new messages arrive
   * @description Watches the message count and automatically marks the conversation as read whenever new messages appear while the user is viewing it.
   * @param conversationIdSignal Signal containing current conversation ID
   */
  setupAutoMarkAsReadEffect = (conversationIdSignal: Signal<string>): void => {
    let previousMessageCount = 0;
    effect(() => {
      const conversationId = conversationIdSignal();
      const currentCount = this.getMessageCount(conversationId);

      if (this.shouldMarkAsRead(conversationId, currentCount, previousMessageCount)) {
        this.markConversationAsRead(conversationId);
      }
      previousMessageCount = currentCount;
    });
  };

  /**
   * Get message count for conversation
   * @description Reads the message count from the store for change-detection comparisons; returns 0 if the conversation hasn’t loaded yet.
   * @param conversationId Conversation ID
   * @returns Number of messages in conversation
   */
  private getMessageCount = (conversationId: string): number => {
    const messages = this.directMessageStore.messages()[conversationId] || [];
    return messages.length;
  };

  /**
   * Check if conversation should be marked as read
   * @description Returns true only when the count has grown and the user is authenticated, preventing redundant read-marks.
   * @param conversationId Conversation ID
   * @param currentCount Current message count
   * @param previousCount Previous message count
   * @returns True if should mark as read
   */
  private shouldMarkAsRead = (
    conversationId: string,
    currentCount: number,
    previousCount: number,
  ): boolean => {
    const currentUserId = untracked(() => this.authStore.user()?.uid);
    return !!conversationId && !!currentUserId && currentCount > previousCount && currentCount > 0;
  };

  /**
   * Mark conversation as read
   * @description Wraps the read-mark in untracked() to prevent the effect from re-triggering itself when unread state changes.
   * @param conversationId Conversation ID to mark
   */
  private markConversationAsRead = (conversationId: string): void => {
    untracked(() => this.unreadService.markAsRead(conversationId, true));
  };

  /**
   * Get other participant ID from conversation
   * @description Extracts the partner’s UID from the composite conversation ID format “uid1_uid2” without a Firestore read.
   * @param conversationId Conversation ID in format "uid1_uid2"
   * @param currentUserId Current user's ID
   * @returns Other participant's ID or null
   */
  getOtherParticipantId = (conversationId: string, currentUserId: string): string | null => {
    if (!conversationId || !currentUserId) return null;
    const participants = conversationId.split('_');
    return participants.find((id) => id !== currentUserId) || null;
  };

  /**
   * Leave conversation with validation and error handling
   * @description Validates required IDs before delegating to the store; swallows errors and returns a boolean for UI feedback.
   * @param conversationId Conversation ID to leave
   * @param userId User ID leaving
   * @returns True if successful, false otherwise
   */
  leaveConversation = async (conversationId: string, userId: string): Promise<boolean> => {
    if (!this.validateLeaveConversation(conversationId, userId)) {
      return false;
    }

    try {
      await this.directMessageStore.leaveConversation(conversationId, userId);
      console.log('✅ Conversation left successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to leave conversation:', error);
      return false;
    }
  };

  /**
   * Validate leave conversation requirements
   * @description Guards against missing IDs before the async leave operation to avoid partial state updates.
   * @param conversationId Conversation ID
   * @param userId User ID
   * @returns True if valid, false otherwise
   */
  private validateLeaveConversation = (conversationId: string, userId: string): boolean => {
    if (conversationId && userId) return true;
    console.error('❌ Cannot leave conversation: Missing user ID or conversation ID');
    return false;
  };
}
