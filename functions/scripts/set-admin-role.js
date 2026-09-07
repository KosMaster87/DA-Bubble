#!/usr/bin/env node
/**
 * One-off operator script: grant the platform-wide 'admin' or 'owner' role to a user.
 *
 * There is no in-app way to grant 'owner' (by design — ownership transfer isn't part of
 * the Admin Panel MVP) and 'admin' can only be granted/revoked afterwards by the owner
 * through the Admin Panel (see functions/src/admin/set-user-role.ts).
 *
 * Usage:
 *   firebase login                                     # once, if not already logged in
 *   node functions/scripts/set-admin-role.js someone@example.com          # role: admin
 *   node functions/scripts/set-admin-role.js someone@example.com owner    # role: owner
 *
 * Uses Application Default Credentials (from `firebase login` / `gcloud auth
 * application-default login`) against the project in the repo's .firebaserc —
 * no service-account key file needed or committed.
 */

const admin = require('firebase-admin');
const { readFileSync } = require('fs');
const path = require('path');

const email = process.argv[2];
const role = process.argv[3] || 'admin';

if (!email || !['admin', 'owner'].includes(role)) {
  console.error('Usage: node functions/scripts/set-admin-role.js <email> [admin|owner]');
  process.exit(1);
}

const firebaserc = JSON.parse(
  readFileSync(path.join(__dirname, '..', '..', '.firebaserc'), 'utf8'),
);
const projectId = firebaserc.projects.default;

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId,
});

async function main() {
  const userRecord = await admin.auth().getUserByEmail(email);
  const userRef = admin.firestore().collection('users').doc(userRecord.uid);
  const snapshot = await userRef.get();

  if (!snapshot.exists) {
    console.error(
      `No Firestore users/${userRecord.uid} document found for ${email}. ` +
        'The user must sign in at least once before their document exists.',
    );
    process.exit(1);
  }

  if (role === 'owner') {
    const existingOwners = await admin
      .firestore()
      .collection('users')
      .where('role', '==', 'owner')
      .get();
    const otherOwner = existingOwners.docs.find((existingDoc) => existingDoc.id !== userRecord.uid);
    if (otherOwner) {
      console.error(
        `Project ${projectId} already has an owner (${otherOwner.data().email}). ` +
          'There can only be one — demote them first if ownership should move.',
      );
      process.exit(1);
    }
  }

  await userRef.update({ role, updatedAt: new Date() });
  console.log(`✅ ${email} (${userRecord.uid}) is now role: '${role}' on project ${projectId}.`);
}

main().catch((error) => {
  console.error('❌ Failed to set role:', error);
  process.exit(1);
});
