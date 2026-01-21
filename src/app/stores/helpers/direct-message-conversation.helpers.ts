/**
 * @fileoverview DirectMessage conversation management helpers
 * @description Helper functions for creating and managing conversations
 * @module DirectMessageConversationHelpers
 */

import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { DirectMessageConversation } from '@core/models/direct-message.model';
import { mapConversation } from './direct-message-store.helpers';
import {
  createConversationDoc,
  buildNewConversation,
  updateBothUsersDirectMessages,
  checkAndReaddConversation,
} from './direct-message-operations.helpers';

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
  existingConversations: DirectMessageConversation[]
): Promise<DirectMessageConversation[]> => {
  await createConversationDoc(firestore, conversationId, currentUserId, otherUserId);
  const newConversation = buildNewConversation(conversationId, currentUserId, otherUserId);
  await updateBothUsersDirectMessages(firestore, currentUserId, otherUserId, conversationId);
  return [...existingConversations, newConversation];
};

/**
 * Re-add conversation if needed
 * @param {Firestore} firestore - Firestore instance
 * @param {string} conversationId - Conversation ID
 * @param {any} conversationSnap - Firestore snapshot
 * @param {string} currentUserId - Current user ID
 * @param {DirectMessageConversation[]} existingConversations - Current conversations
 * @returns {Promise<DirectMessageConversation[]>} Updated conversations
 */
export const readdConversationIfNeeded = async (
  firestore: Firestore,
  conversationId: string,
  conversationSnap: any,
  currentUserId: string,
  existingConversations: DirectMessageConversation[]
): Promise<DirectMessageConversation[]> => {
  const wasReadded = await checkAndReaddConversation(firestore, conversationId, currentUserId);
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
  existingConversations: DirectMessageConversation[]
): Promise<{
  conversations: DirectMessageConversation[];
  result: { id: string; participants: [string, string] };
}> => {
  const conversationRef = doc(firestore, 'direct-messages', conversationId);
  const conversationSnap = await getDoc(conversationRef);

  let conversations = existingConversations;

  if (!conversationSnap.exists()) {
    conversations = await createNewConversation(
      firestore,
      conversationId,
      currentUserId,
      otherUserId,
      existingConversations
    );
  } else {
    conversations = await readdConversationIfNeeded(
      firestore,
      conversationId,
      conversationSnap,
      currentUserId,
      existingConversations
    );
  }

  return {
    conversations,
    result: {
      id: conversationId,
      participants: [currentUserId, otherUserId].sort() as [string, string],
    },
  };
};
