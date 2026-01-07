/**
 * @fileoverview Direct Message Interaction Service
 * @description Handles direct message interactions (reactions, edit, delete)
 * @module core/services/direct-message-interaction
 */

import { Injectable, inject } from '@angular/core';
import { DirectMessageStore } from '@stores/direct-message.store';

/**
 * Service for managing direct message interactions
 */
@Injectable({
  providedIn: 'root',
})
export class DirectMessageInteractionService {
  private directMessageStore = inject(DirectMessageStore);

  /**
   * Toggle reaction on direct message
   * @param conversationId Conversation ID
   * @param messageId Message ID
   * @param emoji Emoji to toggle
   * @param userId Current user ID
   */
  async toggleReaction(
    conversationId: string,
    messageId: string,
    emoji: string,
    userId: string
  ): Promise<void> {
    try {
      await this.directMessageStore.toggleReaction(conversationId, messageId, emoji, userId);
      console.log('✅ DM Reaction toggled:', messageId, emoji);
    } catch (error) {
      console.error('❌ Failed to toggle DM reaction:', error);
      throw error;
    }
  }

  /**
   * Edit direct message
   * @param conversationId Conversation ID
   * @param messageId Message ID to edit
   * @param newContent New message content
   */
  async editMessage(conversationId: string, messageId: string, newContent: string): Promise<void> {
    await this.directMessageStore.updateMessage(conversationId, messageId, newContent);
  }

  /**
   * Delete direct message
   * @param conversationId Conversation ID
   * @param messageId Message ID to delete
   */
  async deleteMessage(conversationId: string, messageId: string): Promise<void> {
    try {
      await this.directMessageStore.deleteMessage(conversationId, messageId);
      console.log('✅ DM message deleted successfully');
    } catch (error) {
      console.error('❌ Failed to delete DM message:', error);
      throw error;
    }
  }
}
