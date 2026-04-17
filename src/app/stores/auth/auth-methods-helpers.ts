/**
 * @fileoverview Authentication Methods Helpers
 * @description Focused helper functions for auth signup and login workflows
 * Extracted to keep individual auth methods under 14 lines per function
 * @module AuthMethodsHelpers
 */

import {
  Auth,
  updateProfile,
  UserCredential,
  sendEmailVerification,
} from '@angular/fire/auth';
import {
  Firestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  deleteDoc,
  writeBatch,
  arrayUnion,
} from '@angular/fire/firestore';
import { User } from '@core/models/user.model';
import { patchState } from '@ngrx/signals';

// ============================================================================
// SIGNUP HELPERS
// ============================================================================

/**
 * Create and store Firestore user document after signup
 * @async
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
 * Update Firebase Auth profile with displayName
 * @async
 */
export async function updateSignupProfile(
  credential: UserCredential,
  displayName: string,
): Promise<void> {
  await updateProfile(credential.user, { displayName });
  console.log('✅ User profile updated with displayName:', displayName);
}

/**
 * Add user to default channels during signup
 * @async
 */
export async function addSignupUserToDefaultChannels(
  userId: string,
  firestore: Firestore,
): Promise<void> {
  const defaultChannels = [
    {
      name: 'DABubble-welcome',
      description: 'Welcome to DABubble! General announcements and introductions.',
    },
    {
      name: "Let's Bubble",
      description: 'Connect with all DABubble users! Share ideas, ask questions, and collaborate.',
    },
  ];

  for (const channelConfig of defaultChannels) {
    try {
      const channelQuery = query(
        collection(firestore, 'channels'),
        where('name', '==', channelConfig.name),
      );
      const channelSnapshot = await getDocs(channelQuery);

      if (!channelSnapshot.empty) {
        const channel = channelSnapshot.docs[0];
        const channelRef = doc(firestore, 'channels', channel.id);
        await updateDoc(channelRef, {
          members: arrayUnion(userId),
          updatedAt: new Date(),
        });
        console.log(`✅ User added to ${channelConfig.name} channel`);
      } else {
        const channelData = {
          name: channelConfig.name,
          description: channelConfig.description,
          isPrivate: false,
          createdBy: userId,
          members: [userId],
          admins: [userId],
          createdAt: new Date(),
          updatedAt: new Date(),
          lastMessageAt: new Date(),
          messageCount: 0,
        };
        await setDoc(doc(collection(firestore, 'channels')), channelData);
        console.log(`✅ ${channelConfig.name} channel created with user as admin`);
      }
    } catch (channelError) {
      console.warn(`⚠️ Could not add user to ${channelConfig.name} channel:`, channelError);
    }
  }
}

/**
 * Send email verification to user
 * @async
 */
export async function sendSignupVerificationEmail(credential: UserCredential): Promise<void> {
  try {
    await sendEmailVerification(credential.user);
    console.log('✅ Verification email successfully sent to:', credential.user.email);
  } catch (emailError: any) {
    console.error('❌ Failed to send verification email:', emailError?.code);
  }
}

// ============================================================================
// LOGIN HELPERS
// ============================================================================

/**
 * Create new Firestore user document on first login
 * @async
 */
export async function createLoginFirestoreUser(
  firebaseUser: any,
  firestore: Firestore,
): Promise<User> {
  const isAnonymous = firebaseUser.isAnonymous;
  const defaultAvatar = '/img/profile/profile-0.svg';

  const newUser: User = {
    uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    displayName: firebaseUser.displayName || (isAnonymous ? 'Guest' : 'Anonymous'),
    photoURL: isAnonymous ? defaultAvatar : firebaseUser.photoURL || defaultAvatar,
    isOnline: true,
    lastSeen: new Date(),
    channels: [],
    directMessages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  if (isAnonymous) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    (newUser as any).expiresAt = expiresAt;
    (newUser as any).isGuest = true;
    console.log('🕐 Guest user will expire at:', expiresAt.toISOString());
  }

  await setDoc(doc(firestore, 'users', firebaseUser.uid), newUser);
  console.log(`✅ User document created: ${isAnonymous ? 'Guest' : 'Google'} user`);

  return newUser;
}

/**
 * Create Notes DM (self-conversation) for user
 * @async
 */
export async function createLoginNotesDM(
  userId: string,
  firestore: Firestore,
): Promise<void> {
  try {
    const notesDmId = `${userId}_${userId}`;
    const notesDmRef = doc(firestore, 'directMessages', notesDmId);
    const notesDmDoc = await getDoc(notesDmRef);

    if (!notesDmDoc.exists()) {
      const notesDmData = {
        participants: [userId, userId],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastMessageAt: new Date(),
        messageCount: 0,
      };
      await setDoc(notesDmRef, notesDmData);
      console.log('📝 Notes DM created for user');
    }
  } catch (dmError) {
    console.warn('⚠️ Could not create Notes DM:', dmError);
  }
}

/**
 * Add user to default channels on login
 * @async
 */
export async function addLoginUserToDefaultChannels(
  userId: string,
  firestore: Firestore,
  isAnonymous: boolean,
): Promise<void> {
  const defaultChannels = [
    {
      name: 'DABubble-welcome',
      description: 'Welcome to DABubble! General announcements and introductions.',
    },
    {
      name: "Let's Bubble",
      description: 'Connect with all DABubble users! Share ideas, ask questions, and collaborate.',
    },
  ];

  for (const channelConfig of defaultChannels) {
    try {
      const channelQuery = query(
        collection(firestore, 'channels'),
        where('name', '==', channelConfig.name),
      );
      const channelSnapshot = await getDocs(channelQuery);

      if (!channelSnapshot.empty) {
        const channel = channelSnapshot.docs[0];
        const channelRef = doc(firestore, 'channels', channel.id);
        await updateDoc(channelRef, {
          members: arrayUnion(userId),
          updatedAt: new Date(),
        });
        console.log(
          `✅ ${isAnonymous ? 'Guest' : 'Google'} user added to ${channelConfig.name} channel`,
        );
      } else {
        const channelData = {
          name: channelConfig.name,
          description: channelConfig.description,
          isPrivate: false,
          createdBy: userId,
          members: [userId],
          admins: [userId],
          createdAt: new Date(),
          updatedAt: new Date(),
          lastMessageAt: new Date(),
          messageCount: 0,
        };
        await setDoc(doc(collection(firestore, 'channels')), channelData);
        console.log(
          `✅ ${channelConfig.name} channel created with ${isAnonymous ? 'Guest' : 'Google'} user as admin`,
        );
      }
    } catch (channelError) {
      console.warn(`⚠️ Could not add user to ${channelConfig.name} channel:`, channelError);
    }
  }
}

/**
 * Update existing user's online status on login
 * @async
 */
export async function updateLoginUserStatus(userId: string, firestore: Firestore): Promise<void> {
  try {
    await setDoc(
      doc(firestore, 'users', userId),
      {
        isOnline: true,
        lastSeen: new Date(),
        updatedAt: new Date(),
      },
      { merge: true },
    );
  } catch (error) {
    console.warn('Failed to update user status in Firestore:', error);
  }
}

// ============================================================================
// LOGOUT HELPERS
// ============================================================================

/**
 * Update user offline status before logout
 * @async
 */
export async function updateLogoutUserStatus(userId: string, firestore: Firestore): Promise<void> {
  try {
    await setDoc(
      doc(firestore, 'users', userId),
      {
        isOnline: false,
        lastSeen: new Date(),
        updatedAt: new Date(),
      },
      { merge: true },
    );
  } catch (error) {
    console.warn('Failed to update user status on logout:', error);
  }
}

/**
 * Delete guest user and all associated data
 * @async
 */
export async function deleteGuestUserAccount(
  userId: string,
  auth: Auth,
  firestore: Firestore,
): Promise<void> {
  console.log('🗑️ Guest user logout - deleting account:', userId);

  try {
    // Remove from all channels
    const channelsRef = collection(firestore, 'channels');
    const channelsSnapshot = await getDocs(channelsRef);

    const batch = writeBatch(firestore);
    let channelUpdates = 0;

    for (const channelDoc of channelsSnapshot.docs) {
      const channel = channelDoc.data();
      if (channel['members']?.includes(userId)) {
        batch.update(channelDoc.ref, {
          members: channel['members'].filter((id: string) => id !== userId),
          updatedAt: new Date(),
        });
        channelUpdates++;
      }
    }

    if (channelUpdates > 0) {
      await batch.commit();
      console.log(`✅ Removed guest from ${channelUpdates} channels`);
    }

    // Delete Notes-DM
    const notesDmId = `${userId}_${userId}`;
    const notesDmRef = doc(firestore, 'directMessages', notesDmId);
    try {
      await deleteDoc(notesDmRef);
      console.log('✅ Deleted Notes-DM:', notesDmId);
    } catch {
      console.warn('Notes-DM not found or already deleted');
    }

    // Delete Firestore user doc
    await deleteDoc(doc(firestore, 'users', userId));
    console.log('✅ Deleted Firestore user document');

    // Delete Firebase Auth account
    const currentUser = auth.currentUser;
    if (currentUser) {
      const { deleteUser } = await import('@angular/fire/auth');
      await deleteUser(currentUser);
      console.log('✅ Deleted Firebase Auth account');
    }

    console.log('🎉 Guest account completely deleted');
  } catch (deleteError) {
    console.error('❌ Error deleting guest account:', deleteError);
  }
}

/**
 * Determine if user is a guest
 * @async
 */
export async function isGuestUser(userId: string, firestore: Firestore): Promise<boolean> {
  try {
    const userDocRef = doc(firestore, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    return userDoc.exists() && userDoc.data()?.['isGuest'] === true;
  } catch {
    return false;
  }
}
