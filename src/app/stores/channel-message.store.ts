/**
 * @fileoverview Channel message management store with NgRx SignalStore
 * Provides state management for channel-specific message operations,
 * including loading, updating, and managing messages within channels.
 * @description This store handles all channel message operations including
 * loading channel messages, real-time updates, and channel message state management.
 * @module ChannelMessageStore
 */

import { computed, inject } from '@angular/core';
import { signalStore, withState, withMethods, withComputed, patchState } from '@ngrx/signals';
import { Message } from '@core/models/message.model';
import { ReactionService } from '@core/services/reaction/reaction.service';
import { ChannelMessageOperationsService } from '@core/services/channel-message-operations/channel-message-operations.service';
import { ChannelMessageListenerService } from '@core/services/channel-message-listener/channel-message-listener.service';
import { ChannelMessageStateHelper } from './helpers/channel-message-state.helper';

/**
 * State interface for channel message management
 * @interface ChannelMessageState
 */
export interface ChannelMessageState {
  channelMessages: { [channelId: string]: Message[] };
  activeChannelId: string | null;
  isLoading: boolean;
  error: string | null;
  updateCounter: number;
}

/**
 * Initial channel message state
 * @constant {ChannelMessageState}
 */
const initialState: ChannelMessageState = {
  channelMessages: {},
  activeChannelId: null,
  isLoading: false,
  error: null,
  updateCounter: 0,
};

/**
 * Channel message management store with Firestore integration
 * Provides methods for channel message operations and state management
 * @constant {SignalStore}
 */
export const ChannelMessageStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    /**
     * Computed function to get messages by channel ID
     * @returns {Signal<Function>} Function that takes channelId and returns messages array
     */
    getMessagesByChannel: computed(
      () => (channelId: string) => store.channelMessages()[channelId] || []
    ),

    /**
     * Computed property for active channel messages
     * @returns {Signal<Message[]>} Messages for currently active channel
     */
    activeChannelMessages: computed(() => {
      const activeId = store.activeChannelId();
      return activeId ? store.channelMessages()[activeId] || [] : [];
    }),

    /**
     * Computed property for channel message count
     * @returns {Signal<number>} Total number of channel messages
     */
    channelMessageCount: computed(() => {
      return Object.values(store.channelMessages()).reduce(
        (total, messages) => total + messages.length,
        0
      );
    }),
  })),
  withMethods((store) => {
    const reactionService = inject(ReactionService);
    const operations = inject(ChannelMessageOperationsService);
    const listener = inject(ChannelMessageListenerService);

    return {
      // === ENTRY POINT METHODS ===

      /**
       * Entry point: Load messages for channel
       * @param channelId - Channel ID
       */
      loadChannelMessages(channelId: string): void {
        this.performLoadChannelMessages(channelId);
      },

      /**
       * Entry point: Send message to channel
       * @param channelId - Channel ID
       * @param content - Message content
       * @param authorId - Author user ID
       */
      async sendMessage(channelId: string, content: string, authorId: string): Promise<void> {
        await this.performSendMessage(channelId, content, authorId);
      },

      /**
       * Entry point: Update message content
       * @param channelId - Channel ID
       * @param messageId - Message ID
       * @param content - New content
       */
      async updateMessage(channelId: string, messageId: string, content: string): Promise<void> {
        await this.performUpdateMessage(channelId, messageId, content);
      },

      /**
       * Entry point: Delete message
       * @param channelId - Channel ID
       * @param messageId - Message ID
       */
      async deleteMessage(channelId: string, messageId: string): Promise<void> {
        await this.performDeleteMessage(channelId, messageId);
      },

      /**
       * Entry point: Set active channel
       * @param channelId - Channel ID or null
       */
      setActiveChannel(channelId: string | null): void {
        patchState(store, { activeChannelId: channelId });
      },

      /**
       * Entry point: Add message to channel
       * @param channelId - Channel ID
       * @param message - Message to add
       */
      addMessageToChannel(channelId: string, message: Message): void {
        this.performAddMessageToChannel(channelId, message);
      },

      // === IMPLEMENTATION METHODS ===

      /**
       * Implementation: Load channel messages
       * @param channelId - Channel ID
       */
      performLoadChannelMessages(channelId: string): void {
        patchState(store, { isLoading: true, error: null });
        listener.setupListener(
          channelId,
          (messages) => this.handleMessagesLoaded(channelId, messages),
          (error) => this.handleError(error, 'Failed to load channel messages')
        );
      },

      /**
       * Implementation: Send message
       * @param channelId - Channel ID
       * @param content - Message content
       * @param authorId - Author ID
       */
      async performSendMessage(channelId: string, content: string, authorId: string): Promise<void> {
        try {
          await operations.sendMessage(channelId, content, authorId);
        } catch (error) {
          this.handleError(error, 'Failed to send message');
          throw error;
        }
      },

      /**
       * Implementation: Update message
       * @param channelId - Channel ID
       * @param messageId - Message ID
       * @param content - New content
       */
      async performUpdateMessage(channelId: string, messageId: string, content: string): Promise<void> {
        try {
          await operations.updateMessage(channelId, messageId, content);
        } catch (error) {
          this.handleError(error, 'Failed to update message');
          throw error;
        }
      },

      /**
       * Implementation: Delete message
       * @param channelId - Channel ID
       * @param messageId - Message ID
       */
      async performDeleteMessage(channelId: string, messageId: string): Promise<void> {
        try {
          await operations.deleteMessage(channelId, messageId);
        } catch (error) {
          this.handleError(error, 'Failed to delete message');
          throw error;
        }
      },

      /**
       * Implementation: Add message to channel
       * @param channelId - Channel ID
       * @param message - Message to add
       */
      performAddMessageToChannel(channelId: string, message: Message): void {
        const updated = ChannelMessageStateHelper.addMessageToChannel(
          store.channelMessages(),
          channelId,
          message
        );
        patchState(store, { channelMessages: updated, isLoading: false });
      },

      // === HELPER METHODS ===

      /**
       * Handle messages loaded from listener
       * @param channelId - Channel ID
       * @param messages - Loaded messages
       */
      handleMessagesLoaded(channelId: string, messages: Message[]): void {
        const updated = ChannelMessageStateHelper.updateChannelMessages(
          store.channelMessages(),
          channelId,
          messages
        );
        patchState(store, {
          channelMessages: updated,
          isLoading: false,
          updateCounter: store.updateCounter() + 1,
        });
      },

      /**
       * Handle errors
       * @param error - Error object
       * @param defaultMessage - Default message
       */
      handleError(error: unknown, defaultMessage: string): void {
        const errorMessage = error instanceof Error ? error.message : defaultMessage;
        patchState(store, { error: errorMessage, isLoading: false });
      },

      /**
       * Toggle reaction on message
       * @param channelId - Channel ID
       * @param messageId - Message ID
       * @param emojiId - Emoji ID
       * @param userId - User ID
       */
      async toggleReaction(
        channelId: string,
        messageId: string,
        emojiId: string,
        userId: string
      ): Promise<void> {
        const messageRef = reactionService.getMessageRef(
          'channels',
          channelId,
          'messages',
          messageId
        );
        await reactionService.toggleReaction(messageRef, emojiId, userId);
      },

      /**
       * Cleanup all listeners
       */
      destroy(): void {
        listener.clearAllListeners();
      },
    };
  })
);
