/**
 * @fileoverview DirectMessage conversation management helpers
 * @description Helper functions for creating and managing conversations
 * @module DirectMessageConversationHelpers
 */

import { DocumentData, Firestore, QueryDocumentSnapshot } from '@angular/fire/firestore';
import { DirectMessageConversation } from '@core/models/direct-message.model';
import {
  buildNewConversation,
  checkAndReaddConversation,
  createConversationDoc,
  directMessageFirestoreOps,
  updateBothUsersDirectMessages,
  type DirectMessageFirestoreOps,
} from './direct-message-operations.helpers';
import { mapConversation } from './direct-message-store.helpers';

interface StartOrResumeConversationResult {
  conversations: DirectMessageConversation[];
  result: { id: string; participants: [string, string] };
}

const buildSortedParticipants = (firstUserId: string, secondUserId: string): [string, string] => {
  return firstUserId <= secondUserId ? [firstUserId, secondUserId] : [secondUserId, firstUserId];
};

/**
 * Create new conversation
 * @param {Firestore} firestore - Firestore instance
 * @param {string} conversationId - Conversation ID
 * @param {string} currentUserId - Current user ID
 * @param {string} otherUserId - Other user ID
 * @param {DirectMessageConversation[]} existingConversations - Current conversations
 * @returns {Promise<DirectMessageConversation[]>} Updated conversations
 */
export const createNewConversation = async (
  firestore: Firestore,
  conversationId: string,
  currentUserId: string,
  otherUserId: string,
  existingConversations: DirectMessageConversation[],
  firestoreOps: DirectMessageFirestoreOps = directMessageFirestoreOps,
): Promise<DirectMessageConversation[]> => {
  await createConversationDoc(firestore, conversationId, currentUserId, otherUserId, firestoreOps);
  const newConversation = buildNewConversation(conversationId, currentUserId, otherUserId);
  await updateBothUsersDirectMessages(
    firestore,
    currentUserId,
    otherUserId,
    conversationId,
    firestoreOps,
  );
  return [...existingConversations, newConversation];
};

/**
 * Re-add conversation if needed
 * @param {Firestore} firestore - Firestore instance
 * @param {string} conversationId - Conversation ID
 * @param {QueryDocumentSnapshot<DocumentData>} conversationSnap - Firestore snapshot
 * @param {string} currentUserId - Current user ID
 * @param {DirectMessageConversation[]} existingConversations - Current conversations
 * @returns {Promise<DirectMessageConversation[]>} Updated conversations
 */
export const readdConversationIfNeeded = async (
  firestore: Firestore,
  conversationId: string,
  conversationSnap: QueryDocumentSnapshot<DocumentData>,
  currentUserId: string,
  existingConversations: DirectMessageConversation[],
  firestoreOps: DirectMessageFirestoreOps = directMessageFirestoreOps,
): Promise<DirectMessageConversation[]> => {
  const wasReadded = await checkAndReaddConversation(
    firestore,
    conversationId,
    currentUserId,
    firestoreOps,
  );
  const conversationExists = existingConversations.some((c) => c.id === conversationId);
  if (wasReadded && !conversationExists) {
    return [...existingConversations, mapConversation(conversationSnap)];
  }
  return existingConversations;
};

/**
 * Start or resume conversation with user
 * @param {Firestore} firestore - Firestore instance
 * @param {string} conversationId - Conversation ID
 * @param {string} currentUserId - Current user ID
 * @param {string} otherUserId - Other user ID
 * @param {DirectMessageConversation[]} existingConversations - Current conversations
 * @returns {Promise<{conversations: DirectMessageConversation[]; result: {id: string; participants: [string, string]}}>}
 */
export const startOrResumeConversation = async (
  firestore: Firestore,
  conversationId: string,
  currentUserId: string,
  otherUserId: string,
  existingConversations: DirectMessageConversation[],
  firestoreOps: DirectMessageFirestoreOps = directMessageFirestoreOps,
): Promise<StartOrResumeConversationResult> => {
  const conversationRef = firestoreOps.doc(firestore, 'direct-messages', conversationId);
  const conversationSnap = await firestoreOps.getDoc(conversationRef);

  let conversations = existingConversations;

  if (!conversationSnap.exists()) {
    conversations = await createNewConversation(
      firestore,
      conversationId,
      currentUserId,
      otherUserId,
      existingConversations,
      firestoreOps,
    );
  } else {
    conversations = await readdConversationIfNeeded(
      firestore,
      conversationId,
      conversationSnap,
      currentUserId,
      existingConversations,
      firestoreOps,
    );
  }

  return {
    conversations,
    result: {
      id: conversationId,
      participants: buildSortedParticipants(currentUserId, otherUserId),
    },
  };
};
