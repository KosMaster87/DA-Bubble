/**
 * @fileoverview Channel Message Interaction Service
 * @description Encapsulates channel message mutations so reaction, edit, and delete operations share consistent side-effect handling.
 * @module core/services/channel-message-interaction
 */

import { Injectable, inject } from '@angular/core';
import { ChannelMessageStore } from '@stores/channels/channel-message.store';

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
   * @description Delegates to the store and throws on failure so the UI layer can show an appropriate error toast.
   * @param channelId Channel ID
   * @param messageId Message ID
   * @param emoji Emoji to toggle
   * @param userId Current user ID
   */
  toggleReaction = async (
    channelId: string,
    messageId: string,
    emoji: string,
    userId: string,
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
   * @description Updates the message content in Firestore; the store snapshot listener propagates the change to all open views.
   * @param channelId Channel ID
   * @param messageId Message ID to edit
   * @param newContent New message content
   */
  editMessage = async (channelId: string, messageId: string, newContent: string): Promise<void> => {
    await this.channelMessageStore.updateMessage(channelId, messageId, newContent);
  };

  /**
   * Delete channel message
   * @description Deletes the message and its thread replies; throws on failure so the UI can surface an error state.
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
   * @description Guards against empty-content submissions before delegating to the store's send path.
   * @param channelId Channel ID
   * @param content Message content
   * @param userId Current user ID
   */
  sendMessage = async (channelId: string, content: string, userId: string): Promise<void> => {
    if (!content.trim()) return;
    await this.channelMessageStore.sendMessage(channelId, content.trim(), userId);
  };
}
