/**
 * @fileoverview Message Interaction Service
 * @description Centralizes all message interaction operations including sending,
 * editing, deleting, and reactions. Works for both channel messages and DM messages.
 * @module core/services/message-interaction
 */

import { inject, Injectable } from '@angular/core';
import { ConversationLoaderService } from '@core/services/conversation-loader/conversation-loader.service';
import { AuthStore } from '@stores/auth';
import { ChannelMessageStore } from '@stores/channels/channel-message.store';
import { DirectMessageStore } from '@stores/direct-messages/direct-message.store';
import { ThreadStore } from '@stores/threads/thread.store';

@Injectable({
  providedIn: 'root',
})
export class MessageInteractionService {
  private channelMessageStore = inject(ChannelMessageStore);
  private directMessageStore = inject(DirectMessageStore);
  private threadStore = inject(ThreadStore);
  private authStore = inject(AuthStore);
  private conversationLoader = inject(ConversationLoaderService);

  // ========================================
  // CHANNEL MESSAGES
  // ========================================

  /**
   * Send message to channel
   * @description Validates authentication, trims content, delegates to the channel message store, then immediately marks the channel as read so the sender’s own message isn’t counted as unread.
   * @param {string} channelId - Channel ID
   * @param {string} content - Message content
   * @returns {Promise<void>} Promise that resolves when message is sent
   */
  async sendChannelMessage(channelId: string, content: string): Promise<void> {
    const currentUser = this.authStore.user();
    if (!currentUser) {
      throw new Error('No authenticated user');
    }

    await this.channelMessageStore.sendMessage(channelId, content.trim(), currentUser.uid);
    this.conversationLoader.markAsReadImmediate(channelId);
  }

  /**
   * Edit channel message
   * @description Delegates content update to the channel message store; the Firestore listener propagates the change to all open views.
   * @param {string} channelId - Channel ID
   * @param {string} messageId - Message ID
   * @param {string} newContent - New message content
   * @returns {Promise<void>} Promise that resolves when message is edited
   */
  async editChannelMessage(
    channelId: string,
    messageId: string,
    newContent: string,
  ): Promise<void> {
    await this.channelMessageStore.updateMessage(channelId, messageId, newContent);
  }

  /**
   * Delete channel message
   * @description Delegates to the channel message store; the deletion also cascades to thread messages inside the store.
   * @param {string} channelId - Channel ID
   * @param {string} messageId - Message ID
   * @returns {Promise<void>} Promise that resolves when message is deleted
   */
  async deleteChannelMessage(channelId: string, messageId: string): Promise<void> {
    await this.channelMessageStore.deleteMessage(channelId, messageId);
  }

  /**
   * Toggle reaction on channel message
   * @description Requires authentication and delegates the reaction toggle to the channel message store, which handles add/remove logic atomically.
   * @param {string} channelId - Channel ID
   * @param {string} messageId - Message ID
   * @param {string} emojiId - Emoji ID
   * @returns {Promise<void>} Promise that resolves when reaction is toggled
   */
  async toggleChannelMessageReaction(
    channelId: string,
    messageId: string,
    emojiId: string,
  ): Promise<void> {
    const currentUser = this.authStore.user();
    if (!currentUser) {
      throw new Error('No authenticated user');
    }

    await this.channelMessageStore.toggleReaction(channelId, messageId, emojiId, currentUser.uid);
  }

  // ========================================
  // DIRECT MESSAGES
  // ========================================

  /**
   * Send direct message
   * @description Validates authentication, trims content, delegates to the DM store, then marks the conversation as read so sent messages aren’t counted as unread.
   * @param {string} conversationId - Conversation ID
   * @param {string} content - Message content
   * @returns {Promise<void>} Promise that resolves when message is sent
   */
  async sendDirectMessage(conversationId: string, content: string): Promise<void> {
    const currentUser = this.authStore.user();
    if (!currentUser) {
      throw new Error('No authenticated user');
    }

    await this.directMessageStore.sendMessage(conversationId, content.trim(), currentUser.uid);
    this.conversationLoader.markAsReadImmediate(conversationId, true);
  }

  /**
   * Edit direct message
   * @description Delegates content update to the DM store; the realtime listener propagates the change to all participants.
   * @param {string} conversationId - Conversation ID
   * @param {string} messageId - Message ID
   * @param {string} newContent - New message content
   * @returns {Promise<void>} Promise that resolves when message is edited
   */
  async editDirectMessage(
    conversationId: string,
    messageId: string,
    newContent: string,
  ): Promise<void> {
    await this.directMessageStore.updateMessage(conversationId, messageId, newContent);
  }

  /**
   * Delete direct message
   * @description Delegates to the DM store for deletion; does not affect thread messages.
   * @param {string} conversationId - Conversation ID
   * @param {string} messageId - Message ID
   * @returns {Promise<void>} Promise that resolves when message is deleted
   */
  async deleteDirectMessage(conversationId: string, messageId: string): Promise<void> {
    await this.directMessageStore.deleteMessage(conversationId, messageId);
  }

  /**
   * Toggle reaction on direct message
   * @description Requires authentication and delegates the toggle to the DM store, which handles add/remove logic atomically in Firestore.
   * @param {string} conversationId - Conversation ID
   * @param {string} messageId - Message ID
   * @param {string} emojiId - Emoji ID
   * @returns {Promise<void>} Promise that resolves when reaction is toggled
   */
  async toggleDirectMessageReaction(
    conversationId: string,
    messageId: string,
    emojiId: string,
  ): Promise<void> {
    const currentUser = this.authStore.user();
    if (!currentUser) {
      throw new Error('No authenticated user');
    }

    await this.directMessageStore.toggleReaction(
      conversationId,
      messageId,
      emojiId,
      currentUser.uid,
    );
  }

  // ========================================
  // THREAD MESSAGES
  // ========================================

  /**
   * Send thread reply
   * @description Validates authentication, trims content, writes the reply to the thread store, then marks the thread as read so the sender’s own reply isn’t counted as unread.
   * @param {string} channelId - Channel or DM ID
   * @param {string} messageId - Parent message ID
   * @param {string} content - Reply content
   * @param {boolean} [isDirectMessage] - Whether this is a DM thread
   * @returns {Promise<void>} Promise that resolves when reply is sent
   */
  async sendThreadReply(
    channelId: string,
    messageId: string,
    content: string,
    isDirectMessage?: boolean,
  ): Promise<void> {
    const currentUser = this.authStore.user();
    if (!currentUser) {
      throw new Error('No authenticated user');
    }

    await this.threadStore.addThreadReply(
      channelId,
      messageId,
      content.trim(),
      currentUser.uid,
      isDirectMessage,
    );
    this.conversationLoader.markAsReadImmediate(messageId);
  }

  /**
   * Edit thread reply
   * @description Delegates the thread reply update to the thread store with the DM flag so the correct Firestore path is used.
   * @param {string} channelId - Channel or DM ID
   * @param {string} messageId - Parent message ID
   * @param {string} threadId - Thread message ID
   * @param {string} newContent - New content
   * @param {boolean} [isDirectMessage] - Whether this is a DM thread
   * @returns {Promise<void>} Promise that resolves when reply is edited
   */
  async editThreadReply(
    channelId: string,
    messageId: string,
    threadId: string,
    newContent: string,
    isDirectMessage?: boolean,
  ): Promise<void> {
    await this.threadStore.updateThread(
      channelId,
      messageId,
      threadId,
      { content: newContent },
      isDirectMessage,
    );
  }

  /**
   * Delete thread reply
   * @description Delegates thread reply deletion to the thread store; the parent message’s reply count is updated atomically in the store.
   * @param {string} channelId - Channel or DM ID
   * @param {string} messageId - Parent message ID
   * @param {string} threadId - Thread message ID
   * @param {boolean} [isDirectMessage] - Whether this is a DM thread
   * @returns {Promise<void>} Promise that resolves when reply is deleted
   */
  async deleteThreadReply(
    channelId: string,
    messageId: string,
    threadId: string,
    isDirectMessage?: boolean,
  ): Promise<void> {
    await this.threadStore.deleteThread(channelId, messageId, threadId, isDirectMessage);
  }

  /**
   * Toggle reaction on thread reply
   * @description Requires authentication and delegates the toggle to the thread store, which resolves the correct Firestore path based on the DM flag.
   * @param {string} channelId - Channel or DM ID
   * @param {string} messageId - Parent message ID
   * @param {string} threadId - Thread message ID
   * @param {string} emojiId - Emoji ID
   * @param {boolean} [isDirectMessage] - Whether this is a DM thread
   * @returns {Promise<void>} Promise that resolves when reaction is toggled
   */
  async toggleThreadReaction(
    channelId: string,
    messageId: string,
    threadId: string,
    emojiId: string,
    isDirectMessage?: boolean,
  ): Promise<void> {
    const currentUser = this.authStore.user();
    if (!currentUser) {
      throw new Error('No authenticated user');
    }

    await this.threadStore.toggleReaction(
      channelId,
      messageId,
      threadId,
      emojiId,
      currentUser.uid,
      isDirectMessage,
    );
  }
}
