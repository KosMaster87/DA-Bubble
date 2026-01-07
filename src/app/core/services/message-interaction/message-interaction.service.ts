/**
 * @fileoverview Message Interaction Service
 * @description Centralizes all message interaction operations including sending,
 * editing, deleting, and reactions. Works for both channel messages and DM messages.
 * @module core/services/message-interaction
 */

import { inject, Injectable } from '@angular/core';
import { ChannelMessageStore } from '@stores/channel-message.store';
import { DirectMessageStore } from '@stores/direct-message.store';
import { ThreadStore } from '@stores/thread.store';
import { AuthStore } from '@stores/auth';
import { ConversationLoaderService } from '@core/services/conversation-loader/conversation-loader.service';

/**
 * Service for managing message interactions
 */
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
   * @param channelId - Channel ID
   * @param content - Message content
   * @returns Promise that resolves when message is sent
   */
  async sendChannelMessage(channelId: string, content: string): Promise<void> {
    const currentUser = this.authStore.user();
    if (!currentUser) {
      throw new Error('No authenticated user');
    }

    await this.channelMessageStore.sendMessage(channelId, content.trim(), currentUser.uid);

    // Mark as read immediately after sending
    this.conversationLoader.markAsReadImmediate(channelId);
  }

  /**
   * Edit channel message
   * @param channelId - Channel ID
   * @param messageId - Message ID
   * @param newContent - New message content
   */
  async editChannelMessage(
    channelId: string,
    messageId: string,
    newContent: string
  ): Promise<void> {
    await this.channelMessageStore.updateMessage(channelId, messageId, newContent);
  }

  /**
   * Delete channel message
   * @param channelId - Channel ID
   * @param messageId - Message ID
   */
  async deleteChannelMessage(channelId: string, messageId: string): Promise<void> {
    await this.channelMessageStore.deleteMessage(channelId, messageId);
  }

  /**
   * Toggle reaction on channel message
   * @param channelId - Channel ID
   * @param messageId - Message ID
   * @param emojiId - Emoji ID
   */
  async toggleChannelMessageReaction(
    channelId: string,
    messageId: string,
    emojiId: string
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
   * @param conversationId - Conversation ID
   * @param content - Message content
   * @returns Promise that resolves when message is sent
   */
  async sendDirectMessage(conversationId: string, content: string): Promise<void> {
    const currentUser = this.authStore.user();
    if (!currentUser) {
      throw new Error('No authenticated user');
    }

    await this.directMessageStore.sendMessage(conversationId, content.trim(), currentUser.uid);

    // Mark as read immediately after sending
    this.conversationLoader.markAsReadImmediate(conversationId);
  }

  /**
   * Edit direct message
   * @param conversationId - Conversation ID
   * @param messageId - Message ID
   * @param newContent - New message content
   */
  async editDirectMessage(
    conversationId: string,
    messageId: string,
    newContent: string
  ): Promise<void> {
    await this.directMessageStore.updateMessage(conversationId, messageId, newContent);
  }

  /**
   * Delete direct message
   * @param conversationId - Conversation ID
   * @param messageId - Message ID
   */
  async deleteDirectMessage(conversationId: string, messageId: string): Promise<void> {
    await this.directMessageStore.deleteMessage(conversationId, messageId);
  }

  /**
   * Toggle reaction on direct message
   * @param conversationId - Conversation ID
   * @param messageId - Message ID
   * @param emojiId - Emoji ID
   */
  async toggleDirectMessageReaction(
    conversationId: string,
    messageId: string,
    emojiId: string
  ): Promise<void> {
    const currentUser = this.authStore.user();
    if (!currentUser) {
      throw new Error('No authenticated user');
    }

    await this.directMessageStore.toggleReaction(
      conversationId,
      messageId,
      emojiId,
      currentUser.uid
    );
  }

  // ========================================
  // THREAD MESSAGES
  // ========================================

  /**
   * Send thread reply
   * @param channelId - Channel or DM ID
   * @param messageId - Parent message ID
   * @param content - Reply content
   * @param isDirectMessage - Whether this is a DM thread
   */
  async sendThreadReply(
    channelId: string,
    messageId: string,
    content: string,
    isDirectMessage?: boolean
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
      isDirectMessage
    );

    // Mark thread as read immediately after sending
    this.conversationLoader.markAsReadImmediate(messageId);
  }

  /**
   * Edit thread reply
   * @param channelId - Channel or DM ID
   * @param messageId - Parent message ID
   * @param threadId - Thread message ID
   * @param newContent - New content
   * @param isDirectMessage - Whether this is a DM thread
   */
  async editThreadReply(
    channelId: string,
    messageId: string,
    threadId: string,
    newContent: string,
    isDirectMessage?: boolean
  ): Promise<void> {
    await this.threadStore.updateThread(
      channelId,
      messageId,
      threadId,
      { content: newContent },
      isDirectMessage
    );
  }

  /**
   * Delete thread reply
   * @param channelId - Channel or DM ID
   * @param messageId - Parent message ID
   * @param threadId - Thread message ID
   * @param isDirectMessage - Whether this is a DM thread
   */
  async deleteThreadReply(
    channelId: string,
    messageId: string,
    threadId: string,
    isDirectMessage?: boolean
  ): Promise<void> {
    await this.threadStore.deleteThread(channelId, messageId, threadId, isDirectMessage);
  }

  /**
   * Toggle reaction on thread reply
   * @param channelId - Channel or DM ID
   * @param messageId - Parent message ID
   * @param threadId - Thread message ID
   * @param emojiId - Emoji ID
   * @param isDirectMessage - Whether this is a DM thread
   */
  async toggleThreadReaction(
    channelId: string,
    messageId: string,
    threadId: string,
    emojiId: string,
    isDirectMessage?: boolean
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
      isDirectMessage
    );
  }
}
