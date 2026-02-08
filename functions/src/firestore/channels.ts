import {onDocumentCreated} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

/**
 * Get channel reference
 * @param {string} channelId - The channel ID
 * @return {admin.firestore.DocumentReference} Channel document reference
 */
const getChannelRef = (
  channelId: string
): admin.firestore.DocumentReference => {
  return admin.firestore().collection("channels").doc(channelId);
};

/**
 * Update channel with new message data
 * @param {admin.firestore.DocumentReference} channelRef - Channel reference
 * @param {admin.firestore.DocumentData} messageData - Message data
 * @return {Promise<void>} Promise that resolves when update completes
 */
const updateChannelOnMessage = async (
  channelRef: admin.firestore.DocumentReference,
  messageData: admin.firestore.DocumentData,
): Promise<void> => {
  await channelRef.update({
    lastMessageAt: messageData.createdAt,
    unreadCount: admin.firestore.FieldValue.increment(1),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
};

/**
 * Update channel on thread message
 * @param {admin.firestore.DocumentReference} channelRef - Channel reference
 * @param {admin.firestore.DocumentData} messageData - Thread message data
 * @return {Promise<void>} Promise that resolves when update completes
 */
const updateChannelOnThread = async (
  channelRef: admin.firestore.DocumentReference,
  messageData: admin.firestore.DocumentData,
): Promise<void> => {
  await channelRef.update({
    lastMessageAt: messageData.createdAt,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
};

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
    region: "europe-west1",
  },
  async (event) => {
    const channelId = event.params.channelId;
    const messageData = event.data?.data();

    if (!messageData) {
      logger.warn(`No message data for channel ${channelId}`);
      return;
    }

    try {
      const channelRef = getChannelRef(channelId);
      await updateChannelOnMessage(channelRef, messageData);
    } catch (error) {
      logger.error(`Error updating channel ${channelId}:`, error);
      throw error;
    }
  },
);

/**
 * Cloud Function: Update Channel lastMessageAt on new thread message
 * Triggers when a new thread reply is created in a channel.
 * Updates the parent channel's lastMessageAt to mark it as unread.
 */
export const updateChannelOnThreadMessage = onDocumentCreated(
  {
    document: "channels/{channelId}/messages/{messageId}/threads/{threadId}",
    region: "europe-west1",
  },
  async (event) => {
    const channelId = event.params.channelId;
    const messageData = event.data?.data();

    if (!messageData) {
      logger.warn(`No thread message data for channel ${channelId}`);
      return;
    }

    try {
      const channelRef = getChannelRef(channelId);
      await updateChannelOnThread(channelRef, messageData);
    } catch (error) {
      logger.error(`Error updating channel ${channelId}:`, error);
      throw error;
    }
  },
);
