/**
 * @fileoverview Thread Store for DABubble Application
 * @description NgRx SignalStore for managing message threads with Firestore integration
 * Handles thread messages within channel messages (nested subcollection)
 * @module ThreadStore
 */

import { computed, inject } from '@angular/core';
import { signalStore, withState, withMethods, withComputed, patchState } from '@ngrx/signals';
import { ReactionService } from '@core/services/reaction/reaction.service';
import { ThreadOperationsService } from './services/thread-operations.service';
import { ThreadListenerService } from './services/thread-listener.service';
import { ThreadStateHelper } from './helpers/thread-state.helper';

/**
 * Thread message interface
 * Represents a reply to a parent message
 */
export interface ThreadMessage {
  id: string;
  content: string;
  authorId: string;
  parentMessageId: string;
  channelId: string;
  reactions: { emoji: string; users: string[]; count: number }[];
  attachments: string[];
  isEdited: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Thread state interface
 */
export interface ThreadState {
  /** All thread messages grouped by parent message ID */
  threads: Record<string, ThreadMessage[]>;
  /** Currently selected thread */
  selectedThread: ThreadMessage[] | null;
  /** Parent message ID of selected thread */
  selectedParentId: string | null;
  /** Loading state indicator */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
}

/**
 * Initial thread state
 */
const initialState: ThreadState = {
  threads: {},
  selectedThread: null,
  selectedParentId: null,
  isLoading: false,
  error: null,
};

/**
 * Thread management store with Firestore integration
 * Manages thread messages as subcollection of channel messages
 * @constant {SignalStore}
 */
export const ThreadStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    /**
     * Get thread count for a specific message
     */
    getThreadCount: computed(() => (messageId: string) => {
      return store.threads()[messageId]?.length || 0;
    }),

    /**
     * Check if a message has threads
     */
    hasThreads: computed(() => (messageId: string) => {
      return !!store.threads()[messageId] && store.threads()[messageId].length > 0;
    }),

    /**
     * Get threads for a specific message
     */
    getThreadsByMessageId: computed(() => (messageId: string) => {
      return store.threads()[messageId] || [];
    }),
  })),
  withMethods((store) => {
    const reactionService = inject(ReactionService);
    const threadOps = inject(ThreadOperationsService);
    const threadListener = inject(ThreadListenerService);
    return {
      // === ENTRY POINT METHODS ===

      /**
       * Load threads for a specific message
       * @param {string} channelId - Channel ID
       * @param {string} messageId - Parent message ID
       * @param {boolean} isDirectMessage - Whether this is a direct message thread
       */
      loadThreads(channelId: string, messageId: string, isDirectMessage?: boolean): void {
        this.performLoadThreads(channelId, messageId, isDirectMessage);
      },

      /**
       * Add a thread reply to a message
       * @async
       * @param {string} channelId - Channel ID
       * @param {string} messageId - Parent message ID
       * @param {string} content - Thread message content
       * @param {string} authorId - Author user ID
       * @param {boolean} isDirectMessage - Whether this is a direct message thread
       */
      async addThreadReply(
        channelId: string,
        messageId: string,
        content: string,
        authorId: string,
        isDirectMessage?: boolean
      ): Promise<void> {
        await this.performAddReply(channelId, messageId, content, authorId, isDirectMessage);
      },

      /**
       * Update a thread message
       * @async
       * @param {string} channelId - Channel ID
       * @param {string} messageId - Parent message ID
       * @param {string} threadId - Thread message ID
       * @param {Partial<ThreadMessage>} updates - Updates to apply
       */
      async updateThread(
        channelId: string,
        messageId: string,
        threadId: string,
        updates: Partial<ThreadMessage>,
        isDirectMessage?: boolean
      ): Promise<void> {
        await this.performUpdateThread(channelId, messageId, threadId, updates, isDirectMessage);
      },

      /**
       * Delete a thread message
       * @async
       * @param {string} channelId - Channel ID
       * @param {string} messageId - Parent message ID
       * @param {string} threadId - Thread message ID
       * @param {boolean} isDirectMessage - Whether this is a direct message thread
       */
      async deleteThread(
        channelId: string,
        messageId: string,
        threadId: string,
        isDirectMessage?: boolean
      ): Promise<void> {
        await this.performDeleteThread(channelId, messageId, threadId, isDirectMessage);
      },

      /**
       * Select a thread to view
       * @param {string} messageId - Parent message ID
       */
      selectThread(messageId: string): void {
        const threads = store.threads()[messageId] || [];
        patchState(store, {
          selectedThread: threads,
          selectedParentId: messageId,
        });
      },

      /**
       * Clear selected thread
       */
      clearSelectedThread(): void {
        patchState(store, {
          selectedThread: null,
          selectedParentId: null,
        });
      },

      /**
       * Clear all thread listeners
       */
      clearAllListeners(): void {
        threadListener.clearAllListeners();
      },

      // === IMPLEMENTATION METHODS ===

      /**
       * Implementation: Load threads from Firestore with real-time updates
       * Path: channels/{channelId}/messages/{messageId}/threads OR direct-messages/{conversationId}/messages/{messageId}/threads
       */
      performLoadThreads(channelId: string, messageId: string, isDirectMessage?: boolean): void {
        patchState(store, { isLoading: true, error: null });

        try {
          const success = threadListener.setupListener(
            channelId,
            messageId,
            isDirectMessage,
            (snapshot, msgId) => this.handleThreadsSnapshot(snapshot, msgId),
            (error, key, chId, msgId, isDM) => this.handleThreadsError(error, key, chId, msgId, isDM)
          );

          if (!success) return; // Listener already exists
        } catch (error) {
          this.handleError(error, 'Failed to setup thread listener');
        }
      },

      /**
       * Handle threads snapshot update
       */
      handleThreadsSnapshot(snapshot: any, messageId: string): void {
        const threads = threadListener.mapSnapshot(snapshot, messageId);
        const updatedThreads = ThreadStateHelper.updateThreadsFromSnapshot(store.threads(), messageId, threads);
        patchState(store, { threads: updatedThreads, isLoading: false });
      },

      /**
       * Handle permission errors for threads listener
       */
      handleThreadsError(
        error: any,
        listenerKey: string,
        channelId: string,
        messageId: string,
        isDirectMessage?: boolean
      ): void {
        if (threadListener.isPermissionError(error)) {
          threadListener.scheduleRetry(listenerKey, () =>
            this.performLoadThreads(channelId, messageId, isDirectMessage)
          );
          return;
        }
        this.handleError(error, 'Failed to load threads');
      },

      /**
       * Implementation: Add thread reply to Firestore
       */
      async performAddReply(
        channelId: string,
        messageId: string,
        content: string,
        authorId: string,
        isDirectMessage?: boolean
      ): Promise<void> {
        patchState(store, { isLoading: true, error: null });
        try {
          await threadOps.addThreadReply(channelId, messageId, content, authorId, isDirectMessage);
          patchState(store, { isLoading: false });
        } catch (error) {
          this.handleError(error, 'Failed to add thread reply');
        }
      },

      /**
       * Implementation: Update thread in Firestore
       */
      async performUpdateThread(
        channelId: string,
        messageId: string,
        threadId: string,
        updates: Partial<ThreadMessage>,
        isDirectMessage?: boolean
      ): Promise<void> {
        try {
          await threadOps.updateThread(channelId, messageId, threadId, updates, isDirectMessage);
          this.updateThreadInLocalState(messageId, threadId, updates);
        } catch (error) {
          this.handleError(error, 'Failed to update thread');
        }
      },

      /**
       * Update thread in local state
       */
      updateThreadInLocalState(messageId: string, threadId: string, updates: Partial<ThreadMessage>): void {
        const currentThreads = store.threads()[messageId] || [];
        const updatedThreads = ThreadStateHelper.updateThreadInState(currentThreads, threadId, updates);
        patchState(store, { threads: { ...store.threads(), [messageId]: updatedThreads } });
      },

      /**
       * Implementation: Delete thread from Firestore
       */
      async performDeleteThread(
        channelId: string,
        messageId: string,
        threadId: string,
        isDirectMessage?: boolean
      ): Promise<void> {
        try {
          await threadOps.deleteThread(channelId, messageId, threadId, isDirectMessage);
          this.removeThreadFromLocalState(messageId, threadId);
        } catch (error) {
          this.handleError(error, 'Failed to delete thread');
        }
      },

      /**
       * Remove thread from local state
       */
      removeThreadFromLocalState(messageId: string, threadId: string): void {
        const currentThreads = store.threads()[messageId] || [];
        const filteredThreads = ThreadStateHelper.removeThreadFromState(currentThreads, threadId);
        patchState(store, { threads: { ...store.threads(), [messageId]: filteredThreads } });
      },

      // === HELPER METHODS ===

      /**
       * Handle errors consistently
       */
      handleError(error: unknown, defaultMessage: string): void {
        console.error(defaultMessage, error);
        const errorMessage = error instanceof Error ? error.message : defaultMessage;
        patchState(store, {
          error: errorMessage,
          isLoading: false,
        });
      },

      /**
       * Clear error
       */
      clearError(): void {
        patchState(store, { error: null });
      },

      /**
       * Clear all threads
       */
      clearAllThreads(): void {
        patchState(store, {
          threads: {},
          selectedThread: null,
          selectedParentId: null,
        });
      },

      /**
       * Toggle reaction on a thread message
       * @param channelId Channel ID or conversation ID
       * @param parentMessageId Parent message ID
       * @param threadId Thread message ID
       * @param emojiId Emoji ID
       * @param userId User ID who reacted
       * @param isDirectMessage Whether this is a direct message thread
       */
      async toggleReaction(
        channelId: string,
        parentMessageId: string,
        threadId: string,
        emojiId: string,
        userId: string,
        isDirectMessage = false
      ): Promise<void> {
        const threadsPath = isDirectMessage
          ? ['direct-messages', channelId, 'messages', parentMessageId, 'threads', threadId]
          : ['channels', channelId, 'messages', parentMessageId, 'threads', threadId];

        const threadRef = reactionService.getMessageRef(...threadsPath);
        await reactionService.toggleReaction(threadRef, emojiId, userId);
      },
    };
  })
);
