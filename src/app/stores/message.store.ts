/**
 * @fileoverview Core message management store with NgRx SignalStore
 * Provides state management for basic message CRUD operations,
 * message selection, and core message functionality.
 * @description This store handles core message operations including sending,
 * editing, deleting messages, and basic message state management.
 * @module MessageStore
 */

import { computed, inject } from '@angular/core';
import { signalStore, withState, withMethods, withComputed, patchState } from '@ngrx/signals';
import { collection, doc, addDoc, updateDoc, Firestore } from '@angular/fire/firestore';
import { Message, CreateMessageRequest } from '@core/models/message.model';
import { ReactionService } from '@core/services/reaction/reaction.service';
import { updateItemInArray, prependItem } from './helpers/shared-state.helpers';
import { getErrorMessage, logError } from './helpers/shared-error.helpers';
import { buildMessageUpdate, buildSoftDeleteData } from './helpers/shared-firestore.helpers';

// Export types for use in other modules
export type { CreateMessageRequest };

/**
 * State interface for core message management
 * @interface MessageState
 */
export interface MessageState {
  /** Array of all messages */
  messages: Message[];
  /** Currently selected message */
  selectedMessage: Message | null;
  /** Loading state indicator */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
}

/**
 * Initial message state
 * @constant {MessageState}
 */
const initialState: MessageState = {
  messages: [],
  selectedMessage: null,
  isLoading: false,
  error: null,
};

/**
 * Core message management store with Firestore integration
 * Provides methods for basic message CRUD operations and state management
 * @constant {SignalStore}
 */
export const MessageStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((state) => {
    return {
      /**
       * Total number of messages in store
       * @returns {Signal<number>} Total message count
       */
      totalMessages: computed(() => state.messages().length),

      /**
       * Check if messages are currently loading
       * @returns {Signal<boolean>} Loading status
       */
      loading: computed(() => state.isLoading()),

      /**
       * Get current error message if any
       * @returns {Signal<string | null>} Error message or null
       */
      errorMessage: computed(() => state.error()),

      /**
       * Check if a message is currently selected
       * @returns {Signal<boolean>} True if message is selected
       */
      hasSelectedMessage: computed(() => !!state.selectedMessage()),
    };
  }),
  withMethods((store) => {
    const firestore = inject(Firestore);
    const messagesCollection = collection(firestore, 'messages');
    const reactionService = inject(ReactionService);

    return {
      // === ENTRY POINT METHODS ===

      /**
       * Entry point: Send a new message
       * @async
       * @function sendMessage
       * @param {CreateMessageRequest} messageData - Message data to send
       * @param {string} authorId - ID of the message author
       * @returns {Promise<void>}
       */
      async sendMessage(messageData: CreateMessageRequest, authorId: string) {
        await this.performSendMessage(messageData, authorId);
      },

      /**
       * Entry point: Update existing message content
       * @async
       * @function updateMessage
       * @param {string} messageId - Message ID to update
       * @param {string} content - New message content
       * @returns {Promise<void>}
       */
      async updateMessage(messageId: string, content: string) {
        await this.performUpdateMessage(messageId, content);
      },

      /**
       * Entry point: Delete a message
       * @async
       * @function deleteMessage
       * @param {string} messageId - Message ID to delete
       * @returns {Promise<void>}
       */
      async deleteMessage(messageId: string) {
        await this.performDeleteMessage(messageId);
      },

      // === IMPLEMENTATION METHODS ===

      /**
       * Implementation: Send message to Firestore
       * @async
       * @function performSendMessage
       * @param {CreateMessageRequest} messageData - Message data to send
       * @param {string} authorId - ID of the message author
       * @returns {Promise<void>}
       */
      async performSendMessage(messageData: CreateMessageRequest, authorId: string) {
        patchState(store, { isLoading: true, error: null });
        try {
          const newMessage = this.buildMessageData(messageData, authorId);
          const docRef = await addDoc(messagesCollection, newMessage);
          const message = { ...newMessage, id: docRef.id };
          this.addMessageToState(message);
        } catch (error) {
          this.handleError(error, 'Failed to send message');
        }
      },

      /**
       * Implementation: Update message in Firestore
       * @async
       * @function performUpdateMessage
       * @param {string} messageId - Message ID to update
       * @param {string} content - New message content
       * @returns {Promise<void>}
       */
      async performUpdateMessage(messageId: string, content: string) {
        try {
          const messageDoc = doc(messagesCollection, messageId);
          const updates = buildMessageUpdate(content);
          await updateDoc(messageDoc, updates);
          this.updateMessageInState(messageId, { content, isEdited: true });
        } catch (error) {
          this.handleError(error, 'Failed to update message');
        }
      },

      /**
       * Implementation: Delete message in Firestore (soft delete)
       * @async
       * @function performDeleteMessage
       * @param {string} messageId - Message ID to delete
       * @returns {Promise<void>}
       */
      async performDeleteMessage(messageId: string) {
        try {
          const messageDoc = doc(messagesCollection, messageId);
          const deleteData = buildSoftDeleteData();
          await updateDoc(messageDoc, deleteData);
          this.updateMessageInState(messageId, { content: '[Message deleted]', isEdited: true });
        } catch (error) {
          this.handleError(error, 'Failed to delete message');
        }
      },

      // === HELPER FUNCTIONS ===

      /**
       * Build complete message data with timestamps
       * @function buildMessageData
       * @param {CreateMessageRequest} messageData - Basic message data
       * @param {string} authorId - ID of the message author
       * @returns {Omit<Message, 'id'>} Complete message data without ID
       */
      buildMessageData(messageData: CreateMessageRequest, authorId: string): Omit<Message, 'id'> {
        return {
          ...messageData,
          authorId,
          attachments: messageData.attachments || [],
          reactions: [],
          isEdited: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      },

      /**
       * Add new message to state
       * @function addMessageToState
       * @param {Message} message - Message to add
       */
      addMessageToState(message: Message) {
        patchState(store, {
          messages: prependItem(store.messages(), message),
          isLoading: false,
        });
      },

      /**
       * Update message in state
       * @function updateMessageInState
       * @param {string} messageId - Message ID to update
       * @param {Partial<Message>} updates - Updates to apply
       */
      updateMessageInState(messageId: string, updates: Partial<Message>) {
        const updatedMessages = updateItemInArray(store.messages(), messageId, updates);
        patchState(store, { messages: updatedMessages, error: null });
      },

      /**
       * Handle errors and update state
       * @function handleError
       * @param {unknown} error - Error object
       * @param {string} defaultMessage - Default error message
       */
      handleError(error: unknown, defaultMessage: string) {
        const errorMessage = getErrorMessage(error, defaultMessage);
        logError('MessageStore', error);
        patchState(store, { error: errorMessage, isLoading: false });
      },

      // === STATE MANAGEMENT HELPERS ===

      /**
       * Select message for detailed view
       * @function selectMessage
       * @param {Message | null} message - Message to select or null to deselect
       */
      selectMessage(message: Message | null) {
        patchState(store, { selectedMessage: message });
      },

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
       * Toggle reaction on a message
       * @function toggleReaction
       * @param {string} messageId - Message ID
       * @param {string} emojiId - Emoji ID
       * @param {string} userId - User ID who reacted
       */
      async toggleReaction(messageId: string, emojiId: string, userId: string) {
        const messageRef = reactionService.getMessageRef('messages', messageId);
        await reactionService.toggleReaction(messageRef, emojiId, userId);
      },
    };
  })
);
