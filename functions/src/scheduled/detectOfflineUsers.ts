import {onSchedule} from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

/**
 * Scheduled function to detect and mark offline users
 * Runs every 10 minutes to check for stale heartbeats (optimized for cost)
 */
export const detectOfflineUsers = onSchedule(
  {
    schedule: "every 10 minutes",
    timeZone: "Europe/Berlin",
  },
  async () => {
    logger.info("🔍 Starting offline user detection");

    try {
      const db = admin.firestore();
      const now = admin.firestore.Timestamp.now();
      const tenMinutesAgo = new Date(now.toMillis() - 10 * 60 * 1000);

      // Query all users marked as online
      const usersSnapshot = await db
        .collection("users")
        .where("isOnline", "==", true)
        .get();

      if (usersSnapshot.empty) {
        logger.info("✅ No online users found");
        return;
      }

      const batch = db.batch();
      let offlineCount = 0;

      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        const lastHeartbeat = userData.lastHeartbeat?.toDate();

        // If no heartbeat or heartbeat older than 10 minutes,
        // mark as offline
        if (!lastHeartbeat || lastHeartbeat < tenMinutesAgo) {
          batch.update(doc.ref, {
            isOnline: false,
            lastSeen: lastHeartbeat || now,
          });
          offlineCount++;
          logger.info(
            `👋 Marking user ${doc.id} offline ` +
              `(last heartbeat: ${lastHeartbeat})`
          );
        }
      });

      if (offlineCount > 0) {
        await batch.commit();
        logger.info(`✅ Marked ${offlineCount} users as offline`);
      } else {
        logger.info("✅ All online users have recent heartbeats");
      }
    } catch (error) {
      logger.error("❌ Error detecting offline users:", error);
      throw error;
    }
  }
);
