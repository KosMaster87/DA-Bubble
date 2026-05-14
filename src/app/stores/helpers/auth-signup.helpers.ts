/**
 * @fileoverview Authentication signup helpers
 * @description Pure helper functions for user signup workflows and Firestore operations.
 * @module auth-signup
 */

import { UserCredential, sendEmailVerification, updateProfile } from '@angular/fire/auth';
import { Firestore, arrayUnion, doc, getDoc, setDoc, updateDoc } from '@angular/fire/firestore';
import { User } from '@core/models/user.model';

/**
 * Create and store Firestore user document after signup.
 * @description Extracts this write into a dedicated helper so the signup method stays
 * within the project's function-size limit while remaining readable.
 * @param credential - Firebase auth credential from successful signup
 * @param displayName - User's chosen display name
 * @param firestore - Firestore instance for database operations
 */
export async function createSignupFirestoreUser(
  credential: UserCredential,
  displayName: string,
  firestore: Firestore,
): Promise<void> {
  const userDoc: Omit<User, 'photoURL'> & { photoURL?: string } = {
    uid: credential.user.uid,
    email: credential.user.email || '',
    displayName,
    isOnline: false,
    lastSeen: new Date(),
    channels: [],
    directMessages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    scrollState: {},
  };

  if (credential.user.photoURL) {
    userDoc.photoURL = credential.user.photoURL;
  }

  await setDoc(doc(firestore, 'users', credential.user.uid), userDoc);
  console.log('✅ Firestore user document created successfully!');
}

/**
 * Update Firebase Auth profile during signup with displayName.
 * @description Applied separately from Firestore writes so a partial Auth update
 * does not block or fail the Firestore document creation.
 * @param credential - Firebase auth credential
 * @param displayName - Display name to set on the auth profile
 */
export async function updateSignupProfile(
  credential: UserCredential,
  displayName: string,
): Promise<void> {
  await updateProfile(credential.user, { displayName });
  console.log('✅ User profile updated with displayName:', displayName);
}

/**
 * Add user to default channels during signup.
 * @description Ensures every new user is discoverable in the public welcome channels
 * immediately after registration, without requiring manual channel enrollment.
 * @param userId - New user's ID
 * @param firestore - Firestore instance
 */
export async function addSignupUserToDefaultChannels(
  userId: string,
  firestore: Firestore,
): Promise<void> {
  const defaultChannels = [
    {
      id: 'general',
      name: 'General',
      description: 'General discussion channel',
      isPrivate: false,
      createdBy: 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
      members: [],
      admins: ['system'],
    },
    {
      id: 'random',
      name: 'Random',
      description: 'Random discussions and fun topics',
      isPrivate: false,
      createdBy: 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
      members: [],
      admins: ['system'],
    },
  ];

  for (const channel of defaultChannels) {
    const channelRef = doc(firestore, 'channels', channel.id);
    const channelDoc = await getDoc(channelRef);

    if (!channelDoc.exists()) {
      await setDoc(channelRef, channel);
      console.log(`✅ Default channel "${channel.name}" created`);
    }

    // Add user to channel members
    await updateDoc(channelRef, {
      members: arrayUnion(userId),
      updatedAt: new Date(),
    });
  }

  console.log('✅ User added to default channels');
}

/**
 * Send email verification after successful signup.
 * @description Triggers Firebase Auth email verification so users can confirm
 * their email address before accessing full application features.
 * @param credential - Firebase auth credential
 */
export async function sendSignupVerificationEmail(credential: UserCredential): Promise<void> {
  await sendEmailVerification(credential.user);
  console.log('✅ Verification email sent to:', credential.user.email);
}
