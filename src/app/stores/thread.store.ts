/**
 * @fileoverview Thread Store for DABubble Application
 * @description NgRx SignalStore for managing message threads with Firestore integration
 * Handles thread messages within channel messages (nested subcollection)
 * @module ThreadStore
 */

import { computed, inject } from '@angular/core';
import { signalStore, withState, withMethods, withComputed, patchState } from '@ngrx/signals';
import {
  Firestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  deleteDoc,
  increment,
  onSnapshot,
  query,
  orderBy,
  Unsubscribe,
  serverTimestamp,
} from '@angular/fire/firestore';
import { ReactionService } from '@core/services/reaction/reaction.service';

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
    const firestore = inject(Firestore);
    const reactionService = inject(ReactionService);
    const threadListeners = new Map<string, Unsubscribe>();
    const pendingRetries = new Set<string>(); // Track threads with scheduled retries
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
        threadListeners.forEach((unsubscribe) => unsubscribe());
        threadListeners.clear();
      },

      // === IMPLEMENTATION METHODS ===

      /**
       * Implementation: Load threads from Firestore with real-time updates
       * Path: channels/{channelId}/messages/{messageId}/threads OR direct-messages/{conversationId}/messages/{messageId}/threads
       */
      performLoadThreads(channelId: string, messageId: string, isDirectMessage?: boolean): void {
        // Check if listener already exists for this message
        const listenerKey = `${channelId}_${messageId}`;
        if (threadListeners.has(listenerKey)) {
          return; // Listener already active
        }

        patchState(store, { isLoading: true, error: null });

        try {
          // Determine the correct path based on message type
          const threadsPath = isDirectMessage
            ? `direct-messages/${channelId}/messages/${messageId}/threads`
            : `channels/${channelId}/messages/${messageId}/threads`;
          const threadsCollection = collection(firestore, threadsPath);
          const threadsQuery = query(threadsCollection, orderBy('createdAt', 'asc'));

          // Set up real-time listener
          const unsubscribe = onSnapshot(
            threadsQuery,
            (snapshot) => {
              const threads = snapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                  id: doc.id,
                  content: data['content'],
                  authorId: data['authorId'],
                  parentMessageId: messageId,
                  channelId: channelId,
                  reactions: data['reactions'] || [],
                  attachments: data['attachments'] || [],
                  isEdited: data['isEdited'] || false,
                  createdAt: data['createdAt']?.toDate() || new Date(),
                  updatedAt: data['updatedAt']?.toDate() || new Date(),
                  editedAt: data['editedAt']?.toDate() || undefined,
                } as ThreadMessage;
              });

              patchState(store, {
                threads: {
                  ...store.threads(),
                  [messageId]: threads,
                },
                isLoading: false,
              });
            },
            (error: any) => {
              // Handle permission errors - Firestore closes the subscription, so we need to retry
              if (error.code === 'permission-denied' || error.message?.includes('permissions')) {
                console.log(
                  '🔓 Permission error - will retry thread subscription after permissions update'
                );
                // Cleanup the closed subscription
                if (threadListeners.has(listenerKey)) {
                  threadListeners.delete(listenerKey);
                }

                // Only schedule retry if not already pending (prevents double retries)
                if (!pendingRetries.has(listenerKey)) {
                  pendingRetries.add(listenerKey);
                  // Retry after 3s to allow Security Rules cache propagation
                  setTimeout(() => {
                    console.log('🔄 Retrying thread subscription:', listenerKey);
                    pendingRetries.delete(listenerKey);
                    this.performLoadThreads(channelId, messageId, isDirectMessage);
                  }, 3000);
                } else {
                  console.log('⏭️  Retry already scheduled for thread:', listenerKey);
                }
                return;
              }

              this.handleError(error, 'Failed to load threads');
            }
          );

          // Store listener for cleanup
          threadListeners.set(listenerKey, unsubscribe);
        } catch (error) {
          this.handleError(error, 'Failed to setup thread listener');
        }
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
          // Determine the correct path based on message type
          const threadsPath = isDirectMessage
            ? `direct-messages/${channelId}/messages/${messageId}/threads`
            : `channels/${channelId}/messages/${messageId}/threads`;
          const threadsCollection = collection(firestore, threadsPath);

          const newThread = {
            content,
            authorId,
            parentMessageId: messageId,
            channelId,
            reactions: [],
            attachments: [],
            isEdited: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };

          const docRef = await addDoc(threadsCollection, newThread);

          // Increment threadCount in parent message and update timestamp
          const parentMessagePath = isDirectMessage
            ? `direct-messages/${channelId}/messages/${messageId}`
            : `channels/${channelId}/messages/${messageId}`;
          const parentMessageRef = doc(firestore, parentMessagePath);
          await updateDoc(parentMessageRef, {
            threadCount: increment(1),
            lastThreadTimestamp: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          // onSnapshot listener will automatically update state
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
          const threadPath = isDirectMessage
            ? `direct-messages/${channelId}/messages/${messageId}/threads`
            : `channels/${channelId}/messages/${messageId}/threads`;
          const threadDoc = doc(firestore, threadPath, threadId);

          await updateDoc(threadDoc, {
            ...updates,
            updatedAt: serverTimestamp(),
            isEdited: true,
          });

          // Update local state
          const currentThreads = store.threads()[messageId] || [];
          const updatedThreads = currentThreads.map((thread) =>
            thread.id === threadId
              ? { ...thread, ...updates, updatedAt: new Date(), isEdited: true }
              : thread
          );

          patchState(store, {
            threads: {
              ...store.threads(),
              [messageId]: updatedThreads,
            },
          });
        } catch (error) {
          this.handleError(error, 'Failed to update thread');
        }
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
          const collectionType = isDirectMessage ? 'direct-messages' : 'channels';
          const threadPath = `${collectionType}/${channelId}/messages/${messageId}/threads`;
          const threadDoc = doc(firestore, threadPath, threadId);

          await deleteDoc(threadDoc);

          // Get remaining threads to update parent message metadata
          const threadsRef = collection(firestore, threadPath);
          const threadsSnapshot = await getDocs(query(threadsRef, orderBy('createdAt', 'desc')));
          const remainingThreadCount = threadsSnapshot.size;

          // Update parent message with new thread count and last timestamp
          const parentMessageRef = doc(
            firestore,
            `${collectionType}/${channelId}/messages/${messageId}`
          );

          if (remainingThreadCount > 0) {
            // Get the timestamp of the most recent remaining thread
            const latestThread = threadsSnapshot.docs[0];
            const latestThreadData = latestThread.data();

            await updateDoc(parentMessageRef, {
              threadCount: remainingThreadCount,
              lastThreadTimestamp: latestThreadData['createdAt'],
              updatedAt: serverTimestamp(),
            });
          } else {
            // No threads left, reset to 0
            await updateDoc(parentMessageRef, {
              threadCount: 0,
              lastThreadTimestamp: null,
              updatedAt: serverTimestamp(),
            });
          }

          // Update local state
          const currentThreads = store.threads()[messageId] || [];
          const filteredThreads = currentThreads.filter((thread) => thread.id !== threadId);

          patchState(store, {
            threads: {
              ...store.threads(),
              [messageId]: filteredThreads,
            },
          });
        } catch (error) {
          this.handleError(error, 'Failed to delete thread');
        }
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
