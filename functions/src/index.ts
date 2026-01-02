/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { setGlobalOptions } from 'firebase-functions';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';

// Initialize Firebase Admin
admin.initializeApp();

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

/**
 * Scheduled function to detect and mark offline users
 * Runs every 2 minutes to check for stale heartbeats
 */
export const detectOfflineUsers = onSchedule(
  {
    schedule: 'every 2 minutes',
    timeZone: 'Europe/Berlin',
  },
  async () => {
    logger.info('🔍 Starting offline user detection');

    try {
      const db = admin.firestore();
      const now = admin.firestore.Timestamp.now();
      const oneMinuteAgo = new Date(now.toMillis() - 60 * 1000);

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

        // If no heartbeat or heartbeat older than 1 minute,
        // mark as offline
        if (!lastHeartbeat || lastHeartbeat < oneMinuteAgo) {
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
