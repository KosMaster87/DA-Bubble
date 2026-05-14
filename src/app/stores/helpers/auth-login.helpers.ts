/**
 * @fileoverview Authentication login helpers
 * @description Pure helper functions for user login workflows and Firestore operations.
 * @module auth-login
 */

import { Firestore, arrayUnion, doc, getDoc, setDoc, updateDoc } from '@angular/fire/firestore';
import { User } from '@core/models/user.model';

/**
 * Create Firestore user document for existing Firebase Auth user on first login.
 * @description Handles the case where a user exists in Firebase Auth but not in Firestore,
 * creating the document with default values while preserving any existing Auth profile data.
 * @param userId - Firebase Auth user ID
 * @param email - User's email address
 * @param displayName - User's display name from Auth profile
 * @param photoURL - User's photo URL from Auth profile
 * @param firestore - Firestore instance
 */
export async function createLoginFirestoreUser(
  userId: string,
  email: string,
  displayName: string | null,
  photoURL: string | null,
  firestore: Firestore,
): Promise<void> {
  const userDoc: User = {
    uid: userId,
    email,
    displayName: displayName || 'Anonymous',
    photoURL: photoURL || undefined,
    isOnline: true,
    lastSeen: new Date(),
    channels: [],
    directMessages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    scrollState: {},
  };

  await setDoc(doc(firestore, 'users', userId), userDoc);
  console.log('✅ Firestore user document created for existing Firebase user');
}

/**
 * Create personal notes DM for user on first login.
 * @description Sets up the self-DM conversation that serves as the user's personal
 * notes space, created automatically when they first log in.
 * @param userId - User ID for whom to create the notes DM
 * @param firestore - Firestore instance
 */
export async function createLoginNotesDM(userId: string, firestore: Firestore): Promise<void> {
  const conversationId = `${userId}_${userId}`;
  const conversationRef = doc(firestore, 'direct-messages', conversationId);

  const conversation = {
    id: conversationId,
    participants: [userId, userId],
    createdAt: new Date(),
    updatedAt: new Date(),
    lastMessageAt: new Date(),
    unreadCount: { [userId]: 0 },
  };

  await setDoc(conversationRef, conversation);
  console.log('✅ Personal notes DM created');
}

/**
 * Add user to default channels on login.
 * @description Ensures returning users are members of the core public channels,
 * adding them if they're not already members without affecting other channel memberships.
 * @param userId - User ID to add to default channels
 * @param firestore - Firestore instance
 */
export async function addLoginUserToDefaultChannels(
  userId: string,
  firestore: Firestore,
): Promise<void> {
  const defaultChannelIds = ['general', 'random'];

  for (const channelId of defaultChannelIds) {
    const channelRef = doc(firestore, 'channels', channelId);
    const channelDoc = await getDoc(channelRef);

    if (channelDoc.exists()) {
      const channelData = channelDoc.data();
      const members = channelData?.['members'] || [];

      if (!members.includes(userId)) {
        await updateDoc(channelRef, {
          members: arrayUnion(userId),
          updatedAt: new Date(),
        });
        console.log(`✅ User added to default channel: ${channelId}`);
      }
    }
  }
}

/**
 * Update user online status to true on login.
 * @description Marks the user as online in Firestore so other users can see
 * their presence status in real-time.
 * @param userId - User ID to mark as online
 * @param firestore - Firestore instance
 */
export async function updateLoginUserStatus(userId: string, firestore: Firestore): Promise<void> {
  const userRef = doc(firestore, 'users', userId);
  await updateDoc(userRef, {
    isOnline: true,
    lastSeen: new Date(),
    updatedAt: new Date(),
  });
  console.log('✅ User status updated to online');
}
