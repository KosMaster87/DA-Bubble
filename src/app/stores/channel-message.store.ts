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
import {
  Firestore,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Unsubscribe,
} from '@angular/fire/firestore';
import { Message, CreateMessageRequest, MessageType } from '@core/models/message.model';
import { ReactionService } from '@core/services/reaction/reaction.service';

/**
 * State interface for channel message management
 * @interface ChannelMessageState
 */
export interface ChannelMessageState {
  /** Messages grouped by channel ID */
  channelMessages: { [channelId: string]: Message[] };
  /** Currently active channel ID */
  activeChannelId: string | null;
  /** Loading state indicator */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Update counter to force reactivity on Firestore updates */
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
    const firestore = inject(Firestore);
    const reactionService = inject(ReactionService);
    const messageListeners = new Map<string, Unsubscribe>();
    return {
      // === ENTRY POINT METHODS ===

      /**
       * Entry point: Load messages for a specific channel with real-time updates
       * @async
       * @function loadChannelMessages
       * @param {string} channelId - Channel ID to load messages for
       * @returns {void}
       */
      loadChannelMessages(channelId: string) {
        this.performLoadChannelMessages(channelId);
      },

      /**
       * Entry point: Send message to channel
       * @async
       * @function sendMessage
       * @param {string} channelId - Channel ID
       * @param {string} content - Message content
       * @param {string} authorId - Author user ID
       * @returns {Promise<void>}
       */
      async sendMessage(channelId: string, content: string, authorId: string) {
        await this.performSendMessage(channelId, content, authorId);
      },

      /**
       * Entry point: Update message content
       * @async
       * @function updateMessage
       * @param {string} channelId - Channel ID
       * @param {string} messageId - Message ID to update
       * @param {string} content - New message content
       * @returns {Promise<void>}
       */
      async updateMessage(channelId: string, messageId: string, content: string) {
        await this.performUpdateMessage(channelId, messageId, content);
      },

      /**
       * Entry point: Delete message
       * @async
       * @function deleteMessage
       * @param {string} channelId - Channel ID
       * @param {string} messageId - Message ID to delete
       * @returns {Promise<void>}
       */
      async deleteMessage(channelId: string, messageId: string) {
        await this.performDeleteMessage(channelId, messageId);
      },

      /**
       * Entry point: Set active channel
       * @function setActiveChannel
       * @param {string | null} channelId - Channel ID to set as active
       */
      setActiveChannel(channelId: string | null) {
        patchState(store, { activeChannelId: channelId });
      },

      /**
       * Entry point: Add message to channel
       * @function addMessageToChannel
       * @param {string} channelId - Channel ID
       * @param {Message} message - Message to add
       */
      addMessageToChannel(channelId: string, message: Message) {
        this.performAddMessageToChannel(channelId, message);
      },

      // === IMPLEMENTATION METHODS ===

      /**
       * Implementation: Load channel messages from Firestore with real-time updates
       * @function performLoadChannelMessages
       * @param {string} channelId - Channel ID to load messages for
       * @returns {void}
       */
      performLoadChannelMessages(channelId: string) {
        // Unsubscribe from previous listener for this channel
        const existingListener = messageListeners.get(channelId);
        if (existingListener) {
          existingListener();
        }

        patchState(store, { isLoading: true, error: null });

        try {
          // Get messages subcollection for this channel
          const messagesRef = collection(firestore, `channels/${channelId}/messages`);
          const q = query(messagesRef, orderBy('createdAt', 'asc'));

          // Set up real-time listener
          const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
              console.log('📨 Channel messages snapshot:', {
                channelId,
                docChanges: snapshot.docChanges().length,
                types: snapshot.docChanges().map((c) => c.type),
                total: snapshot.docs.length,
              });

              const messages = snapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                  id: doc.id,
                  ...data,
                  createdAt: data['createdAt']?.toDate() || new Date(),
                  updatedAt: data['updatedAt']?.toDate() || new Date(),
                  lastThreadTimestamp: data['lastThreadTimestamp']?.toDate() || undefined,
                  reactions: data['reactions'] || [],
                  threadCount: data['threadCount'] || 0,
                };
              }) as Message[];

              this.updateChannelMessages(channelId, messages);
              patchState(store, {
                isLoading: false,
                updateCounter: store.updateCounter() + 1,
              });

              console.log('✅ Updated channel messages:', {
                channelId,
                messageCount: messages.length,
                messagesWithThreads: messages.filter((m) => m.lastThreadTimestamp).length,
                updateCounter: store.updateCounter(),
              });
            },
            (error: any) => {
              // Ignore transient Firestore state errors
              if (error?.message?.includes('INTERNAL ASSERTION FAILED')) {
                console.log('⏭️  Skipping Firestore error for channel:', channelId);
                return;
              }

              // Auto-cleanup on permission error (user logged out)
              if (error.code === 'permission-denied' || error.message?.includes('permissions')) {
                console.log(
                  '🔓 Permission error detected - cleaning up channel messages subscription'
                );
                if (messageListeners.has(channelId)) {
                  messageListeners.get(channelId)!();
                  messageListeners.delete(channelId);
                }
                return;
              }

              this.handleError(error, 'Failed to load channel messages');
            }
          );

          // Store unsubscribe function in private variable
          messageListeners.set(channelId, unsubscribe);
        } catch (error) {
          this.handleError(error, 'Failed to setup message listener');
        }
      },

      /**
       * Implementation: Send message to channel
       * @async
       * @function performSendMessage
       * @param {string} channelId - Channel ID
       * @param {string} content - Message content
       * @param {string} authorId - Author user ID
       * @returns {Promise<void>}
       */
      async performSendMessage(channelId: string, content: string, authorId: string) {
        try {
          const messagesRef = collection(firestore, `channels/${channelId}/messages`);
          await addDoc(messagesRef, {
            content,
            authorId,
            channelId,
            type: MessageType.TEXT,
            attachments: [],
            reactions: [],
            threadCount: 0,
            isEdited: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (error) {
          this.handleError(error, 'Failed to send message');
          throw error;
        }
      },

      /**
       * Implementation: Update message in Firestore
       * @async
       * @function performUpdateMessage
       * @param {string} channelId - Channel ID
       * @param {string} messageId - Message ID to update
       * @param {string} content - New message content
       * @returns {Promise<void>}
       */
      async performUpdateMessage(channelId: string, messageId: string, content: string) {
        try {
          const messageRef = doc(firestore, `channels/${channelId}/messages/${messageId}`);
          await updateDoc(messageRef, {
            content,
            isEdited: true,
            editedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          // onSnapshot listener will automatically update state
        } catch (error) {
          this.handleError(error, 'Failed to update message');
          throw error;
        }
      },

      /**
       * Implementation: Delete message
       * @function performDeleteMessage
       * @param {string} channelId - Channel ID
       * @param {string} messageId - Message ID to delete
       * @returns {Promise<void>}
       */
      async performDeleteMessage(channelId: string, messageId: string) {
        try {
          // Delete message document
          const messageRef = doc(firestore, `channels/${channelId}/messages/${messageId}`);
          await deleteDoc(messageRef);

          // Delete all thread messages for this parent message
          const threadsRef = collection(
            firestore,
            `channels/${channelId}/messages/${messageId}/threads`
          );
          const threadsSnapshot = await getDocs(threadsRef);
          const deletePromises = threadsSnapshot.docs.map((threadDoc) => deleteDoc(threadDoc.ref));
          await Promise.all(deletePromises);

          console.log('✅ Message and thread deleted successfully');
          // onSnapshot listener will automatically update state
        } catch (error) {
          this.handleError(error, 'Failed to delete message');
          throw error;
        }
      },

      /**
       * Implementation: Add message to channel state
       * @function performAddMessageToChannel
       * @param {string} channelId - Channel ID
       * @param {Message} message - Message to add
       */
      performAddMessageToChannel(channelId: string, message: Message) {
        const channelMessages = store.channelMessages()[channelId] || [];
        this.updateChannelMessages(channelId, [message, ...channelMessages]);
      },

      // === HELPER FUNCTIONS ===

      /**
       * Update channel messages in state
       * @function updateChannelMessages
       * @param {string} channelId - Channel ID
       * @param {Message[]} messages - Messages to update
       */
      updateChannelMessages(channelId: string, messages: Message[]) {
        patchState(store, {
          channelMessages: {
            ...store.channelMessages(),
            [channelId]: messages,
          },
          isLoading: false,
        });
      },

      /**
       * Update channel messages with changes
       * @function updateChannelMessagesWithChanges
       * @param {string} messageId - Message ID to update
       * @param {Partial<Message>} updates - Updates to apply
       * @returns {object} Updated channel messages
       */
      updateChannelMessagesWithChanges(messageId: string, updates: Partial<Message>): any {
        const updatedChannelMessages = { ...store.channelMessages() };
        Object.keys(updatedChannelMessages).forEach((channelId) => {
          updatedChannelMessages[channelId] = updatedChannelMessages[channelId].map((msg) =>
            msg.id === messageId ? { ...msg, ...updates } : msg
          );
        });
        return updatedChannelMessages;
      },

      /**
       * Handle errors and update state
       * @function handleError
       * @param {unknown} error - Error object
       * @param {string} defaultMessage - Default error message
       */
      handleError(error: unknown, defaultMessage: string) {
        const errorMessage = error instanceof Error ? error.message : defaultMessage;
        patchState(store, { error: errorMessage, isLoading: false });
      },

      // === STATE MANAGEMENT HELPERS ===

      /**
       * Set loading state
       * @function setLoading
       * @param {boolean} isLoading - Loading state
       */
      setLoading(isLoading: boolean) {
        patchState(store, { isLoading });
      },

      /**
       * Set error message
       * @function setError
       * @param {string | null} error - Error message or null to clear
       */
      setError(error: string | null) {
        patchState(store, { error });
      },

      /**
       * Clear error message
       * @function clearError
       */
      clearError() {
        patchState(store, { error: null });
      },

      /**
       * Toggle reaction on a channel message
       * @function toggleReaction
       * @param {string} channelId - Channel ID
       * @param {string} messageId - Message ID
       * @param {string} emojiId - Emoji ID
       * @param {string} userId - User ID who reacted
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
       * @function destroy
       */
      destroy() {
        messageListeners.forEach((unsubscribe) => unsubscribe());
        messageListeners.clear();
      },
    };
  })
);
