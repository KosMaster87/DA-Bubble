/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at
 * https://firebase.google.com/docs/functions
 */

import { setGlobalOptions } from 'firebase-functions';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';

// Initialize Firebase Admin
admin.initializeApp();

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that
// can be running at the same time. This helps mitigate the impact of
// unexpected traffic spikes by instead downgrading performance. This
// limit is a per-function limit. You can override the limit for each
// function using the `maxInstances` option in the function's options,
// e.g. `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API.
// V1 functions should each use functions.runWith({ maxInstances: 10 })
// instead. In the v1 API, each function can only serve one request per
// container, so this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

/**
 * Scheduled function to detect and mark offline users
 * Runs every 5 minutes to check for stale heartbeats (optimized for cost)
 */
export const detectOfflineUsers = onSchedule(
  {
    schedule: 'every 5 minutes',
    timeZone: 'Europe/Berlin',
  },
  async () => {
    logger.info('🔍 Starting offline user detection');

    try {
      const db = admin.firestore();
      const now = admin.firestore.Timestamp.now();
      const fiveMinutesAgo = new Date(now.toMillis() - 5 * 60 * 1000);

      // Query all users marked as online
      const usersSnapshot = await db.collection('users').where('isOnline', '==', true).get();

      if (usersSnapshot.empty) {
        logger.info('✅ No online users found');
        return;
      }

      const batch = db.batch();
      let offlineCount = 0;

      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        const lastHeartbeat = userData.lastHeartbeat?.toDate();

        // If no heartbeat or heartbeat older than 5 minutes,
        // mark as offline
        if (!lastHeartbeat || lastHeartbeat < fiveMinutesAgo) {
          batch.update(doc.ref, {
            isOnline: false,
            lastSeen: lastHeartbeat || now,
          });
          offlineCount++;
          logger.info(`👋 Marking user ${doc.id} offline ` + `(last heartbeat: ${lastHeartbeat})`);
        }
      });

      if (offlineCount > 0) {
        await batch.commit();
        logger.info(`✅ Marked ${offlineCount} users as offline`);
      } else {
        logger.info('✅ All online users have recent heartbeats');
      }
    } catch (error) {
      logger.error('❌ Error detecting offline users:', error);
      throw error;
    }
  }
);

/**
 * Cloud Function: Update Channel lastMessageAt on new message
 * Triggers when a new message is created in a channel's messages
 * subcollection. Updates the parent channel document with the message
 * timestamp.
 */
export const updateChannelLastMessage = onDocumentCreated(
  {
    document: 'channels/{channelId}/messages/{messageId}',
    region: 'us-central1',
  },
  async (event) => {
    const channelId = event.params.channelId;
    const messageData = event.data?.data();

    if (!messageData) {
      logger.warn(`⚠️ No message data found for channel ${channelId}`);
      return;
    }

    try {
      logger.info(`🔔 Trigger fired for channel ${channelId}`);

      const channelRef = admin.firestore().collection('channels').doc(channelId);

      await channelRef.update({
        lastMessageAt: messageData.createdAt,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info(`✅ Updated lastMessageAt for channel ${channelId}`);
    } catch (error) {
      logger.error(`❌ Error updating channel ${channelId}:`, error);
      throw error;
    }
  }
);

/**
 * Cloud Function: Update Direct Message conversation lastMessageAt
 * Triggers when a new message is created in a direct-message
 * conversation's messages subcollection. Updates the parent conversation
 * document with the message timestamp.
 */
export const updateDirectMessageLastMessage = onDocumentCreated(
  {
    document: 'direct-messages/{conversationId}/messages/{messageId}',
    region: 'us-central1',
  },
  async (event) => {
    const conversationId = event.params.conversationId;
    const messageData = event.data?.data();

    if (!messageData) {
      logger.warn(`⚠️ No message data found for conversation ${conversationId}`);
      return;
    }

    try {
      logger.info(`🔔 Trigger fired for conversation ${conversationId}`);

      const conversationRef = admin.firestore().collection('direct-messages').doc(conversationId);

      await conversationRef.update({
        lastMessageAt: messageData.createdAt,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info(`✅ Updated lastMessageAt for conversation ${conversationId}`);
    } catch (error) {
      logger.error(`❌ Error updating conversation ${conversationId}:`, error);
      throw error;
    }
  }
);

/**
 * Cloud Function: Update parent Message when thread message is created
 * Triggers when a thread message is created in a channel. Updates the parent
 * message's lastThreadTimestamp and threadCount but NOT the channel's
 * lastMessageAt to avoid marking the entire channel as unread.
 */
export const updateChannelOnThreadMessage = onDocumentCreated(
  {
    document: 'channels/{channelId}/messages/{messageId}/threads/{threadId}',
    region: 'us-central1',
  },
  async (event) => {
    const channelId = event.params.channelId;
    const messageId = event.params.messageId;
    const threadData = event.data?.data();

    if (!threadData) {
      logger.warn(`⚠️ No thread data found for message ${messageId}`);
      return;
    }

    try {
      logger.info(`🔔 Thread created in channel ${channelId}, ` + `message ${messageId}`);

      const messageRef = admin
        .firestore()
        .collection('channels')
        .doc(channelId)
        .collection('messages')
        .doc(messageId);

      await messageRef.update({
        lastThreadTimestamp: threadData.createdAt,
        threadCount: admin.firestore.FieldValue.increment(1),
      });

      logger.info(`✅ Updated message ${messageId} thread metadata`);
    } catch (error) {
      logger.error(`❌ Error updating message ${messageId} thread:`, error);
      throw error;
    }
  }
);

/**
 * Cloud Function: Update parent Message when thread message is created in DM
 * Triggers when a thread message is created in a DM. Updates the parent
 * message's lastThreadTimestamp and threadCount but NOT the conversation's
 * lastMessageAt to avoid marking the entire conversation as unread.
 */
export const updateDirectMessageOnThreadMessage = onDocumentCreated(
  {
    document: 'direct-messages/{conversationId}/messages/{messageId}/' + 'threads/{threadId}',
    region: 'us-central1',
  },
  async (event) => {
    const conversationId = event.params.conversationId;
    const messageId = event.params.messageId;
    const threadData = event.data?.data();

    if (!threadData) {
      logger.warn(`⚠️ No thread data found for message ${messageId}`);
      return;
    }

    try {
      logger.info(`🔔 Thread created in conversation ${conversationId}, ` + `message ${messageId}`);

      const messageRef = admin
        .firestore()
        .collection('direct-messages')
        .doc(conversationId)
        .collection('messages')
        .doc(messageId);

      await messageRef.update({
        lastThreadTimestamp: threadData.createdAt,
        threadCount: admin.firestore.FieldValue.increment(1),
      });

      logger.info(`✅ Updated message ${messageId} thread metadata`);
    } catch (error) {
      logger.error(`❌ Error updating message ${messageId} thread:`, error);
      throw error;
    }
  }
);

/**
 * Scheduled function to cleanup expired guest users
 * Runs every 15 minutes to delete guest users whose session has expired
 * Guest users have a 1-hour session limit set in expiresAt field
 */
export const cleanupExpiredGuests = onSchedule(
  {
    schedule: 'every 15 minutes',
    timeZone: 'Europe/Berlin',
  },
  async () => {
    logger.info('🧹 Starting expired guest user cleanup');

    try {
      const db = admin.firestore();
      const now = admin.firestore.Timestamp.now();

      // Find all guest users whose session has expired
      const expiredGuestsQuery = db
        .collection('users')
        .where('isGuest', '==', true)
        .where('expiresAt', '<=', now.toDate());

      const expiredGuestsSnapshot = await expiredGuestsQuery.get();

      if (expiredGuestsSnapshot.empty) {
        logger.info('✅ No expired guest users found');
        return;
      }

      logger.info(`🗑️ Found ${expiredGuestsSnapshot.size} expired guest users`);

      const batch = db.batch();
      const deleteAuthPromises: Promise<void>[] = [];

      for (const doc of expiredGuestsSnapshot.docs) {
        const guestData = doc.data();
        const guestId = doc.id;

        logger.info(`Deleting guest user: ${guestId} (${guestData.displayName})`);

        // Delete Firestore user document
        batch.delete(doc.ref);

        // Delete from Firebase Auth (async)
        deleteAuthPromises.push(
          admin
            .auth()
            .deleteUser(guestId)
            .then(() => {
              logger.info(`✅ Deleted auth account: ${guestId}`);
            })
            .catch((error) => {
              logger.warn(`⚠️ Could not delete auth account ${guestId}:`, error);
            })
        );

        // Optional: Delete guest user's DMs and remove from channels
        // This helps keep the database clean
        try {
          // Remove from all channels
          if (guestData.channels && Array.isArray(guestData.channels)) {
            for (const channelId of guestData.channels) {
              const channelRef = db.collection('channels').doc(channelId);
              batch.update(channelRef, {
                members: admin.firestore.FieldValue.arrayRemove(guestId),
                updatedAt: now.toDate(),
              });
            }
          }

          // Delete Notes DM (self-conversation)
          const notesDmId = `${guestId}_${guestId}`;
          const notesDmRef = db.collection('directMessages').doc(notesDmId);
          batch.delete(notesDmRef);
        } catch (cleanupError) {
          logger.warn(`⚠️ Error cleaning up guest ${guestId} data:`, cleanupError);
        }
      }

      // Commit all Firestore deletions
      await batch.commit();
      logger.info('✅ Committed batch delete for ' + `${expiredGuestsSnapshot.size} guest users`);

      // Wait for all Auth deletions to complete
      await Promise.allSettled(deleteAuthPromises);

      logger.info(
        '🎉 Cleanup complete: Deleted ' + `${expiredGuestsSnapshot.size} expired guest users`
      );
    } catch (error) {
      logger.error('❌ Error during guest user cleanup:', error);
      throw error;
    }
  }
);
