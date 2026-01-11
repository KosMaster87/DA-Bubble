import {onDocumentCreated} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

/**
 * Cloud Function: Update Channel on new message (Combined)
 * Triggers when a new message is created in a channel's messages subcollection.
 * Updates the parent channel document with:
 * - lastMessageAt timestamp
 * - unreadCount increment
 * - updatedAt timestamp
 *
 * This combines updateChannelLastMessage + incrementChannelUnreadCount
 * to reduce function calls and Firestore writes by 50%.
 */
export const updateChannelOnNewMessage = onDocumentCreated(
  {
    document: "channels/{channelId}/messages/{messageId}",
    region: "us-central1",
  },
  async (event) => {
    const channelId = event.params.channelId;
    const messageData = event.data?.data();

    if (!messageData) {
      logger.warn(`⚠️ No message data found for channel ${channelId}`);
      return;
    }

    try {
      logger.info(`🔔 Updating channel ${channelId} on new message`);

      const channelRef = admin
        .firestore()
        .collection("channels")
        .doc(channelId);

      await channelRef.update({
        lastMessageAt: messageData.createdAt,
        unreadCount: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info(
        `✅ Updated channel ${channelId}: lastMessageAt + unreadCount`
      );
    } catch (error) {
      logger.error(`❌ Error updating channel ${channelId}:`, error);
      throw error;
    }
  }
);

/**
 * Cloud Function: Update Channel lastMessageAt on new thread message
 * Triggers when a new thread reply is created in a channel.
 * Updates the parent channel's lastMessageAt to mark it as unread.
 */
export const updateChannelOnThreadMessage = onDocumentCreated(
  {
    document: "channels/{channelId}/messages/{messageId}/threads/{threadId}",
    region: "us-central1",
  },
  async (event) => {
    const channelId = event.params.channelId;
    const messageData = event.data?.data();

    if (!messageData) {
      logger.warn(
        `⚠️ No thread message data found for channel ${channelId}`
      );
      return;
    }

    try {
      logger.info(`🧵 Thread reply in channel ${channelId}`);

      const channelRef = admin
        .firestore()
        .collection("channels")
        .doc(channelId);

      await channelRef.update({
        lastMessageAt: messageData.createdAt,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info(
        `✅ Updated channel ${channelId} on thread reply`
      );
    } catch (error) {
      logger.error(`❌ Error updating channel ${channelId}:`, error);
      throw error;
    }
  }
);
