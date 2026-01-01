/**
 * @fileoverview Mailbox Store for DABubble Application
 * @description NgRx SignalStore for managing mailbox messages with Firestore integration
 * @module stores/mailbox
 */

import { computed, inject } from '@angular/core';
import { signalStore, withState, withMethods, withComputed, patchState } from '@ngrx/signals';
import {
  Firestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  QueryDocumentSnapshot,
  DocumentData,
  getDocs,
} from '@angular/fire/firestore';
import { MessageReaction, MessageAttachment } from '../core/models/message.model';

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
 * Convert Firestore document to MailboxMessage
 */
function convertToMailboxMessage(doc: QueryDocumentSnapshot<DocumentData>): MailboxMessage {
  const data = doc.data();
  return {
    id: doc.id,
    recipientId: data['recipientId'],
    authorId: data['authorId'],
    subject: data['subject'],
    content: data['content'],
    createdAt: data['createdAt']?.toDate() || new Date(),
    updatedAt: data['updatedAt']?.toDate() || new Date(),
    isRead: data['isRead'] || false,
    type: (data['type'] || 'user') as MailboxMessageType,
    reactions: data['reactions'] || [],
    attachments: data['attachments'] || [],
  };
}

/**
 * Mailbox management store with Firestore integration
 * Manages inbox messages for the current user
 */
export const MailboxStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    /**
     * Get unread message count
     */
    unreadCount: computed(() => store.messages().filter((m) => !m.isRead).length),

    /**
     * Get messages filtered by type
     */
    adminMessages: computed(() => store.messages().filter((m) => m.type === 'admin')),
    systemMessages: computed(() => store.messages().filter((m) => m.type === 'system')),
    userMessages: computed(() => store.messages().filter((m) => m.type === 'user')),

    /**
     * Get unread messages
     */
    unreadMessages: computed(() => store.messages().filter((m) => !m.isRead)),

    /**
     * Get read messages
     */
    readMessages: computed(() => store.messages().filter((m) => m.isRead)),
  })),
  withMethods((store) => {
    const firestore = inject(Firestore);
    let unsubscribe: (() => void) | null = null;

    return {
      /**
       * Set current user ID and load their mailbox
       */
      async setCurrentUser(userId: string): Promise<void> {
        if (store.currentUserId() === userId) return;

        // Unsubscribe from previous listener
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }

        patchState(store, { currentUserId: userId, loading: true, error: null });

        try {
          await this.loadMessages(userId);
        } catch (error) {
          console.error('Error setting current user:', error);
          patchState(store, {
            error: error instanceof Error ? error.message : 'Failed to load mailbox',
            loading: false,
          });
        }
      },

      /**
       * Load mailbox messages for a user with real-time updates
       */
      async loadMessages(userId: string): Promise<void> {
        if (!userId) {
          patchState(store, { messages: [], loading: false });
          return;
        }

        patchState(store, { loading: true, error: null });

        try {
          const messagesRef = collection(firestore, 'mailbox');
          const q = query(
            messagesRef,
            where('recipientId', '==', userId),
            orderBy('createdAt', 'desc')
          );

          // Set up real-time listener
          unsubscribe = onSnapshot(
            q,
            (snapshot) => {
              const messages = snapshot.docs.map(convertToMailboxMessage);
              patchState(store, { messages, loading: false, error: null });
            },
            (error) => {
              console.error('Error in mailbox listener:', error);
              patchState(store, {
                error: error.message,
                loading: false,
              });
            }
          );
        } catch (error) {
          console.error('Error loading mailbox messages:', error);
          patchState(store, {
            error: error instanceof Error ? error.message : 'Failed to load messages',
            loading: false,
          });
        }
      },

      /**
       * Send a mailbox message
       */
      async sendMessage(request: CreateMailboxMessageRequest): Promise<void> {
        patchState(store, { loading: true, error: null });

        try {
          const messagesRef = collection(firestore, 'mailbox');
          const now = Timestamp.now();

          await addDoc(messagesRef, {
            recipientId: request.recipientId,
            authorId: request.authorId,
            subject: request.subject,
            content: request.content,
            type: request.type,
            isRead: false,
            createdAt: now,
            updatedAt: now,
            reactions: [],
            attachments: [],
          });

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

      /**
       * Mark message as read
       */
      async markAsRead(messageId: string): Promise<void> {
        try {
          const messageRef = doc(firestore, 'mailbox', messageId);
          await updateDoc(messageRef, {
            isRead: true,
            updatedAt: Timestamp.now(),
          });
        } catch (error) {
          console.error('Error marking message as read:', error);
          patchState(store, {
            error: error instanceof Error ? error.message : 'Failed to update message',
          });
        }
      },

      /**
       * Mark message as unread
       */
      async markAsUnread(messageId: string): Promise<void> {
        try {
          const messageRef = doc(firestore, 'mailbox', messageId);
          await updateDoc(messageRef, {
            isRead: false,
            updatedAt: Timestamp.now(),
          });
        } catch (error) {
          console.error('Error marking message as unread:', error);
          patchState(store, {
            error: error instanceof Error ? error.message : 'Failed to update message',
          });
        }
      },

      /**
       * Mark all messages as read
       */
      async markAllAsRead(): Promise<void> {
        const unreadMessages = store.unreadMessages();
        if (unreadMessages.length === 0) return;

        patchState(store, { loading: true, error: null });

        try {
          const promises = unreadMessages.map((message) => this.markAsRead(message.id));
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

      /**
       * Delete a message
       */
      async deleteMessage(messageId: string): Promise<void> {
        patchState(store, { loading: true, error: null });

        try {
          const messageRef = doc(firestore, 'mailbox', messageId);
          await deleteDoc(messageRef);
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

      /**
       * Get message by ID
       */
      getMessageById(messageId: string): MailboxMessage | undefined {
        return store.messages().find((m) => m.id === messageId);
      },

      /**
       * Cleanup when user logs out
       */
      cleanup(): void {
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
        patchState(store, initialState);
      },
    };
  })
);
