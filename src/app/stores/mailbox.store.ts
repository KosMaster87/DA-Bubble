/**
 * @fileoverview Mailbox Store for DABubble Application
 * @description NgRx SignalStore for managing mailbox messages with Firestore integration
 * @module stores/mailbox
 */

import { computed, inject } from '@angular/core';
import { signalStore, withState, withMethods, withComputed, patchState } from '@ngrx/signals';
import { Firestore } from '@angular/fire/firestore';
import { MessageReaction, MessageAttachment } from '../core/models/message.model';
import { mapMailboxMessage } from './helpers/mailbox-store.helpers';
import { sendMailboxMessage, updateMessageReadStatus, deleteMailboxMessage } from './helpers/mailbox-operations.helpers';
import { setupMailboxListener } from './helpers/mailbox-listener.helpers';
import { filterByType, countUnreadMessages, findMessageById, getUnreadMessages, cleanupListener } from './helpers/mailbox-state.helpers';
import { isPermissionError, logError, getErrorMessage } from './helpers/shared-error.helpers';

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
interface MailboxState {
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

    const handleSnapshot = (snapshot: any) => {
      const messages = snapshot.docs.map(mapMailboxMessage);
      patchState(store, { messages, loading: false, error: null });
    };

    const handleListenerError = (error: any) => {
      if (isPermissionError(error)) {
        console.log('🔓 Permission error detected - cleaning up mailbox subscription');
        cleanupListener(unsubscribe);
        unsubscribe = null;
        patchState(store, initialState);
        return;
      }
      logError('Mailbox listener', error);
      if (error.code === 'failed-precondition' && error.message?.includes('index')) {
        console.error('❌ FIREBASE INDEX FEHLT!');
        console.error('📋 Bitte klicke auf diesen Link um den Index zu erstellen:');
        console.error(error.message);
        console.error('');
        console.error('ℹ️ Dies ist ein einmaliger Setup-Schritt (1 Klick).');
        console.error('   Nach der Index-Erstellung funktionieren Invitations automatisch.');
      }
      patchState(store, { error: error.message, loading: false });
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
        cleanupListener(unsubscribe);
        unsubscribe = null;
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
            (error) => handleListenerError(error)
          );
        } catch (error) {
          handleLoadMessagesError(error);
        }
      },

      async sendMessage(request: CreateMailboxMessageRequest): Promise<void> {
        patchState(store, { loading: true, error: null });
        try {
          await sendMailboxMessage(firestore, request);
          patchState(store, { loading: false });
        } catch (error) {
          console.error('Error sending mailbox message:', error);
          patchState(store, {
            error: error instanceof Error ? error.message : 'Failed to send message',
            loading: false,
          });
          throw error;
        }
      },

      async markAsRead(messageId: string): Promise<void> {
        try {
          await updateMessageReadStatus(firestore, messageId, true);
        } catch (error) {
          console.error('Error marking message as read:', error);
          patchState(store, {
            error: error instanceof Error ? error.message : 'Failed to update message',
          });
        }
      },

      async markAsUnread(messageId: string): Promise<void> {
        try {
          await updateMessageReadStatus(firestore, messageId, false);
        } catch (error) {
          console.error('Error marking message as unread:', error);
          patchState(store, {
            error: error instanceof Error ? error.message : 'Failed to update message',
          });
        }
      },

      async markAllAsRead(): Promise<void> {
        const unreadMessages = store.unreadMessages();
        if (unreadMessages.length === 0) return;
        patchState(store, { loading: true, error: null });
        try {
          const promises = unreadMessages.map((msg) => this.markAsRead(msg.id));
          await Promise.all(promises);
          patchState(store, { loading: false });
        } catch (error) {
          console.error('Error marking all as read:', error);
          patchState(store, {
            error: error instanceof Error ? error.message : 'Failed to mark all as read',
            loading: false,
          });
        }
      },

      async deleteMessage(messageId: string): Promise<void> {
        patchState(store, { loading: true, error: null });
        try {
          await deleteMailboxMessage(firestore, messageId);
          patchState(store, { loading: false });
        } catch (error) {
          console.error('Error deleting message:', error);
          patchState(store, {
            error: error instanceof Error ? error.message : 'Failed to delete message',
            loading: false,
          });
          throw error;
        }
      },

      getMessageById(messageId: string): MailboxMessage | undefined {
        return findMessageById(store.messages(), messageId);
      },

      cleanup(): void {
        cleanupListener(unsubscribe);
        unsubscribe = null;
        patchState(store, initialState);
      },
    };
  })
);
