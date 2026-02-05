import {onDocumentCreated} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

/**
 * Get conversation reference
 * @param {string} conversationId - The conversation ID
 * @return {admin.firestore.DocumentReference} Conversation reference
 */
const getConversationRef = (
  conversationId: string
): admin.firestore.DocumentReference => {
  return admin.firestore().collection("direct-messages").doc(conversationId);
};

/**
 * Fetch conversation document
 * @param {admin.firestore.DocumentReference} conversationRef - Reference
 * @return {Promise<admin.firestore.DocumentSnapshot>} Document snapshot
 */
const fetchConversation = async (
  conversationRef: admin.firestore.DocumentReference
): Promise<admin.firestore.DocumentSnapshot> => {
  return await conversationRef.get();
};

/**
 * Find recipient ID from participants
 * @param {string[]} participants - List of participant IDs
 * @param {string} authorId - Author ID to exclude
 * @return {string | undefined} Recipient ID or undefined
 */
const findRecipientId = (
  participants: string[],
  authorId: string
): string | undefined => {
  return participants.find((id: string) => id !== authorId);
};

/**
 * Update DM conversation with message data
 * @param {admin.firestore.DocumentReference} conversationRef - Reference
 * @param {admin.firestore.DocumentData} messageData - Message data
 * @param {string} recipientId - Recipient user ID
 * @return {Promise<void>} Promise that resolves when update completes
 */
const updateConversationOnMessage = async (
  conversationRef: admin.firestore.DocumentReference,
  messageData: admin.firestore.DocumentData,
  recipientId: string
): Promise<void> => {
  await conversationRef.update({
    lastMessageAt: messageData.createdAt,
    [`unreadCount.${recipientId}`]: admin.firestore.FieldValue.increment(1),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
};

/**
 * Update DM conversation on thread message
 * @param {admin.firestore.DocumentReference} conversationRef - Reference
 * @param {admin.firestore.DocumentData} messageData - Thread message data
 * @return {Promise<void>} Promise that resolves when update completes
 */
const updateConversationOnThread = async (
  conversationRef: admin.firestore.DocumentReference,
  messageData: admin.firestore.DocumentData
): Promise<void> => {
  await conversationRef.update({
    lastMessageAt: messageData.createdAt,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
};

/**
 * Validate and get conversation document
 * @param {string} conversationId - The conversation ID
 * @return {Promise<admin.firestore.DocumentSnapshot | null>} Document
 */
const getValidConversation = async (
  conversationId: string
): Promise<admin.firestore.DocumentSnapshot | null> => {
  const conversationRef = getConversationRef(conversationId);
  const conversationDoc = await fetchConversation(conversationRef);

  if (!conversationDoc.exists) {
    logger.warn(`Conversation ${conversationId} not found`);
    return null;
  }

  return conversationDoc;
};

/**
 * Get and validate recipient ID
 * @param {admin.firestore.DocumentSnapshot} conversationDoc - Document
 * @param {string} authorId - Author ID
 * @param {string} conversationId - Conversation ID
 * @return {string | null} Recipient ID or null
 */
const getValidRecipientId = (
  conversationDoc: admin.firestore.DocumentSnapshot,
  authorId: string,
  conversationId: string
): string | null => {
  const participants = conversationDoc.data()?.participants || [];
  const recipientId = findRecipientId(participants, authorId);

  if (!recipientId) {
    logger.warn(`No recipient found for DM ${conversationId}`);
    return null;
  }

  return recipientId;
};

/**
 * Process new DM message
 * @param {string} conversationId - The conversation ID
 * @param {admin.firestore.DocumentData} messageData - Message data
 * @return {Promise<void>} Promise that resolves when processed
 */
const processNewDMMessage = async (
  conversationId: string,
  messageData: admin.firestore.DocumentData
): Promise<void> => {
  const conversationDoc = await getValidConversation(conversationId);
  if (!conversationDoc) return;

  const recipientId = getValidRecipientId(
    conversationDoc,
    messageData.authorId,
    conversationId
  );
  if (!recipientId) return;

  const conversationRef = getConversationRef(conversationId);
  await updateConversationOnMessage(
    conversationRef,
    messageData,
    recipientId
  );
};

/**
 * Cloud Function: Update DM Conversation on new message (Combined)
 * Triggers when a new message is created in a direct-message
 * conversation's messages subcollection. Updates the parent conversation with:
 * - lastMessageAt timestamp
 * - unreadCount for recipient user
 * - updatedAt timestamp
 *
 * This combines updateDirectMessageLastMessage + incrementDMUnreadCount
 * to reduce function calls and Firestore writes by 50%.
 */
export const updateDMOnNewMessage = onDocumentCreated(
  {
    document: "direct-messages/{conversationId}/messages/{messageId}",
    region: "us-central1",
  },
  async (event) => {
    const conversationId = event.params.conversationId;
    const messageData = event.data?.data();

    if (!messageData) {
      logger.warn(`No message data for conversation ${conversationId}`);
      return;
    }

    try {
      await processNewDMMessage(conversationId, messageData);
    } catch (error) {
      logger.error(`Error updating conversation ${conversationId}:`, error);
      throw error;
    }
  }
);

/**
 * Cloud Function: Update DM lastMessageAt on new thread message
 * Triggers when a new thread reply is created in a DM conversation.
 * Updates the parent conversation's lastMessageAt.
 */
export const updateDMOnThreadMessage = onDocumentCreated(
  {
    document:
      "direct-messages/{conversationId}/messages/" +
      "{messageId}/threads/{threadId}",
    region: "us-central1",
  },
  async (event) => {
    const conversationId = event.params.conversationId;
    const messageData = event.data?.data();

    if (!messageData) {
      logger.warn(`No thread message data for DM ${conversationId}`);
      return;
    }

    try {
      const conversationRef = getConversationRef(conversationId);
      await updateConversationOnThread(conversationRef, messageData);
    } catch (error) {
      logger.error(`Error updating conversation ${conversationId}:`, error);
      throw error;
    }
  }
);
