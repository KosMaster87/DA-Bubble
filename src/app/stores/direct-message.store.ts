/**
 * @fileoverview Direct Message Store with proper conversation structure
 * Uses /direct-messages/{conversationId}/messages subcollection
 * @module DirectMessageStore
 */

import { computed, inject } from '@angular/core';
import { signalStore, withState, withMethods, withComputed, patchState } from '@ngrx/signals';
import {
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  Timestamp,
  Unsubscribe,
} from '@angular/fire/firestore';
import {
  DirectMessageConversation,
  DirectMessage,
  getConversationId,
  getOtherParticipant,
} from '@core/models/direct-message.model';
import { ReactionService } from '@core/services/reaction/reaction.service';

/**
 * State interface
 */
export interface DirectMessageState {
  conversations: DirectMessageConversation[];
  messages: { [conversationId: string]: DirectMessage[] };
  activeConversationId: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: DirectMessageState = {
  conversations: [],
  messages: {},
  activeConversationId: null,
  isLoading: false,
  error: null,
};

/**
 * DirectMessageStore - manages DM conversations and messages
 */
export const DirectMessageStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    /**
     * Get conversations sorted by last message time
     */
    sortedConversations: computed(() => {
      return [...store.conversations()].sort(
        (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime()
      );
    }),

    /**
     * Get messages for active conversation
     */
    activeMessages: computed(() => {
      const activeId = store.activeConversationId();
      return activeId ? store.messages()[activeId] || [] : [];
    }),

    /**
     * Get active conversation
     */
    activeConversation: computed(() => {
      const activeId = store.activeConversationId();
      return store.conversations().find((c) => c.id === activeId) || null;
    }),
  })),
  withMethods((store) => {
    const firestore = inject(Firestore);
    const reactionService = inject(ReactionService);
    let conversationsUnsubscribe: Unsubscribe | null = null;
    let messagesUnsubscribers: Map<string, Unsubscribe> = new Map();

    return {
      /**
       * Load user's conversations
       * @param userConversationIds Array of conversation IDs from user.directMessages
       */
      async loadConversations(userConversationIds: string[]): Promise<void> {
        if (userConversationIds.length === 0) {
          patchState(store, { conversations: [], isLoading: false });
          return;
        }

        patchState(store, { isLoading: true, error: null });

        try {
          // Unsubscribe from previous listener if exists
          if (conversationsUnsubscribe) {
            conversationsUnsubscribe();
            conversationsUnsubscribe = null;
          }

          // Real-time listener for conversations
          const conversationsRef = collection(firestore, 'direct-messages');
          const q = query(conversationsRef, where('__name__', 'in', userConversationIds));

          conversationsUnsubscribe = onSnapshot(
            q,
            (snapshot) => {
              const conversations = snapshot.docs.map((doc) => {
                const data = doc.data();
                const createdAt = data['createdAt'] as Timestamp | null;
                const lastMessageAt = data['lastMessageAt'] as Timestamp | null;

                return {
                  id: doc.id,
                  participants: data['participants'] as [string, string],
                  createdAt: createdAt ? createdAt.toDate() : new Date(),
                  lastMessageAt: lastMessageAt ? lastMessageAt.toDate() : new Date(),
                  lastMessageContent: data['lastMessageContent'],
                  lastMessageBy: data['lastMessageBy'],
                  unreadCount: data['unreadCount'] || {},
                } as DirectMessageConversation;
              });

              patchState(store, { conversations, isLoading: false });
            },
            (error) => {
              console.error('Error loading conversations:', error);
              patchState(store, { error: error.message, isLoading: false });
            }
          );
        } catch (error: any) {
          console.error('Error setting up conversations listener:', error);
          patchState(store, { error: error.message, isLoading: false });
        }
      },

      /**
       * Load messages for a specific conversation
       * @param conversationId Conversation ID
       */
      async loadMessages(conversationId: string): Promise<void> {
        try {
          const messagesRef = collection(firestore, 'direct-messages', conversationId, 'messages');
          const q = query(messagesRef, orderBy('createdAt', 'asc')); // Ascending order - oldest first

          // Unsubscribe from previous listener if exists
          if (messagesUnsubscribers.has(conversationId)) {
            messagesUnsubscribers.get(conversationId)!();
          }

          // Real-time listener for messages
          const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
              const messages = snapshot.docs.map((doc) => {
                const data = doc.data();
                // Handle serverTimestamp() null values
                const createdAt = data['createdAt'] as Timestamp | null;
                const updatedAt = data['updatedAt'] as Timestamp | null;
                const editedAt = data['editedAt'] as Timestamp | null | undefined;
                const lastThreadTimestamp = data['lastThreadTimestamp'] as
                  | Timestamp
                  | null
                  | undefined;
                return {
                  id: doc.id,
                  authorId: data['authorId'],
                  content: data['content'],
                  createdAt: createdAt ? createdAt.toDate() : new Date(),
                  updatedAt: updatedAt ? updatedAt.toDate() : new Date(),
                  isEdited: data['isEdited'] || false,
                  editedAt: editedAt ? editedAt.toDate() : undefined,
                  reactions: data['reactions'] || [],
                  attachments: data['attachments'] || [],
                  threadCount: data['threadCount'] || 0,
                  lastThreadTimestamp: lastThreadTimestamp
                    ? lastThreadTimestamp.toDate()
                    : undefined,
                } as DirectMessage;
              });

              patchState(store, {
                messages: {
                  ...store.messages(),
                  [conversationId]: messages,
                },
              });
            },
            (error) => {
              console.error(`Error loading messages for ${conversationId}:`, error);
            }
          );

          messagesUnsubscribers.set(conversationId, unsubscribe);
        } catch (error: any) {
          console.error('Error loading messages:', error);
          patchState(store, { error: error.message });
        }
      },

      /**
       * Start or get existing conversation with another user
       * @param currentUserId Current user's UID
       * @param otherUserId Other user's UID
       * @returns Conversation data
       */
      async startConversation(
        currentUserId: string,
        otherUserId: string
      ): Promise<{ id: string; participants: [string, string] }> {
        const conversationId = getConversationId(currentUserId, otherUserId);
        const conversationRef = doc(firestore, 'direct-messages', conversationId);

        console.log('🔍 Starting conversation', {
          currentUserId,
          otherUserId,
          conversationId,
        });

        try {
          const conversationSnap = await getDoc(conversationRef);

          if (!conversationSnap.exists()) {
            console.log('📝 Creating new conversation:', conversationId);

            const now = new Date();

            // Create new conversation
            await setDoc(conversationRef, {
              participants: [currentUserId, otherUserId].sort(),
              createdAt: serverTimestamp(),
              lastMessageAt: serverTimestamp(),
              lastMessageContent: '',
              lastMessageBy: '',
              unreadCount: {
                [currentUserId]: 0,
                [otherUserId]: 0,
              },
            });

            console.log('✅ Conversation document created');

            // Immediately add to store (before listener fires)
            const newConversation: DirectMessageConversation = {
              id: conversationId,
              participants: [currentUserId, otherUserId].sort() as [string, string],
              createdAt: now,
              lastMessageAt: now,
              lastMessageContent: '',
              lastMessageBy: '',
              unreadCount: {
                [currentUserId]: 0,
                [otherUserId]: 0,
              },
            };

            patchState(store, {
              conversations: [...store.conversations(), newConversation],
            });

            console.log('✅ Conversation added to store immediately');

            // Update both users' directMessages arrays
            const currentUserRef = doc(firestore, 'users', currentUserId);
            const otherUserRef = doc(firestore, 'users', otherUserId);

            console.log('📝 Updating users directMessages arrays');

            await Promise.all([
              updateDoc(currentUserRef, { directMessages: arrayUnion(conversationId) }),
              updateDoc(otherUserRef, { directMessages: arrayUnion(conversationId) }),
            ]);

            console.log('✅ Users updated with conversation ID');
          } else {
            console.log('✅ Conversation already exists:', conversationId);

            // Check if conversation is in current user's directMessages array
            // If not (user left conversation before), re-add it
            const currentUserRef = doc(firestore, 'users', currentUserId);
            const currentUserSnap = await getDoc(currentUserRef);

            if (currentUserSnap.exists()) {
              const userData = currentUserSnap.data();
              const userConversations = userData['directMessages'] || [];

              if (!userConversations.includes(conversationId)) {
                console.log('🔄 Re-adding conversation to user directMessages array');
                await updateDoc(currentUserRef, {
                  directMessages: arrayUnion(conversationId),
                });
                console.log('✅ Conversation re-added to user');

                // Also add conversation to store immediately if not already there
                if (!store.conversations().find((c) => c.id === conversationId)) {
                  const conversationData = conversationSnap.data();
                  const existingConversation: DirectMessageConversation = {
                    id: conversationId,
                    participants: conversationData['participants'],
                    createdAt: (conversationData['createdAt'] as Timestamp)?.toDate() || new Date(),
                    lastMessageAt:
                      (conversationData['lastMessageAt'] as Timestamp)?.toDate() || new Date(),
                    lastMessageContent: conversationData['lastMessageContent'] || '',
                    lastMessageBy: conversationData['lastMessageBy'] || '',
                    unreadCount: conversationData['unreadCount'] || {
                      [currentUserId]: 0,
                      [otherUserId]: 0,
                    },
                  };

                  patchState(store, {
                    conversations: [...store.conversations(), existingConversation],
                  });

                  console.log('✅ Conversation added to store immediately');
                }
              }
            }
          }

          return {
            id: conversationId,
            participants: [currentUserId, otherUserId].sort() as [string, string],
          };
        } catch (error: any) {
          console.error('❌ Error starting conversation:', error);
          console.error('Error code:', error?.code);
          console.error('Error message:', error?.message);
          throw error;
        }
      },

      /**
       * Send a message in a conversation
       * @param conversationId Conversation ID
       * @param authorId Author's UID
       * @param content Message content
       */
      async sendMessage(conversationId: string, authorId: string, content: string): Promise<void> {
        try {
          const messagesRef = collection(firestore, 'direct-messages', conversationId, 'messages');

          // Add message
          await addDoc(messagesRef, {
            authorId,
            content,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            isEdited: false,
            reactions: [],
            attachments: [],
            threadCount: 0,
          });

          // Update conversation metadata
          const conversationRef = doc(firestore, 'direct-messages', conversationId);
          const conversationSnap = await getDoc(conversationRef);

          if (conversationSnap.exists()) {
            const data = conversationSnap.data();
            const participants = data['participants'] as string[];
            const otherParticipant = participants.find((uid) => uid !== authorId);

            if (otherParticipant) {
              await updateDoc(conversationRef, {
                lastMessageAt: serverTimestamp(),
                lastMessageContent: content.substring(0, 100), // Preview
                lastMessageBy: authorId,
                [`unreadCount.${otherParticipant}`]:
                  (data['unreadCount']?.[otherParticipant] || 0) + 1,
              });
            }
          }
        } catch (error: any) {
          console.error('Error sending message:', error);
          throw error;
        }
      },

      /**
       * Update a message in a conversation
       * @param conversationId Conversation ID
       * @param messageId Message ID to update
       * @param content New message content
       */
      async updateMessage(
        conversationId: string,
        messageId: string,
        content: string
      ): Promise<void> {
        try {
          const messageRef = doc(
            firestore,
            `direct-messages/${conversationId}/messages/${messageId}`
          );
          await updateDoc(messageRef, {
            content,
            isEdited: true,
            editedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          // onSnapshot listener will automatically update state
        } catch (error: any) {
          console.error('Error updating message:', error);
          throw error;
        }
      },

      /**
       * Set active conversation
       * @param conversationId Conversation ID or null
       */
      setActiveConversation(conversationId: string | null): void {
        patchState(store, { activeConversationId: conversationId });

        // Load messages if not loaded yet
        if (conversationId && !store.messages()[conversationId]) {
          this.loadMessages(conversationId);
        }
      },

      /**
       * Mark conversation as read
       * @param conversationId Conversation ID
       * @param userId Current user's UID
       */
      async markAsRead(conversationId: string, userId: string): Promise<void> {
        try {
          const conversationRef = doc(firestore, 'direct-messages', conversationId);
          await updateDoc(conversationRef, {
            [`unreadCount.${userId}`]: 0,
          });
        } catch (error: any) {
          console.error('Error marking conversation as read:', error);
        }
      },

      /**
       * Toggle reaction on a direct message
       * @param conversationId Conversation ID
       * @param messageId Message ID
       * @param emojiId Emoji ID
       * @param userId User ID who reacted
       */
      async toggleReaction(
        conversationId: string,
        messageId: string,
        emojiId: string,
        userId: string
      ): Promise<void> {
        const messageRef = reactionService.getMessageRef(
          'direct-messages',
          conversationId,
          'messages',
          messageId
        );
        await reactionService.toggleReaction(messageRef, emojiId, userId);
      },

      /**
       * Leave a conversation (remove from user's directMessages array)
       * @param conversationId Conversation ID
       * @param userId Current user's UID
       */
      async leaveConversation(conversationId: string, userId: string): Promise<void> {
        try {
          console.log('🚪 Leaving conversation:', { conversationId, userId });

          // Remove conversation ID from user's directMessages array
          const userRef = doc(firestore, 'users', userId);
          await updateDoc(userRef, {
            directMessages: arrayRemove(conversationId),
          });

          // Remove conversation from local state
          patchState(store, {
            conversations: store.conversations().filter((c) => c.id !== conversationId),
            messages: Object.fromEntries(
              Object.entries(store.messages()).filter(([id]) => id !== conversationId)
            ),
          });

          // If this was the active conversation, clear it
          if (store.activeConversationId() === conversationId) {
            patchState(store, { activeConversationId: null });
          }

          // Unsubscribe from messages listener
          if (messagesUnsubscribers.has(conversationId)) {
            messagesUnsubscribers.get(conversationId)!();
            messagesUnsubscribers.delete(conversationId);
          }

          console.log('✅ Successfully left conversation');
        } catch (error: any) {
          console.error('❌ Error leaving conversation:', error);
          patchState(store, { error: error.message });
          throw error;
        }
      },

      /**
       * Cleanup listeners
       */
      destroy(): void {
        if (conversationsUnsubscribe) {
          conversationsUnsubscribe();
        }
        messagesUnsubscribers.forEach((unsubscribe) => unsubscribe());
        messagesUnsubscribers.clear();
      },
    };
  })
);
