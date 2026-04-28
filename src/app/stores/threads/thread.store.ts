/**
 * @fileoverview Thread Store for DABubble Application
 * @description NgRx SignalStore for managing message threads with Firestore integration
 * Handles thread messages within channel messages (nested subcollection)
 * @module ThreadStore
 */

import { computed, inject } from '@angular/core';
import { DocumentData, QuerySnapshot } from '@angular/fire/firestore';
import { ReactionService } from '@core/services/reaction/reaction.service';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { ThreadStateHelper } from '../helpers/thread-state.helper';
import {
  buildThreadDocumentPath,
  mergeMessageThreads,
  retryThreadListenerOnPermissionError,
  type ThreadListenerContext,
} from '../helpers/thread-store.helpers';
import { ThreadListenerService } from '../services/thread-listener.service';
import { ThreadOperationsService } from '../services/thread-operations.service';

/**
 * Thread message interface
 * Represents a reply to a parent message
 * @description Captures the full shape of a thread reply so the thread view can
 * render content, reactions, and edit state without additional Firestore reads.
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
 * @description Groups all loaded threads by parent message ID so the store can
 * serve multiple thread panels simultaneously without cross-contamination.
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
 * @description Deterministic zero-value baseline used at startup and after logout
 * so the thread panel always renders from a consistent empty state.
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
 * @description Owns thread listener registration and teardown so components only
 * call `loadThreads` and react to the grouped `threads` signal.
 * @constant {SignalStore}
 */
export const ThreadStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    /**
     * Get thread count for a specific message
     * @description Returns a stable function reference so templates can look up
     * thread counts per message without breaking signal dependency tracking.
     */
    getThreadCount: computed(() => (messageId: string) => {
      return store.threads()[messageId]?.length || 0;
    }),

    /**
     * Check if a message has threads
     * @description Derives a boolean from the threads map so templates can toggle
     * thread indicator icons reactively without their own array checks.
     */
    hasThreads: computed(() => (messageId: string) => {
      return !!store.threads()[messageId] && store.threads()[messageId].length > 0;
    }),

    /**
     * Get threads for a specific message
     * @description Returns a stable accessor function so consumers can retrieve
     * thread arrays by ID inside computed or template expressions.
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
       * @param {boolean} once - Whether to auto-unsubscribe after first snapshot
       * @description
       * `once` is used by warmup and hover previews to hydrate unread/thread state
       * without permanently attaching listeners for inactive threads.
       */
      loadThreads(
        channelId: string,
        messageId: string,
        isDirectMessage?: boolean,
        once?: boolean,
      ): void {
        this.performLoadThreads(channelId, messageId, isDirectMessage, once);
      },

      /**
       * Add a thread reply to a message
       * @description Public entry point that keeps the add-reply contract stable
       * while `performAddReply` handles Firestore writes and loading state.
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
        isDirectMessage?: boolean,
      ): Promise<void> {
        await this.performAddReply(channelId, messageId, content, authorId, isDirectMessage);
      },

      /**
       * Update a thread message
       * @description Thin wrapper delegating to `performUpdateThread` so callers
       * do not need to know about the optimistic local-state update strategy.
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
        isDirectMessage?: boolean,
      ): Promise<void> {
        await this.performUpdateThread(channelId, messageId, threadId, updates, isDirectMessage);
      },

      /**
       * Delete a thread message
       * @description Public facade so components do not need to know whether the
       * delete path differs between channel and DM threads.
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
        isDirectMessage?: boolean,
      ): Promise<void> {
        await this.performDeleteThread(channelId, messageId, threadId, isDirectMessage);
      },

      /**
       * Select a thread to view
       * @description Stores the thread selection in the store rather than component
       * scope so multiple panels can react to the active thread consistently.
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
       * @description Resets selection signals atomically so the thread panel closes
       * cleanly without leaving a stale `selectedParentId` in state.
       */
      clearSelectedThread(): void {
        patchState(store, {
          selectedThread: null,
          selectedParentId: null,
        });
      },

      /**
       * Clear all thread listeners
       * @description Delegates to `ThreadListenerService` to detach all active
       * Firestore listeners, preventing memory leaks after route changes.
       */
      clearAllListeners(): void {
        threadListener.clearAllListeners();
      },

      // === IMPLEMENTATION METHODS ===

      /**
       * Implementation: Load threads from Firestore with real-time updates
       * Path: channels/{channelId}/messages/{messageId}/threads OR direct-messages/{conversationId}/messages/{messageId}/threads
       * @description
       * Unified path keeps channel and DM thread behavior identical; context carries the
       * minimal flags needed for listener setup and retry continuity.
       */
      performLoadThreads(
        channelId: string,
        messageId: string,
        isDirectMessage?: boolean,
        once?: boolean,
      ): void {
        patchState(store, { isLoading: true, error: null });
        try {
          const context: ThreadListenerContext = { channelId, messageId, isDirectMessage, once };
          const success = this.registerThreadListener(context);
          if (!success) return; // Listener already exists
        } catch (error) {
          this.handleError(error, 'Failed to setup thread listener');
        }
      },

      /**
       * Register thread listener and wire callbacks.
       * @description
       * Callback wiring is centralized so retry paths reuse the same snapshot/error handling
       * logic for both persistent and one-shot listeners.
       */
      registerThreadListener(context: ThreadListenerContext): boolean {
        return threadListener.setupListener(
          context.channelId,
          context.messageId,
          context.isDirectMessage,
          (snapshot, messageId) => this.handleThreadsSnapshot(snapshot, messageId),
          (error, key, channelId, messageId, isDirectMessage) =>
            this.handleThreadsError(
              error,
              key,
              channelId,
              messageId,
              isDirectMessage,
              context.once,
            ),
          { once: context.once },
        );
      },

      /**
       * Handle threads snapshot update
       * @description Maps the raw Firestore snapshot to typed `ThreadMessage` objects
       * and merges them into the existing threads map via `ThreadStateHelper`.
       */
      handleThreadsSnapshot(snapshot: QuerySnapshot<DocumentData>, messageId: string): void {
        const threads = threadListener.mapSnapshot(snapshot, messageId);
        const updatedThreads = ThreadStateHelper.updateThreadsFromSnapshot(
          store.threads(),
          messageId,
          threads,
        );
        patchState(store, { threads: updatedThreads, isLoading: false });
      },

      /**
       * Handle permission errors for threads listener
       * @description
       * The `once` flag is forwarded into retries so fallback behavior matches the original
       * intent of the calling pipeline.
       */
      handleThreadsError(
        error: unknown,
        listenerKey: string,
        channelId: string,
        messageId: string,
        isDirectMessage?: boolean,
        once?: boolean,
      ): void {
        const didScheduleRetry = retryThreadListenerOnPermissionError(
          threadListener,
          error,
          listenerKey,
          () => this.performLoadThreads(channelId, messageId, isDirectMessage, once),
        );
        if (didScheduleRetry) {
          return;
        }
        this.handleError(error, 'Failed to load threads');
      },

      /**
       * Implementation: Add thread reply to Firestore
       * @description Writes the reply document through `ThreadOperationsService` and
       * manages loading state via the shared mutation executor.
       */
      async performAddReply(
        channelId: string,
        messageId: string,
        content: string,
        authorId: string,
        isDirectMessage?: boolean,
      ): Promise<void> {
        await this.executeThreadMutation(
          () => threadOps.addThreadReply(channelId, messageId, content, authorId, isDirectMessage),
          'Failed to add thread reply',
          true,
        );
      },

      /**
       * Implementation: Update thread in Firestore
       * @description Applies an optimistic local update then persists to Firestore so
       * the UI reflects changes immediately without waiting for a snapshot.
       */
      async performUpdateThread(
        channelId: string,
        messageId: string,
        threadId: string,
        updates: Partial<ThreadMessage>,
        isDirectMessage?: boolean,
      ): Promise<void> {
        await this.executeThreadMutation(
          () => threadOps.updateThread(channelId, messageId, threadId, updates, isDirectMessage),
          'Failed to update thread',
          false,
          () => this.updateThreadInLocalState(messageId, threadId, updates),
        );
      },

      /**
       * Update thread in local state
       * @description Mutates the in-memory threads map immutably via `ThreadStateHelper`
       * so only the targeted thread triggers signal re-evaluation.
       */
      updateThreadInLocalState(
        messageId: string,
        threadId: string,
        updates: Partial<ThreadMessage>,
      ): void {
        const currentThreads = store.threads()[messageId] || [];
        const updatedThreads = ThreadStateHelper.updateThreadInState(
          currentThreads,
          threadId,
          updates,
        );
        patchState(store, {
          threads: mergeMessageThreads(store.threads(), messageId, updatedThreads),
        });
      },

      /**
       * Implementation: Delete thread from Firestore
       * @description Removes the thread document from Firestore then prunes it from
       * local state to keep the UI in sync without waiting for a snapshot.
       */
      async performDeleteThread(
        channelId: string,
        messageId: string,
        threadId: string,
        isDirectMessage?: boolean,
      ): Promise<void> {
        await this.executeThreadMutation(
          () => threadOps.deleteThread(channelId, messageId, threadId, isDirectMessage),
          'Failed to delete thread',
          false,
          () => this.removeThreadFromLocalState(messageId, threadId),
        );
      },

      /**
       * Remove thread from local state
       * @description Filters the thread array through `ThreadStateHelper` and merges
       * the result back into the threads map immutably.
       */
      removeThreadFromLocalState(messageId: string, threadId: string): void {
        const currentThreads = store.threads()[messageId] || [];
        const filteredThreads = ThreadStateHelper.removeThreadFromState(currentThreads, threadId);
        patchState(store, {
          threads: mergeMessageThreads(store.threads(), messageId, filteredThreads),
        });
      },

      // === HELPER METHODS ===

      /**
       * Handle errors consistently
       * @description Normalizes the error value to a string and clears loading state
       * atomically so the store never stays stuck in an in-progress state.
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
       * Execute thread mutation with shared error and loading handling.
       * @description Provides uniform loading-state lifecycle and error propagation
       * so each thread mutation only contains its specific Firestore call.
       */
      async executeThreadMutation(
        operation: () => Promise<void>,
        errorMessage: string,
        withLoadingState = false,
        onSuccess?: () => void,
      ): Promise<void> {
        if (withLoadingState) {
          this.startMutationLoading();
        }

        try {
          await operation();
          onSuccess?.();
          if (withLoadingState) {
            this.finishMutationLoading();
          }
        } catch (error) {
          this.handleError(error, errorMessage);
        }
      },

      /**
       * Mark thread mutation as loading.
       * @description Pairs with `finishMutationLoading` to bookend loading state so
       * the UI can show a spinner for operations that warrant one.
       */
      startMutationLoading(): void {
        patchState(store, { isLoading: true, error: null });
      },

      /**
       * Mark thread mutation as completed.
       * @description Clears the loading flag set by `startMutationLoading` after
       * a successful mutation so the UI returns to its idle state.
       */
      finishMutationLoading(): void {
        patchState(store, { isLoading: false });
      },

      /**
       * Clear error
       * @description Clears the error signal so the UI can dismiss error banners after user acknowledgement.
       */
      clearError(): void {
        patchState(store, { error: null });
      },

      /**
       * Clear all threads
       * @description Resets the full threads map to an empty state, used on logout to prevent thread data from leaking into the next session.
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
       * @description Delegates to ReactionService so reaction toggle logic is not duplicated between the thread and message stores.
       */
      async toggleReaction(
        channelId: string,
        parentMessageId: string,
        threadId: string,
        emojiId: string,
        userId: string,
        isDirectMessage = false,
      ): Promise<void> {
        const threadsPath = buildThreadDocumentPath(
          channelId,
          parentMessageId,
          threadId,
          isDirectMessage,
        );
        const threadRef = reactionService.getMessageRef(...threadsPath);
        await reactionService.toggleReaction(threadRef, emojiId, userId);
      },

      /**
       * Cleanup all listeners
       * @description Alias for `clearAllListeners` exposed as `destroy` so Angular lifecycle hooks can call it uniformly.
       */
      destroy(): void {
        threadListener.clearAllListeners();
      },
    };
  }),
);
