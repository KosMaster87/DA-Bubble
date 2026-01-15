import {onSchedule} from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

/**
 * Fetch expired guest users from Firestore
 * @param {admin.firestore.Firestore} db - Firestore instance
 * @param {admin.firestore.Timestamp} now - Current timestamp
 * @return {Promise<admin.firestore.QuerySnapshot>} Query snapshot
 */
const fetchExpiredGuests = async (
  db: admin.firestore.Firestore,
  now: admin.firestore.Timestamp
): Promise<admin.firestore.QuerySnapshot> => {
  return await db
    .collection("users")
    .where("isGuest", "==", true)
    .where("expiresAt", "<", now)
    .get();
};

/**
 * Delete user from Firebase Auth
 * @param {string} userId - User ID to delete
 * @return {Promise<void>} Promise that resolves when deleted
 */
const deleteAuthUser = async (userId: string): Promise<void> => {
  try {
    await admin.auth().deleteUser(userId);
  } catch (error) {
    logger.error(`Error deleting auth user ${userId}:`, error);
  }
};

/**
 * Process guest deletions in batch
 * @param {admin.firestore.QuerySnapshot} guestsSnapshot - Guest users
 * @param {admin.firestore.WriteBatch} batch - Firestore batch
 * @return {Promise<void>[]} Array of deletion promises
 */
const processGuestDeletions = (
  guestsSnapshot: admin.firestore.QuerySnapshot,
  batch: admin.firestore.WriteBatch
): Promise<void>[] => {
  const deleteAuthPromises: Promise<void>[] = [];

  guestsSnapshot.forEach((doc) => {
    batch.delete(doc.ref);
    deleteAuthPromises.push(deleteAuthUser(doc.id));
  });

  return deleteAuthPromises;
};

/**
 * Execute cleanup of expired guests
 * @param {admin.firestore.QuerySnapshot} guestsSnapshot - Guest users
 * @param {admin.firestore.WriteBatch} batch - Firestore batch
 * @return {Promise<void>} Promise that resolves when cleanup done
 */
const executeCleanup = async (
  guestsSnapshot: admin.firestore.QuerySnapshot,
  batch: admin.firestore.WriteBatch
): Promise<void> => {
  const deleteAuthPromises = processGuestDeletions(guestsSnapshot, batch);

  await batch.commit();
  await Promise.allSettled(deleteAuthPromises);

  logger.info(`✅ Deleted ${guestsSnapshot.size} expired guest users`);
};

/**
 * Scheduled function to cleanup expired guest accounts
 * Runs daily at 2 AM to delete guests past their expiration date
 */
export const cleanupExpiredGuests = onSchedule(
  {
    schedule: "0 2 * * *",
    timeZone: "Europe/Berlin",
  },
  async () => {
    logger.info("🧹 Starting cleanup of expired guest users");

    try {
      const db = admin.firestore();
      const now = admin.firestore.Timestamp.now();
      const guestsSnapshot = await fetchExpiredGuests(db, now);

      if (guestsSnapshot.empty) {
        logger.info("✅ No expired guests found");
        return;
      }

      const batch = db.batch();
      await executeCleanup(guestsSnapshot, batch);
    } catch (error) {
      logger.error("❌ Error during cleanup:", error);
      throw error;
    }
  }
);
