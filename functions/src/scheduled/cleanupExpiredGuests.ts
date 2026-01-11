import {onSchedule} from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

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

      // Query guests with expiresAt < now
      const expiredGuestsSnapshot = await db
        .collection("users")
        .where("isGuest", "==", true)
        .where("expiresAt", "<", now)
        .get();

      if (expiredGuestsSnapshot.empty) {
        logger.info("✅ No expired guest users found");
        return;
      }

      logger.info(
        `🗑️ Found ${expiredGuestsSnapshot.size} expired guest users`
      );

      const batch = db.batch();
      const deleteAuthPromises: Promise<void>[] = [];

      expiredGuestsSnapshot.forEach((doc) => {
        const userId = doc.id;
        logger.info(`🗑️ Deleting expired guest: ${userId}`);

        // Delete Firestore document
        batch.delete(doc.ref);

        // Delete from Firebase Auth
        deleteAuthPromises.push(
          admin
            .auth()
            .deleteUser(userId)
            .then(() => {
              logger.info(`✅ Deleted auth user: ${userId}`);
            })
            .catch((error) => {
              logger.error(`❌ Error deleting auth user ${userId}:`, error);
            })
        );
      });

      // Commit Firestore batch
      await batch.commit();
      logger.info(
        `✅ Deleted Firestore documents for ` +
          `${expiredGuestsSnapshot.size} guest users`
      );

      // Wait for all Auth deletions to complete
      await Promise.allSettled(deleteAuthPromises);

      logger.info(
        "🎉 Cleanup complete: Deleted " +
          `${expiredGuestsSnapshot.size} expired guest users`
      );
    } catch (error) {
      logger.error("❌ Error during guest user cleanup:", error);
      throw error;
    }
  }
);
