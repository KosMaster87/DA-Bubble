/**
 * @fileoverview Direct Message CRUD Operations Helpers
 * @module DirectMessageOperationsHelpers
 */

import {
  Firestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  collection,
  getDocs,
  serverTimestamp,
  arrayUnion,
} from '@angular/fire/firestore';
import { DirectMessageConversation } from '@core/models/direct-message.model';
import { mapConversation } from './direct-message-store.helpers';

/**
 * Create conversation document in Firestore
 */
export const createConversationDoc = async (
  firestore: Firestore,
  conversationId: string,
  currentUserId: string,
  otherUserId: string
) => {
  await setDoc(doc(firestore, 'direct-messages', conversationId), {
    participants: [currentUserId, otherUserId].sort(),
    createdAt: serverTimestamp(),
    lastMessageAt: serverTimestamp(),
    lastMessageContent: '',
    lastMessageBy: '',
    unreadCount: { [currentUserId]: 0, [otherUserId]: 0 },
  });
};

/**
 * Build new conversation object for store
 */
export const buildNewConversation = (
  conversationId: string,
  currentUserId: string,
  otherUserId: string
): DirectMessageConversation => ({
  id: conversationId,
  participants: [currentUserId, otherUserId].sort() as [string, string],
  createdAt: new Date(),
  lastMessageAt: new Date(),
  lastMessageContent: '',
  lastMessageBy: '',
  unreadCount: { [currentUserId]: 0, [otherUserId]: 0 },
});

/**
 * Update both users' directMessages arrays
 */
export const updateBothUsersDirectMessages = async (
  firestore: Firestore,
  currentUserId: string,
  otherUserId: string,
  conversationId: string
) => {
  await Promise.all([
    updateDoc(doc(firestore, 'users', currentUserId), {
      directMessages: arrayUnion(conversationId),
    }),
    updateDoc(doc(firestore, 'users', otherUserId), {
      directMessages: arrayUnion(conversationId),
    }),
  ]);
};

/**
 * Check if user needs conversation re-added
 */
export const checkAndReaddConversation = async (
  firestore: Firestore,
  conversationId: string,
  currentUserId: string
): Promise<boolean> => {
  const currentUserSnap = await getDoc(doc(firestore, 'users', currentUserId));
  if (currentUserSnap.exists()) {
    const userConversations = currentUserSnap.data()['directMessages'] || [];
    if (!userConversations.includes(conversationId)) {
      await updateDoc(doc(firestore, 'users', currentUserId), {
        directMessages: arrayUnion(conversationId),
      });
      return true;
    }
  }
  return false;
};

/**
 * Send message to Firestore
 */
export const sendMessageToFirestore = async (
  firestore: Firestore,
  conversationId: string,
  authorId: string,
  content: string,
  mentionedUserIds: string[] = []
) => {
  const messagesRef = collection(firestore, 'direct-messages', conversationId, 'messages');
  await addDoc(messagesRef, {
    authorId,
    content,
    mentionedUserIds,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    isEdited: false,
    reactions: [],
    attachments: [],
    threadCount: 0,
  });
};

/**
 * Update conversation preview metadata
 */
export const updateConversationPreview = async (
  firestore: Firestore,
  conversationId: string,
  content: string,
  authorId: string
) => {
  const conversationSnap = await getDoc(doc(firestore, 'direct-messages', conversationId));
  if (conversationSnap.exists()) {
    await updateDoc(doc(firestore, 'direct-messages', conversationId), {
      lastMessageContent: content.substring(0, 100),
      lastMessageBy: authorId,
    });
  }
};

/**
 * Delete message and its threads
 */
export const deleteMessageWithThreads = async (
  firestore: Firestore,
  conversationId: string,
  messageId: string
) => {
  await deleteDoc(doc(firestore, `direct-messages/${conversationId}/messages/${messageId}`));
  const threadsRef = collection(
    firestore,
    `direct-messages/${conversationId}/messages/${messageId}/threads`
  );
  const threadsSnapshot = await getDocs(threadsRef);
  await Promise.all(threadsSnapshot.docs.map((doc) => deleteDoc(doc.ref)));
};
