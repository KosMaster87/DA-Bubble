/**
 * @fileoverview Core message management store with NgRx SignalStore
 * Provides state management for basic message CRUD operations,
 * message selection, and core message functionality.
 * @description This store handles core message operations including sending,
 * editing, deleting messages, and basic message state management.
 * @module MessageStore
 */

import { computed, inject } from '@angular/core';
import { addDoc, collection, doc, Firestore, updateDoc } from '@angular/fire/firestore';
import { CreateMessageRequest, Message } from '@core/models/message.model';
import { ReactionService } from '@core/services/reaction/reaction.service';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { getErrorMessage, logError } from '../helpers/shared-error.helpers';
import { buildMessageUpdate, buildSoftDeleteData } from '../helpers/shared-firestore.helpers';
import { prependItem, updateItemInArray } from '../helpers/shared-state.helpers';

// Export types for use in other modules
export type { CreateMessageRequest };

/**
 * State interface for core message management
 * @description Models the minimal state needed for basic message CRUD; channel-specific
 * and DM-specific message state live in their own dedicated stores.
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
 * @description Provides a deterministic starting point so the store behaves
 * identically after initialization and after a cleanup reset.
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
 * @description Provides a generic message store for contexts that are not
 * channel- or DM-specific, acting as a shared foundation for message mutations.
 * @constant {SignalStore}
 */
export const MessageStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((state) => {
    return {
      /**
       * Total number of messages in store
       * @description Exposes message count reactively so UI components can display
       * pagination hints without performing array operations themselves.
       * @returns {Signal<number>} Total message count
       */
      totalMessages: computed(() => state.messages().length),

      /**
       * Check if messages are currently loading
       * @description Aliases `isLoading` under a shorter name to reduce template
       * verbosity when checking loading state.
       * @returns {Signal<boolean>} Loading status
       */
      loading: computed(() => state.isLoading()),

      /**
       * Get current error message if any
       * @description Provides a named signal for error state so templates can bind
       * a descriptive property rather than the generic `error` signal.
       * @returns {Signal<string | null>} Error message or null
       */
      errorMessage: computed(() => state.error()),

      /**
       * Check if a message is currently selected
       * @description Derived boolean lets components toggle selection-dependent UI
       * without coupling to the raw `selectedMessage` nullable value.
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
       * @description Public facade that keeps the send contract stable while
       * `performSendMessage` handles the actual Firestore write and state update.
       * @async
       * @function sendMessage
       * @param {CreateMessageRequest} messageData - Message data to send
       * @param {string} authorId - ID of the message author
       * @returns {Promise<void>}
       */
      async sendMessage(messageData: CreateMessageRequest, authorId: string): Promise<void> {
        await this.performSendMessage(messageData, authorId);
      },

      /**
       * Entry point: Update existing message content
       * @description Thin wrapper that allows `updateMessage` to evolve internally
       * without changing the public interface consumed by components.
       * @async
       * @function updateMessage
       * @param {string} messageId - Message ID to update
       * @param {string} content - New message content
       * @returns {Promise<void>}
       */
      async updateMessage(messageId: string, content: string): Promise<void> {
        await this.performUpdateMessage(messageId, content);
      },

      /**
       * Entry point: Delete a message
       * @description Exposes deletion through the store API so components do not
       * need to know whether deletion is soft or hard.
       * @async
       * @function deleteMessage
       * @param {string} messageId - Message ID to delete
       * @returns {Promise<void>}
       */
      async deleteMessage(messageId: string): Promise<void> {
        await this.performDeleteMessage(messageId);
      },

      // === IMPLEMENTATION METHODS ===

      /**
       * Implementation: Send message to Firestore
       * @description Builds message data, executes the Firestore write, and applies
       * the local state update through the shared operation executor.
       * @async
       * @function performSendMessage
       * @param {CreateMessageRequest} messageData - Message data to send
       * @param {string} authorId - ID of the message author
       * @returns {Promise<void>}
       */
      async performSendMessage(messageData: CreateMessageRequest, authorId: string): Promise<void> {
        const newMessage = this.buildMessageData(messageData, authorId);
        await this.executeMessageOperation(
          async () => {
            const docRef = await addDoc(messagesCollection, newMessage);
            return this.buildStoredMessage(newMessage, docRef.id);
          },
          'Failed to send message',
          true,
          (message) => this.addMessageToState(message),
        );
      },

      /**
       * Implementation: Update message in Firestore
       * @description Applies an edit marker alongside the content change so consumers
       * can display an "edited" indicator without additional Firestore reads.
       * @async
       * @function performUpdateMessage
       * @param {string} messageId - Message ID to update
       * @param {string} content - New message content
       * @returns {Promise<void>}
       */
      async performUpdateMessage(messageId: string, content: string): Promise<void> {
        await this.executeMessageOperation(
          async () => {
            const messageDoc = doc(messagesCollection, messageId);
            await updateDoc(messageDoc, buildMessageUpdate(content));
          },
          'Failed to update message',
          false,
          () => this.updateMessageInState(messageId, { content, isEdited: true }),
        );
      },

      /**
       * Implementation: Delete message in Firestore (soft delete)
       * @description Uses a soft-delete pattern so message threads and reactions
       * remain structurally intact and the UI can render a placeholder.
       * @async
       * @function performDeleteMessage
       * @param {string} messageId - Message ID to delete
       * @returns {Promise<void>}
       */
      async performDeleteMessage(messageId: string): Promise<void> {
        await this.executeMessageOperation(
          async () => {
            const messageDoc = doc(messagesCollection, messageId);
            await updateDoc(messageDoc, buildSoftDeleteData());
          },
          'Failed to delete message',
          false,
          () =>
            this.updateMessageInState(messageId, { content: '[Message deleted]', isEdited: true }),
        );
      },

      // === HELPER FUNCTIONS ===

      /**
       * Build complete message data with timestamps
       * @description Centralizes message construction so timestamp and reaction
       * initialization are consistent across all send paths.
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
       * Build stored message with generated document ID.
       * @description Combines the pre-write message shape with the Firestore-generated
       * ID so the full message object is available for local state updates immediately.
       */
      buildStoredMessage(message: Omit<Message, 'id'>, id: string): Message {
        return { ...message, id };
      },

      /**
       * Add new message to state
       * @description Prepends the new message so it appears at the top of the list
       * immediately without waiting for a Firestore snapshot round-trip.
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
       * @description Applies an immutable partial update so only the targeted message
       * changes and signal consumers are not needlessly re-evaluated.
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
       * @description Logs the error with context and normalizes to a string so the
       * error display layer always receives a consistent, human-readable value.
       * @function handleError
       * @param {unknown} error - Error object
       * @param {string} defaultMessage - Default error message
       */
      handleError(error: unknown, defaultMessage: string) {
        const errorMessage = getErrorMessage(error, defaultMessage);
        logError('MessageStore', error);
        patchState(store, { error: errorMessage, isLoading: false });
      },

      /**
       * Execute shared message operation flow.
       * @description Centralizes loading-state lifecycle and error handling so
       * each message operation only contains its specific Firestore call.
       */
      async executeMessageOperation<T>(
        operation: () => Promise<T>,
        defaultMessage: string,
        withLoadingState: boolean,
        onSuccess?: (result: T) => void,
      ): Promise<void> {
        if (withLoadingState) {
          this.startMessageLoading();
        }

        try {
          const result = await operation();
          this.completeMessageOperation(result, withLoadingState, onSuccess);
        } catch (error) {
          this.handleError(error, defaultMessage);
        }
      },

      /**
       * Apply shared message operation success effects.
       * @description Calls optional success side-effects after a write so loading
       * state and state updates are applied in the correct sequence.
       */
      completeMessageOperation<T>(
        result: T,
        withLoadingState: boolean,
        onSuccess?: (result: T) => void,
      ): void {
        onSuccess?.(result);
        this.finishMessageLoading(withLoadingState);
      },

      /**
       * Start message write loading state.
       * @description Pairs with `finishMessageLoading` to bookend loading state for
       * operations that need a visible in-progress indicator.
       */
      startMessageLoading(): void {
        patchState(store, { isLoading: true, error: null });
      },

      /**
       * Finish message write loading state when applicable.
       * @description Guards the loading-state reset so only operations that set
       * loading=true also clear it, preventing unintended state resets.
       */
      finishMessageLoading(withLoadingState: boolean): void {
        if (withLoadingState) {
          patchState(store, { isLoading: false });
        }
      },

      // === STATE MANAGEMENT HELPERS ===

      /**
       * Select message for detailed view
       * @description Maintains selection state in the store rather than component
       * scope so multiple components can react to the same selected message.
       * @function selectMessage
       * @param {Message | null} message - Message to select or null to deselect
       */
      selectMessage(message: Message | null) {
        patchState(store, { selectedMessage: message });
      },

      /**
       * Set loading state
       * @description Allows external coordination of loading state when an operation
       * spans multiple store calls.
       * @function setLoading
       * @param {boolean} isLoading - Loading state
       */
      setLoading(isLoading: boolean) {
        patchState(store, { isLoading });
      },

      /**
       * Set error message
       * @description Allows components to surface errors from operations that bypass
       * the standard store error path.
       * @function setError
       * @param {string | null} error - Error message or null to clear
       */
      setError(error: string | null) {
        patchState(store, { error });
      },

      /**
       * Clear error message
       * @description Provides a named reset action so components can clear transient
       * errors after the user has acknowledged them.
       * @function clearError
       */
      clearError() {
        patchState(store, { error: null });
      },

      /**
       * Toggle reaction on a message
       * @description Delegates to `ReactionService` so the toggle logic and optimistic
       * update strategy are shared across all message types.
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
  }),
);
