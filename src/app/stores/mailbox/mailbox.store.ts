/**
 * @fileoverview Mailbox Store for DABubble Application
 * @description NgRx SignalStore for managing mailbox messages with Firestore integration
 * @module stores/mailbox
 */

import { computed, inject } from '@angular/core';
import { DocumentData, Firestore, QuerySnapshot } from '@angular/fire/firestore';
import { MessageAttachment, MessageReaction } from '@core/models/message.model';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { setupMailboxListener } from '../helpers/mailbox-listener.helpers';
import {
  deleteMailboxMessage,
  sendMailboxMessage,
  updateMessageReadStatus,
} from '../helpers/mailbox-operations.helpers';
import {
  cleanupListener,
  countUnreadMessages,
  filterByType,
  findMessageById,
  getUnreadMessages,
} from '../helpers/mailbox-state.helpers';
import {
  isMissingIndexError,
  isPermissionDeniedError,
  logMissingIndexError,
  mapMailboxMessage,
} from '../helpers/mailbox-store.helpers';
import { getErrorMessage, logError } from '../helpers/shared-error.helpers';

/**
 * Mailbox message type definition
 */
export type MailboxMessageType = 'user' | 'admin' | 'system';

/**
 * Mailbox message interface
 */
export interface MailboxMessage {
  id: string;
  recipientId: string; // User ID who receives this message
  authorId: string; // User ID who sent this message
  subject: string;
  content: string;
  isRead: boolean;
  type: MailboxMessageType;
  createdAt: Date;
  updatedAt: Date;
  reactions: MessageReaction[];
  attachments: MessageAttachment[];
}

/**
 * Request interface for creating a mailbox message
 */
export interface CreateMailboxMessageRequest {
  recipientId: string;
  authorId: string;
  subject: string;
  content: string;
  type: MailboxMessageType;
}

/**
 * State interface for MailboxStore
 */
export interface MailboxState {
  messages: MailboxMessage[];
  loading: boolean;
  error: string | null;
  currentUserId: string | null;
}

/**
 * Initial state
 */
const initialState: MailboxState = {
  messages: [],
  loading: false,
  error: null,
  currentUserId: null,
};

/**
 * Mailbox management store with Firestore integration
 * Manages inbox messages for the current user
 */
export const MailboxStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    unreadCount: computed(() => countUnreadMessages(store.messages())),
    adminMessages: computed(() => filterByType(store.messages(), 'admin')),
    systemMessages: computed(() => filterByType(store.messages(), 'system')),
    userMessages: computed(() => filterByType(store.messages(), 'user')),
    unreadMessages: computed(() => getUnreadMessages(store.messages())),
    readMessages: computed(() => store.messages().filter((m) => m.isRead)),
  })),
  withMethods((store) => {
    const firestore = inject(Firestore);
    let unsubscribe: (() => void) | null = null;

    const handleSnapshot = (snapshot: QuerySnapshot<DocumentData>): void => {
      const messages = snapshot.docs.map(mapMailboxMessage);
      patchState(store, { messages, loading: false, error: null });
    };

    const resetMailboxSubscription = (): void => {
      cleanupListener(unsubscribe);
      unsubscribe = null;
    };

    const handleListenerError = (error: unknown): void => {
      if (isPermissionDeniedError(error)) {
        console.log('🔓 Permission error detected - cleaning up mailbox subscription');
        resetMailboxSubscription();
        patchState(store, initialState);
        return;
      }
      logError('Mailbox listener', error);
      if (isMissingIndexError(error)) {
        logMissingIndexError(error);
      }
      patchState(store, {
        error: getErrorMessage(error, 'Failed to load mailbox'),
        loading: false,
      });
    };

    const handleSetUserError = (error: unknown) => {
      logError('setCurrentUser', error);
      patchState(store, {
        error: getErrorMessage(error, 'Failed to load mailbox'),
        loading: false,
      });
    };

    const handleLoadMessagesError = (error: unknown) => {
      logError('loadMessages', error);
      patchState(store, {
        error: getErrorMessage(error, 'Failed to load messages'),
        loading: false,
      });
    };

    return {
      async setCurrentUser(userId: string): Promise<void> {
        if (store.currentUserId() === userId) return;
        resetMailboxSubscription();
        patchState(store, { currentUserId: userId, loading: true, error: null });
        try {
          await this.loadMessages(userId);
        } catch (error) {
          handleSetUserError(error);
        }
      },

      async loadMessages(userId: string): Promise<void> {
        if (!userId) {
          patchState(store, { messages: [], loading: false });
          return;
        }
        patchState(store, { loading: true, error: null });
        try {
          unsubscribe = setupMailboxListener(
            firestore,
            userId,
            (snapshot) => handleSnapshot(snapshot),
            (error) => handleListenerError(error),
          );
        } catch (error) {
          handleLoadMessagesError(error);
        }
      },

      async sendMessage(request: CreateMailboxMessageRequest): Promise<void> {
        await this.executeMailboxOperation(
          () => sendMailboxMessage(firestore, request),
          'sendMessage',
          'Failed to send message',
          true,
        );
      },

      async markAsRead(messageId: string): Promise<void> {
        await this.executeMailboxOperation(
          () => updateMessageReadStatus(firestore, messageId, true),
          'markAsRead',
          'Failed to update message',
        );
      },

      async markAsUnread(messageId: string): Promise<void> {
        await this.executeMailboxOperation(
          () => updateMessageReadStatus(firestore, messageId, false),
          'markAsUnread',
          'Failed to update message',
        );
      },

      async markAllAsRead(): Promise<void> {
        const unreadMessages = store.unreadMessages();
        if (unreadMessages.length === 0) return;
        await this.executeMailboxOperation(
          () =>
            Promise.all(
              unreadMessages.map((msg) => updateMessageReadStatus(firestore, msg.id, true)),
            ).then(() => undefined),
          'markAllAsRead',
          'Failed to mark all as read',
          true,
        );
      },

      async deleteMessage(messageId: string): Promise<void> {
        await this.executeMailboxOperation(
          () => deleteMailboxMessage(firestore, messageId),
          'deleteMessage',
          'Failed to delete message',
          true,
        );
      },

      /**
       * Execute shared mailbox operation flow.
       */
      async executeMailboxOperation(
        operation: () => Promise<void>,
        context: string,
        defaultMessage: string,
        withLoadingState = false,
      ): Promise<void> {
        if (withLoadingState) {
          patchState(store, { loading: true, error: null });
        }

        try {
          await operation();
          if (withLoadingState) {
            patchState(store, { loading: false });
          }
        } catch (error) {
          logError(context, error);
          patchState(store, {
            error: getErrorMessage(error, defaultMessage),
            loading: withLoadingState ? false : store.loading(),
          });
          if (withLoadingState) {
            throw error;
          }
        }
      },

      getMessageById(messageId: string): MailboxMessage | undefined {
        return findMessageById(store.messages(), messageId);
      },

      cleanup(): void {
        resetMailboxSubscription();
        patchState(store, initialState);
      },
    };
  }),
);
