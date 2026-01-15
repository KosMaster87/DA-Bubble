import {onSchedule} from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

/**
 * Get cutoff time for stale heartbeats
 * @param {admin.firestore.Timestamp} now - Current timestamp
 * @return {Date} Cutoff time (30 minutes ago)
 */
const getCutoffTime = (now: admin.firestore.Timestamp): Date => {
  const THIRTY_MINUTES = 30 * 60 * 1000;
  return new Date(now.toMillis() - THIRTY_MINUTES);
};

/**
 * Fetch all online users from Firestore
 * @param {admin.firestore.Firestore} db - Firestore instance
 * @return {Promise<admin.firestore.QuerySnapshot>} Query snapshot
 */
const fetchOnlineUsers = async (
  db: admin.firestore.Firestore
): Promise<admin.firestore.QuerySnapshot> => {
  return await db.collection("users").where("isOnline", "==", true).get();
};

/**
 * Check if user has stale heartbeat
 * @param {Date | undefined} lastHeartbeat - Last heartbeat time
 * @param {Date} cutoffTime - Cutoff time
 * @return {boolean} True if heartbeat is stale
 */
const hasStaleHeartbeat = (
  lastHeartbeat: Date | undefined,
  cutoffTime: Date
): boolean => {
  return !lastHeartbeat || lastHeartbeat < cutoffTime;
};

/**
 * Mark user as offline in batch
 * @param {admin.firestore.WriteBatch} batch - Firestore batch
 * @param {admin.firestore.DocumentReference} docRef - User document ref
 * @param {Date | undefined} lastHeartbeat - Last heartbeat time
 * @param {admin.firestore.Timestamp} now - Current timestamp
 * @param {string} userId - User ID
 * @return {void}
 */
const markUserOffline = (
  batch: admin.firestore.WriteBatch,
  docRef: admin.firestore.DocumentReference,
  lastHeartbeat: Date | undefined,
  now: admin.firestore.Timestamp,
  userId: string
): void => {
  batch.update(docRef, {
    isOnline: false,
    lastSeen: lastHeartbeat || now,
  });
  logger.info(`👋 Marking user ${userId} offline (last: ${lastHeartbeat})`);
};

/**
 * Process online users and mark stale ones offline
 * @param {admin.firestore.QuerySnapshot} usersSnapshot - Users snapshot
 * @param {admin.firestore.WriteBatch} batch - Firestore batch
 * @param {Date} cutoffTime - Cutoff time
 * @param {admin.firestore.Timestamp} now - Current timestamp
 * @return {number} Count of users marked offline
 */
const processOnlineUsers = (
  usersSnapshot: admin.firestore.QuerySnapshot,
  batch: admin.firestore.WriteBatch,
  cutoffTime: Date,
  now: admin.firestore.Timestamp
): number => {
  let offlineCount = 0;

  usersSnapshot.forEach((doc) => {
    const userData = doc.data();
    const lastHeartbeat = userData.lastHeartbeat?.toDate();

    if (hasStaleHeartbeat(lastHeartbeat, cutoffTime)) {
      markUserOffline(batch, doc.ref, lastHeartbeat, now, doc.id);
      offlineCount++;
    }
  });

  return offlineCount;
};

/**
 * Commit batch updates and log result
 * @param {admin.firestore.WriteBatch} batch - Firestore batch
 * @param {number} offlineCount - Count of users marked offline
 * @return {Promise<void>} Promise that resolves when committed
 */
const commitBatchUpdates = async (
  batch: admin.firestore.WriteBatch,
  offlineCount: number
): Promise<void> => {
  if (offlineCount > 0) {
    await batch.commit();
    logger.info(`✅ Marked ${offlineCount} users as offline`);
  } else {
    logger.info("✅ All online users have recent heartbeats");
  }
};

/**
 * Scheduled function to detect and mark offline users
 * Runs every 30 minutes to check for stale heartbeats
 * (optimized for cost)
 */
export const detectOfflineUsers = onSchedule(
  {
    schedule: "every 30 minutes",
    timeZone: "Europe/Berlin",
  },
  async () => {
    logger.info("🔍 Starting offline user detection");

    try {
      const db = admin.firestore();
      const now = admin.firestore.Timestamp.now();
      const cutoffTime = getCutoffTime(now);

      const usersSnapshot = await fetchOnlineUsers(db);

      if (usersSnapshot.empty) {
        logger.info("✅ No online users found");
        return;
      }

      const batch = db.batch();
      const offlineCount = processOnlineUsers(usersSnapshot, batch, cutoffTime, now);

      await commitBatchUpdates(batch, offlineCount);
    } catch (error) {
      logger.error("❌ Error detecting offline users:", error);
      throw error;
    }
  }
);
