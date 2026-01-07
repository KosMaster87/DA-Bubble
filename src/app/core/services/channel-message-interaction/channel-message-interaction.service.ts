/**
 * @fileoverview Channel Message Interaction Service
 * @description Handles channel message interactions (reactions, edit, delete)
 * @module core/services/channel-message-interaction
 */

import { Injectable, inject } from '@angular/core';
import { ChannelMessageStore } from '@stores/channel-message.store';

/**
 * Service for managing channel message interactions
 */
@Injectable({
  providedIn: 'root',
})
export class ChannelMessageInteractionService {
  private channelMessageStore = inject(ChannelMessageStore);

  /**
   * Toggle reaction on channel message
   * @param channelId Channel ID
   * @param messageId Message ID
   * @param emoji Emoji to toggle
   * @param userId Current user ID
   */
  toggleReaction = async (
    channelId: string,
    messageId: string,
    emoji: string,
    userId: string
  ): Promise<void> => {
    try {
      await this.channelMessageStore.toggleReaction(channelId, messageId, emoji, userId);
      console.log('✅ Channel reaction toggled:', messageId, emoji);
    } catch (error) {
      console.error('❌ Failed to toggle channel reaction:', error);
      throw error;
    }
  };

  /**
   * Edit channel message
   * @param channelId Channel ID
   * @param messageId Message ID to edit
   * @param newContent New message content
   */
  editMessage = async (channelId: string, messageId: string, newContent: string): Promise<void> => {
    await this.channelMessageStore.updateMessage(channelId, messageId, newContent);
  };

  /**
   * Delete channel message
   * @param channelId Channel ID
   * @param messageId Message ID to delete
   */
  deleteMessage = async (channelId: string, messageId: string): Promise<void> => {
    try {
      await this.channelMessageStore.deleteMessage(channelId, messageId);
      console.log('✅ Channel message deleted successfully');
    } catch (error) {
      console.error('❌ Failed to delete channel message:', error);
      throw error;
    }
  };

  /**
   * Send message to channel
   * @param channelId Channel ID
   * @param content Message content
   * @param userId Current user ID
   */
  sendMessage = async (channelId: string, content: string, userId: string): Promise<void> => {
    if (!content.trim()) return;
    await this.channelMessageStore.sendMessage(channelId, content.trim(), userId);
  };
}
