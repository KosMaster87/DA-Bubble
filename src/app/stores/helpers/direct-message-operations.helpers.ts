/**
 * @fileoverview Direct Message CRUD Operations Helpers
 * @description Firestore write helpers for DM lifecycle and message mutations.
 * @module DirectMessageOperationsHelpers
 */

import {
  Firestore,
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from '@angular/fire/firestore';
import { DirectMessageConversation } from '@core/models/direct-message.model';

export interface DirectMessageFirestoreOps {
  doc: typeof doc;
  getDoc: typeof getDoc;
  setDoc: typeof setDoc;
  updateDoc: typeof updateDoc;
  deleteDoc: typeof deleteDoc;
  addDoc: typeof addDoc;
  collection: typeof collection;
  getDocs: typeof getDocs;
  serverTimestamp: typeof serverTimestamp;
  arrayUnion: typeof arrayUnion;
}

/**
 * Default Firestore operation adapters.
 *
 * Why this object exists:
 * Consumers can inject/mimic Firestore operations in tests while production keeps
 * the exact AngularFire implementations.
 */
export const directMessageFirestoreOps: DirectMessageFirestoreOps = {
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
};

/**
 * Create conversation document in Firestore
 * @description
 * Initializes unread counters for both participants at creation time so list rendering
 * never needs to branch on missing unread metadata.
 */
export const createConversationDoc = async (
  firestore: Firestore,
  conversationId: string,
  currentUserId: string,
  otherUserId: string,
  firestoreOps: DirectMessageFirestoreOps = directMessageFirestoreOps,
) => {
  await firestoreOps.setDoc(firestoreOps.doc(firestore, 'direct-messages', conversationId), {
    participants: [currentUserId, otherUserId].sort(),
    createdAt: firestoreOps.serverTimestamp(),
    lastMessageAt: firestoreOps.serverTimestamp(),
    lastMessageContent: '',
    lastMessageBy: '',
    unreadCount: { [currentUserId]: 0, [otherUserId]: 0 },
  });
};

/**
 * Build new conversation object for store
 * @description
 * Store-side shape mirrors Firestore defaults to keep optimistic state aligned with
 * eventual backend data.
 */
export const buildNewConversation = (
  conversationId: string,
  currentUserId: string,
  otherUserId: string,
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
 * @description
 * Conversation membership is denormalized onto both user docs so sidebar queries can
 * resolve DM lists without collection scans.
 */
export const updateBothUsersDirectMessages = async (
  firestore: Firestore,
  currentUserId: string,
  otherUserId: string,
  conversationId: string,
  firestoreOps: DirectMessageFirestoreOps = directMessageFirestoreOps,
) => {
  await Promise.all([
    firestoreOps.updateDoc(firestoreOps.doc(firestore, 'users', currentUserId), {
      directMessages: firestoreOps.arrayUnion(conversationId),
    }),
    firestoreOps.updateDoc(firestoreOps.doc(firestore, 'users', otherUserId), {
      directMessages: firestoreOps.arrayUnion(conversationId),
    }),
  ]);
};

/**
 * Check if user needs conversation re-added
 * @description
 * Handles edge cases where a conversation exists but one participant's user document
 * lost the reference.
 */
export const checkAndReaddConversation = async (
  firestore: Firestore,
  conversationId: string,
  currentUserId: string,
  firestoreOps: DirectMessageFirestoreOps = directMessageFirestoreOps,
): Promise<boolean> => {
  const currentUserSnap = await firestoreOps.getDoc(
    firestoreOps.doc(firestore, 'users', currentUserId),
  );
  if (currentUserSnap.exists()) {
    const userConversations = currentUserSnap.data()['directMessages'] || [];
    if (!userConversations.includes(conversationId)) {
      await firestoreOps.updateDoc(firestoreOps.doc(firestore, 'users', currentUserId), {
        directMessages: firestoreOps.arrayUnion(conversationId),
      });
      return true;
    }
  }
  return false;
};

/**
 * Send message to Firestore
 * @description
 * Writes baseline thread metadata (`threadCount`) with each message so thread-related
 * loaders can detect candidates cheaply.
 */
export const sendMessageToFirestore = async (
  firestore: Firestore,
  conversationId: string,
  authorId: string,
  content: string,
  mentionedUserIds: string[] = [],
  firestoreOps: DirectMessageFirestoreOps = directMessageFirestoreOps,
) => {
  const messagesRef = firestoreOps.collection(
    firestore,
    'direct-messages',
    conversationId,
    'messages',
  );
  await firestoreOps.addDoc(messagesRef, {
    authorId,
    content,
    mentionedUserIds,
    createdAt: firestoreOps.serverTimestamp(),
    updatedAt: firestoreOps.serverTimestamp(),
    isEdited: false,
    reactions: [],
    attachments: [],
    threadCount: 0,
  });
};

/**
 * Update conversation preview metadata
 * @description
 * Preview text is capped to keep list rows fast and predictable regardless of message length.
 */
export const updateConversationPreview = async (
  firestore: Firestore,
  conversationId: string,
  content: string,
  authorId: string,
  firestoreOps: DirectMessageFirestoreOps = directMessageFirestoreOps,
) => {
  const conversationSnap = await firestoreOps.getDoc(
    firestoreOps.doc(firestore, 'direct-messages', conversationId),
  );
  if (conversationSnap.exists()) {
    await firestoreOps.updateDoc(firestoreOps.doc(firestore, 'direct-messages', conversationId), {
      lastMessageContent: content.substring(0, 100),
      lastMessageBy: authorId,
    });
  }
};

/**
 * Delete message and its threads
 * @description
 * Thread subtree is removed explicitly because Firestore does not cascade deletes
 * from parent documents.
 */
export const deleteMessageWithThreads = async (
  firestore: Firestore,
  conversationId: string,
  messageId: string,
  firestoreOps: DirectMessageFirestoreOps = directMessageFirestoreOps,
) => {
  await firestoreOps.deleteDoc(
    firestoreOps.doc(firestore, `direct-messages/${conversationId}/messages/${messageId}`),
  );
  const threadsRef = firestoreOps.collection(
    firestore,
    `direct-messages/${conversationId}/messages/${messageId}/threads`,
  );
  const threadsSnapshot = await firestoreOps.getDocs(threadsRef);
  await Promise.all(threadsSnapshot.docs.map((doc) => firestoreOps.deleteDoc(doc.ref)));
};
