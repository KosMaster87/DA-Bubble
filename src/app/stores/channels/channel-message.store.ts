/**
 * @fileoverview Channel message management store with NgRx SignalStore
 * Provides state management for channel-specific message operations,
 * including loading, updating, and managing messages within channels.
 * @description This store handles all channel message operations including
 * loading channel messages, real-time updates, and channel message state management.
 * @module ChannelMessageStore
 */

import { computed, inject } from '@angular/core';
import { DocumentData, QuerySnapshot } from '@angular/fire/firestore';
import { Message } from '@core/models/message.model';
import { ChannelMessageListenerService } from '@core/services/channel-message-listener/channel-message-listener.service';
import { ChannelMessageOperationsService } from '@core/services/channel-message-operations/channel-message-operations.service';
import { ReactionService } from '@core/services/reaction/reaction.service';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { ThreadStore } from '@stores/threads/thread.store';
import { ChannelMessageStateHelper } from '../helpers/channel-message-state.helper';

/**
 * State interface for channel message management
 * @description Models paginated channel messages as a per-channel map so multiple
 * channels can have their message state loaded simultaneously without interference.
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
 * @description Provides the deterministic zero-state baseline shared by initialization
 * and cleanup so the store always starts from a known empty condition.
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
 * @description Kept outside NgRx signal state because snapshot objects are mutable
 * Firestore cursors — storing them in reactive state would cause spurious re-renders.
 */
const channelSnapshots = new Map<string, QuerySnapshot<DocumentData>>();

/**
 * Channel message management store with Firestore integration
 * Provides methods for channel message operations and state management
 * @description Owns channel-scoped message state and wires Firestore listeners to
 * reactive state, keeping messaging concerns separate from channel metadata.
 * @constant {SignalStore}
 */
export const ChannelMessageStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    /**
     * Computed function to get messages by channel ID
     * @description Returns a stable function reference so templates can look up
     * messages per channel without breaking signal dependency tracking.
     * @returns {Signal<Function>} Function that takes channelId and returns messages array
     */
    getMessagesByChannel: computed(
      () => (channelId: string) => store.channelMessages()[channelId] || [],
    ),

    /**
     * Computed property for active channel messages
     * @description Derives the visible message list from `activeChannelId` so the
     * component layer does not need to perform its own channel-id lookup.
     * @returns {Signal<Message[]>} Messages for currently active channel
     */
    activeChannelMessages: computed(() => {
      const activeId = store.activeChannelId();
      return activeId ? store.channelMessages()[activeId] || [] : [];
    }),

    /**
     * Computed property for channel message count
     * @description Aggregates message counts across all loaded channels for
     * diagnostic or badge purposes without exposing the internal channel map.
     * @returns {Signal<number>} Total number of channel messages
     */
    channelMessageCount: computed(() => {
      return Object.values(store.channelMessages()).reduce(
        (total, messages) => total + messages.length,
        0,
      );
    }),
  })),
  withMethods((store) => {
    const reactionService = inject(ReactionService);
    const operations = inject(ChannelMessageOperationsService);
    const listener = inject(ChannelMessageListenerService);
    const threadStore = inject(ThreadStore);

    /**
     * Trigger thread loading only for parent messages that can carry thread activity.
     * @description Restricts thread warmup fan-out to candidates with thread metadata so background reads stay bounded for large channels.
     *
     * Why this selective fan-out exists:
     * It keeps thread hydration aligned with unread/thread indicators without opening
     * listeners for messages that cannot produce thread badges.
     */
    const loadThreadsForMessages = (
      channelId: string,
      messages: Message[],
      options?: { once?: boolean },
    ): void => {
      const threadedMessages = messages.filter(
        (message) => !!message.lastThreadTimestamp || (message.threadCount ?? 0) > 0,
      );

      threadedMessages.forEach((message) => {
        threadStore.loadThreads(channelId, message.id, false, options?.once);
      });
    };

    const shouldSkipOlderMessagesLoad = (
      channelId: string,
      snapshot: QuerySnapshot<DocumentData> | undefined,
    ): boolean => {
      return !snapshot || store.loadingOlderMessages()[channelId];
    };

    const markNoMoreOlderMessages = (channelId: string): void => {
      patchState(
        store,
        ChannelMessageStateHelper.buildNoMoreMessagesState(store.hasMoreMessages(), channelId),
      );
    };

    const startOlderMessagesLoading = (channelId: string): void => {
      patchState(store, {
        loadingOlderMessages: ChannelMessageStateHelper.updateLoadingOlderMessages(
          store.loadingOlderMessages(),
          channelId,
          true,
        ),
      });
    };

    const finishOlderMessagesLoading = (channelId: string): void => {
      patchState(store, {
        loadingOlderMessages: ChannelMessageStateHelper.updateLoadingOlderMessages(
          store.loadingOlderMessages(),
          channelId,
          false,
        ),
      });
    };

    const applyEmptyOlderMessages = (channelId: string): void => {
      patchState(
        store,
        ChannelMessageStateHelper.buildEmptyOlderMessagesState(
          store.hasMoreMessages(),
          store.loadingOlderMessages(),
          channelId,
        ),
      );
    };

    const applyOlderMessagesSuccess = (channelId: string, olderMessages: Message[]): void => {
      patchState(
        store,
        ChannelMessageStateHelper.buildOlderMessagesSuccessState(
          store.channelMessages(),
          store.hasMoreMessages(),
          store.loadingOlderMessages(),
          channelId,
          olderMessages,
        ),
      );
    };

    return {
      /**
       * Load messages for channel with real-time listener
       * @param {string} channelId - Channel ID
       * @param options - Optional loading behavior
       * @returns {void}
       * @description
       * `once` mode is primarily used for dashboard warmup so the first snapshot can
       * restore unread state without retaining non-active channel listeners.
       */
      loadChannelMessages(channelId: string, options?: { once?: boolean }): void {
        patchState(store, { isLoading: true, error: null });
        listener.setupListener(
          channelId,
          (messages, snapshot) => this.handleMessagesLoaded(channelId, messages, snapshot, options),
          (error) => this.handleError(error, 'Failed to load channel messages'),
          options,
        );
      },

      /**
       * Send message to channel
       * @description Delegates to the operations service so the store method stays
       * within size limits while sharing the same error-handling wrapper.
       * @async
       * @param {string} channelId - Channel ID
       * @param {string} content - Message content
       * @param {string} authorId - Author user ID
       * @returns {Promise<void>}
       */
      async sendMessage(channelId: string, content: string, authorId: string): Promise<void> {
        await this.executeChannelMessageOperation(
          () => operations.sendMessage(channelId, content, authorId),
          'Failed to send message',
        );
      },

      /**
       * Update message content
       * @description Routes through `executeChannelMessageOperation` so update errors
       * are handled uniformly and the caller does not need try/catch boilerplate.
       * @async
       * @param {string} channelId - Channel ID
       * @param {string} messageId - Message ID
       * @param {string} content - New content
       * @returns {Promise<void>}
       */
      async updateMessage(channelId: string, messageId: string, content: string): Promise<void> {
        await this.executeChannelMessageOperation(
          () => operations.updateMessage(channelId, messageId, content),
          'Failed to update message',
        );
      },

      /**
       * Delete message from channel
       * @description Delegates to the operations service which performs a soft delete,
       * keeping the deletion strategy encapsulated away from the store.
       * @async
       * @param {string} channelId - Channel ID
       * @param {string} messageId - Message ID
       * @returns {Promise<void>}
       */
      async deleteMessage(channelId: string, messageId: string): Promise<void> {
        await this.executeChannelMessageOperation(
          () => operations.deleteMessage(channelId, messageId),
          'Failed to delete message',
        );
      },

      /** Set active channel @param {string | null} channelId @returns {void} */
      setActiveChannel: (channelId: string | null) =>
        patchState(store, { activeChannelId: channelId }),

      /**
       * Add message to channel state
       * @description Allows optimistic local insertion without waiting for a Firestore
       * snapshot, keeping the UI responsive after a send operation.
       * @param {string} channelId - Channel ID
       * @param {Message} message - Message to add
       * @returns {void}
       */
      addMessageToChannel(channelId: string, message: Message): void {
        const updated = ChannelMessageStateHelper.addMessageToChannel(
          store.channelMessages(),
          channelId,
          message,
        );
        patchState(store, { channelMessages: updated, isLoading: false });
      },

      // === HELPER METHODS ===

      /**
       * Handle messages loaded from listener
       * @param channelId - Channel ID
       * @param messages - Loaded messages
       * @param snapshot - Firestore snapshot for pagination
       * @description
       * Thread preloading is chained here so channel message and thread state stay
       * synchronized from the same snapshot boundary.
       */
      handleMessagesLoaded(
        channelId: string,
        messages: Message[],
        snapshot: QuerySnapshot<DocumentData>,
        options?: { once?: boolean },
      ): void {
        channelSnapshots.set(channelId, snapshot);
        loadThreadsForMessages(channelId, messages, options);
        patchState(
          store,
          ChannelMessageStateHelper.buildMessagesLoadedState(
            store.channelMessages(),
            store.hasMoreMessages(),
            store.updateCounter(),
            channelId,
            messages,
          ),
        );
      },

      /**
       * Load older messages for pagination
       * @description Uses the last cached query snapshot cursor to paginate older channel messages without resetting the active listener.
       * @async
       * @param {string} channelId - Channel ID
       * @returns {Promise<void>}
       */
      async loadOlderMessages(channelId: string): Promise<void> {
        const snapshot = channelSnapshots.get(channelId);
        if (!snapshot || shouldSkipOlderMessagesLoad(channelId, snapshot)) return;
        const firstDoc = snapshot.docs[0];
        if (!firstDoc) {
          markNoMoreOlderMessages(channelId);
          return;
        }
        startOlderMessagesLoading(channelId);
        try {
          const olderMessages = await operations.loadOlderMessages(channelId, firstDoc);
          if (olderMessages.length === 0) {
            applyEmptyOlderMessages(channelId);
            return;
          }
          applyOlderMessagesSuccess(channelId, olderMessages);
        } catch (error) {
          this.handleError(error, 'Failed to load older messages');
          finishOlderMessagesLoading(channelId);
        }
      },

      /**
       * Handle errors
       * @description Normalizes errors and clears loading state atomically so the
       * store never remains stuck in a loading condition after a failure.
       * @param error - Error object
       * @param defaultMessage - Default message
       */
      handleError(error: unknown, defaultMessage: string): void {
        const errorMessage = error instanceof Error ? error.message : defaultMessage;
        patchState(store, { error: errorMessage, isLoading: false });
      },

      /**
       * Execute shared channel message operation flow.
       * @description Provides uniform error propagation for message mutations so each
       * operation only contains its specific Firestore call.
       */
      async executeChannelMessageOperation(
        operation: () => Promise<void>,
        defaultMessage: string,
      ): Promise<void> {
        try {
          await operation();
        } catch (error) {
          this.handleError(error, defaultMessage);
          throw error;
        }
      },

      /**
       * Toggle reaction on message
       * @description Delegates to `ReactionService` so reaction logic is shared across
       * channel and DM message types without duplication.
       * @param channelId - Channel ID
       * @param messageId - Message ID
       * @param emojiId - Emoji ID
       * @param userId - User ID
       */
      async toggleReaction(
        channelId: string,
        messageId: string,
        emojiId: string,
        userId: string,
      ): Promise<void> {
        const messageRef = reactionService.getMessageRef(
          'channels',
          channelId,
          'messages',
          messageId,
        );
        await reactionService.toggleReaction(messageRef, emojiId, userId);
      },

      /**
       * Cleanup all listeners
       * @description Ensures Firestore listeners are detached when the component is
       * destroyed, preventing memory leaks and permission errors after logout.
       */
      destroy(): void {
        listener.clearAllListeners();
      },
    };
  }),
);
