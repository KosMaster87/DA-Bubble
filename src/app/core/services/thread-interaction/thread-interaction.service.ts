/**
 * @fileoverview Thread Interaction Service
 * @description Provides a unified mutation boundary for thread message reactions, edits, and deletions.
 * @module core/services/thread-interaction
 */

import { Injectable, inject } from '@angular/core';
import { ThreadStore } from '@stores/threads/thread.store';

/**
 * Service for managing thread message interactions
 */
@Injectable({
  providedIn: 'root',
})
export class ThreadInteractionService {
  private threadStore = inject(ThreadStore);

  /**
   * Toggle reaction on thread message
   * @description Delegates to the thread store with the DM flag so the correct Firestore path is used for channel vs. DM threads.
   * @param channelId Channel or conversation ID
   * @param parentMessageId Parent message ID
   * @param messageId Thread message ID
   * @param emoji Emoji to toggle
   * @param userId Current user ID
   * @param isDirectMessage Whether this is a DM thread
   */
  async toggleReaction(
    channelId: string,
    parentMessageId: string,
    messageId: string,
    emoji: string,
    userId: string,
    isDirectMessage: boolean,
  ): Promise<void> {
    try {
      await this.threadStore.toggleReaction(
        channelId,
        parentMessageId,
        messageId,
        emoji,
        userId,
        isDirectMessage,
      );
      console.log('✅ Thread Reaction toggled:', messageId, emoji);
    } catch (error) {
      console.error('❌ Failed to toggle reaction:', error);
      throw error;
    }
  }

  /**
   * Edit thread message
   * @description Updates the thread reply content in the store; the DM flag ensures the right Firestore collection path is targeted.
   * @param channelId Channel or conversation ID
   * @param parentMessageId Parent message ID
   * @param messageId Thread message ID to edit
   * @param newContent New message content
   * @param isDirectMessage Whether this is a DM thread
   */
  async editMessage(
    channelId: string,
    parentMessageId: string,
    messageId: string,
    newContent: string,
    isDirectMessage: boolean,
  ): Promise<void> {
    await this.threadStore.updateThread(
      channelId,
      parentMessageId,
      messageId,
      { content: newContent },
      isDirectMessage,
    );
  }

  /**
   * Delete thread message
   * @description Deletes the thread reply from the store and rethrows on failure so the UI can show an error state.
   * @param channelId Channel or conversation ID
   * @param parentMessageId Parent message ID
   * @param messageId Thread message ID to delete
   * @param isDirectMessage Whether this is a DM thread
   */
  async deleteMessage(
    channelId: string,
    parentMessageId: string,
    messageId: string,
    isDirectMessage: boolean,
  ): Promise<void> {
    try {
      await this.threadStore.deleteThread(channelId, parentMessageId, messageId, isDirectMessage);
      console.log('✅ Thread message deleted successfully');
    } catch (error) {
      console.error('❌ Failed to delete thread message:', error);
      throw error;
    }
  }
}
