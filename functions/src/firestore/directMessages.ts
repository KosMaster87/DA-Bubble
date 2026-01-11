import {onDocumentCreated} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

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
      logger.warn(
        `⚠️ No message data found for conversation ${conversationId}`
      );
      return;
    }

    try {
      logger.info(`🔔 Updating DM ${conversationId} on new message`);

      const conversationRef = admin
        .firestore()
        .collection("direct-messages")
        .doc(conversationId);

      const authorId = messageData.authorId;

      // Get conversation to find the recipient
      const conversationDoc = await conversationRef.get();
      if (!conversationDoc.exists) {
        logger.warn(`⚠️ Conversation ${conversationId} not found`);
        return;
      }

      const participants = conversationDoc.data()?.participants || [];
      const recipientId = participants.find((id: string) => id !== authorId);

      if (!recipientId) {
        logger.warn(`⚠️ No recipient found for DM ${conversationId}`);
        return;
      }

      // Update lastMessageAt + unreadCount in one write
      await conversationRef.update({
        lastMessageAt: messageData.createdAt,
        [`unreadCount.${recipientId}`]: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info(
        `✅ Updated DM ${conversationId}: ` +
          `lastMessageAt + unreadCount for ${recipientId}`
      );
    } catch (error) {
      logger.error(`❌ Error updating conversation ${conversationId}:`, error);
      throw error;
    }
  }
);

/**
 * Cloud Function: Update DM lastMessageAt on new thread message
 * Triggers when a new thread reply is created in a DM conversation.
 * Updates the parent conversation's lastMessageAt.
 */
export const updateDirectMessageOnThreadMessage = onDocumentCreated(
  {
    document:
      "direct-messages/{conversationId}/messages/{messageId}/threads/{threadId}",
    region: "us-central1",
  },
  async (event) => {
    const conversationId = event.params.conversationId;
    const messageData = event.data?.data();

    if (!messageData) {
      logger.warn(
        `⚠️ No thread message data found for DM ${conversationId}`
      );
      return;
    }

    try {
      logger.info(`🧵 Thread reply in DM ${conversationId}`);

      const conversationRef = admin
        .firestore()
        .collection("direct-messages")
        .doc(conversationId);

      await conversationRef.update({
        lastMessageAt: messageData.createdAt,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info(
        `✅ Updated DM ${conversationId} on thread reply`
      );
    } catch (error) {
      logger.error(`❌ Error updating conversation ${conversationId}:`, error);
      throw error;
    }
  }
);
