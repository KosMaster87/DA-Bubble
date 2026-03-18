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
import { QuerySnapshot, DocumentData } from '@angular/fire/firestore';
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
  hasMoreMessages: { [channelId: string]: boolean };
  loadingOlderMessages: { [channelId: string]: boolean };
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
  hasMoreMessages: {},
  loadingOlderMessages: {},
};

/**
 * Store snapshots for pagination outside of reactive state
 */
const channelSnapshots = new Map<string, QuerySnapshot<DocumentData>>();

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
      /**
       * Load messages for channel with real-time listener
       * @param {string} channelId - Channel ID
       * @returns {void}
       */
      loadChannelMessages(channelId: string): void {
        patchState(store, { isLoading: true, error: null });
        listener.setupListener(channelId,
          (messages, snapshot) => this.handleMessagesLoaded(channelId, messages, snapshot),
          (error) => this.handleError(error, 'Failed to load channel messages'));
      },

      /**
       * Send message to channel
       * @async
       * @param {string} channelId - Channel ID
       * @param {string} content - Message content
       * @param {string} authorId - Author user ID
       * @returns {Promise<void>}
       */
      async sendMessage(channelId: string, content: string, authorId: string): Promise<void> {
        try {
          await operations.sendMessage(channelId, content, authorId);
        } catch (error) {
          this.handleError(error, 'Failed to send message');
          throw error;
        }
      },

      /**
       * Update message content
       * @async
       * @param {string} channelId - Channel ID
       * @param {string} messageId - Message ID
       * @param {string} content - New content
       * @returns {Promise<void>}
       */
      async updateMessage(channelId: string, messageId: string, content: string): Promise<void> {
        try {
          await operations.updateMessage(channelId, messageId, content);
        } catch (error) {
          this.handleError(error, 'Failed to update message');
          throw error;
        }
      },

      /**
       * Delete message from channel
       * @async
       * @param {string} channelId - Channel ID
       * @param {string} messageId - Message ID
       * @returns {Promise<void>}
       */
      async deleteMessage(channelId: string, messageId: string): Promise<void> {
        try {
          await operations.deleteMessage(channelId, messageId);
        } catch (error) {
          this.handleError(error, 'Failed to delete message');
          throw error;
        }
      },

      /** Set active channel @param {string | null} channelId @returns {void} */
      setActiveChannel: (channelId: string | null) => patchState(store, { activeChannelId: channelId }),

      /**
       * Add message to channel state
       * @param {string} channelId - Channel ID
       * @param {Message} message - Message to add
       * @returns {void}
       */
      addMessageToChannel(channelId: string, message: Message): void {
        const updated = ChannelMessageStateHelper.addMessageToChannel(store.channelMessages(), channelId, message);
        patchState(store, { channelMessages: updated, isLoading: false });
      },

      // === HELPER METHODS ===

      /**
       * Handle messages loaded from listener
       * @param channelId - Channel ID
       * @param messages - Loaded messages
       * @param snapshot - Firestore snapshot for pagination
       */
      handleMessagesLoaded(channelId: string, messages: Message[], snapshot: QuerySnapshot<DocumentData>): void {
        channelSnapshots.set(channelId, snapshot);
        const updated = ChannelMessageStateHelper.updateChannelMessages(
          store.channelMessages(),
          channelId,
          messages
        );
        patchState(store, {
          channelMessages: updated,
          isLoading: false,
          updateCounter: store.updateCounter() + 1,
          hasMoreMessages: { ...store.hasMoreMessages(), [channelId]: messages.length >= 100 },
        });
      },

      /**
       * Load older messages for pagination
       * @async
       * @param {string} channelId - Channel ID
       * @returns {Promise<void>}
       */
      async loadOlderMessages(channelId: string): Promise<void> {
        const snapshot = channelSnapshots.get(channelId);
        if (!snapshot || store.loadingOlderMessages()[channelId]) return;
        const firstDoc = snapshot.docs[0];
        if (!firstDoc) {
          patchState(store, { hasMoreMessages: { ...store.hasMoreMessages(), [channelId]: false } });
          return;
        }
        patchState(store, { loadingOlderMessages: { ...store.loadingOlderMessages(), [channelId]: true } });
        try {
          const olderMessages = await operations.loadOlderMessages(channelId, firstDoc);
          if (olderMessages.length === 0) {
            patchState(store, { hasMoreMessages: { ...store.hasMoreMessages(), [channelId]: false },
              loadingOlderMessages: { ...store.loadingOlderMessages(), [channelId]: false } });
            return;
          }
          const currentMessages = store.channelMessages()[channelId] || [];
          const updated = ChannelMessageStateHelper.updateChannelMessages(store.channelMessages(), channelId, [...olderMessages, ...currentMessages]);
          patchState(store, { channelMessages: updated, loadingOlderMessages: { ...store.loadingOlderMessages(), [channelId]: false },
            hasMoreMessages: { ...store.hasMoreMessages(), [channelId]: olderMessages.length >= 100 } });
        } catch (error) {
          this.handleError(error, 'Failed to load older messages');
          patchState(store, { loadingOlderMessages: { ...store.loadingOlderMessages(), [channelId]: false } });
        }
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
       * Cleanup all listeners and release pagination snapshots
       */
      destroy(): void {
        listener.clearAllListeners();
        channelSnapshots.clear();
        patchState(store, initialState);
      },
    };
  })
);
