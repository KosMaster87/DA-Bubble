import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

type AssignableRole = "member" | "admin";

interface SetUserRoleRequest {
  targetUid: string;
  role: AssignableRole;
}

/**
 * Load a user's Firestore document, throwing not-found if it doesn't exist.
 * @param {admin.firestore.Firestore} db - Firestore instance
 * @param {string} uid - User ID to load
 * @return {Promise<admin.firestore.DocumentSnapshot>} The user's document
 */
const loadUserDoc = async (
  db: admin.firestore.Firestore,
  uid: string
): Promise<
  admin.firestore.DocumentSnapshot
> => {
  const snapshot = await db.collection("users").doc(uid).get();
  if (!snapshot.exists) {
    throw new HttpsError("not-found", `No users/${uid} document.`);
  }
  return snapshot;
};

/**
 * Callable: promote or demote a user between 'member' and 'admin'.
 * Only the platform owner may call this. The owner's own role, and 'owner'
 * as a target value, are both out of scope here — see
 * functions/scripts/set-admin-role.js for the only way to grant/move ownership.
 */
export const setUserRole = onCall<SetUserRoleRequest>(async (request) => {
  const {auth, data} = request;

  if (!auth) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }
  if (!data.targetUid || !["member", "admin"].includes(data.role)) {
    throw new HttpsError(
      "invalid-argument",
      "targetUid and role ('member'|'admin') are required."
    );
  }

  const db = admin.firestore();
  const [callerDoc, targetDoc] = await Promise.all([
    loadUserDoc(db, auth.uid),
    loadUserDoc(db, data.targetUid),
  ]);

  if (callerDoc.data()?.["role"] !== "owner") {
    throw new HttpsError(
      "permission-denied",
      "Only the platform owner can change roles."
    );
  }

  const previousRole = targetDoc.data()?.["role"] ?? "member";
  if (previousRole === "owner") {
    throw new HttpsError(
      "failed-precondition",
      "The owner's role cannot be changed here."
    );
  }
  if (previousRole === data.role) {
    return {success: true, unchanged: true};
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const batch = db.batch();
  batch.update(targetDoc.ref, {role: data.role, updatedAt: now});
  batch.create(db.collection("auditLog").doc(), {
    action: "role_changed",
    actorUid: auth.uid,
    actorDisplayName: callerDoc.data()?.["displayName"] ?? null,
    targetUid: data.targetUid,
    targetDisplayName: targetDoc.data()?.["displayName"] ?? null,
    previousRole,
    newRole: data.role,
    createdAt: now,
  });

  await batch.commit();
  logger.info(
    `Role change: ${data.targetUid} ${previousRole} -> ${data.role} ` +
    `(by ${auth.uid})`
  );

  return {success: true, unchanged: false};
});
