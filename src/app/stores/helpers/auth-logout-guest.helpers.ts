/**
 * @fileoverview Authentication logout and guest helpers
 * @description Pure helper functions for user logout workflows and guest account management.
 * @module auth-logout-guest
 */

import { Auth } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
  writeBatch,
} from '@angular/fire/firestore';

/**
 * Update user online status to false on logout.
 * @description Marks the user as offline in Firestore so other users see them
 * as away, while preserving their last seen timestamp for presence history.
 * @param userId - User ID to mark as offline
 * @param firestore - Firestore instance
 */
export async function updateLogoutUserStatus(userId: string, firestore: Firestore): Promise<void> {
  const userRef = doc(firestore, 'users', userId);
  await updateDoc(userRef, {
    isOnline: false,
    lastSeen: new Date(),
    updatedAt: new Date(),
  });
  console.log('✅ User status updated to offline');
}

/**
 * Delete guest user account and all associated data.
 * @description Completely removes a guest account from both Firebase Auth and Firestore,
 * including all messages, channels, and direct messages created by the guest user.
 * @param userId - Guest user ID to delete
 * @param firestore - Firestore instance
 * @param auth - Firebase Auth instance for deleting the anonymous auth account
 * @description This helper is specifically intended for anonymous guest accounts.
 * It removes Firestore data and then deletes the guest Auth user, but it is not
 * used for regular registered users.
 */
export async function deleteGuestUserAccount(
  userId: string,
  firestore: Firestore,
  auth: Auth,
): Promise<void> {
  const batch = writeBatch(firestore);

  // Delete user's messages from channels
  const channelMessagesQuery = query(
    collection(firestore, 'channel-messages'),
    where('authorId', '==', userId),
  );
  const channelMessagesSnapshot = await getDocs(channelMessagesQuery);
  channelMessagesSnapshot.forEach((doc) => {
    batch.delete(doc.ref);
  });

  // Delete user's direct messages
  const directMessagesQuery = query(
    collection(firestore, 'direct-messages'),
    where('participants', 'array-contains', userId),
  );
  const directMessagesSnapshot = await getDocs(directMessagesQuery);
  directMessagesSnapshot.forEach((doc) => {
    batch.delete(doc.ref);
  });

  // Delete user's DM messages
  const dmMessagesQuery = query(
    collection(firestore, 'dm-messages'),
    where('authorId', '==', userId),
  );
  const dmMessagesSnapshot = await getDocs(dmMessagesQuery);
  dmMessagesSnapshot.forEach((doc) => {
    batch.delete(doc.ref);
  });

  // Remove user from all channels
  const channelsQuery = query(collection(firestore, 'channels'));
  const channelsSnapshot = await getDocs(channelsQuery);
  channelsSnapshot.forEach((channelDoc) => {
    const channelData = channelDoc.data();
    const members = channelData?.['members'] || [];
    const admins = channelData?.['admins'] || [];

    if (members.includes(userId)) {
      batch.update(channelDoc.ref, {
        members: members.filter((id: string) => id !== userId),
        updatedAt: new Date(),
      });
    }

    if (admins.includes(userId)) {
      batch.update(channelDoc.ref, {
        admins: admins.filter((id: string) => id !== userId),
        updatedAt: new Date(),
      });
    }
  });

  // Delete user document
  const userRef = doc(firestore, 'users', userId);
  batch.delete(userRef);

  await batch.commit();
  console.log('✅ Guest user account and all data deleted');

  if (auth.currentUser) {
    try {
      await auth.currentUser.delete();
      console.log('✅ Firebase Auth guest account deleted');
    } catch (error) {
      console.warn('Guest auth deletion failed, signing out instead', error);
      await auth.signOut();
    }
  }
}

/**
 * Check if a user is a guest account.
 * @description Determines whether a user account was created as a guest by checking
 * for the presence of an email address (guests don't have emails).
 * @param userId - User ID to check
 * @param firestore - Firestore instance
 * @returns True if the user is a guest account
 */
export async function isGuestUser(userId: string, firestore: Firestore): Promise<boolean> {
  const userRef = doc(firestore, 'users', userId);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    return false;
  }

  const userData = userDoc.data();
  return !userData?.['email'] || userData['email'] === '';
}
