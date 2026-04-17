/**
 * @fileoverview Authentication Login Methods
 * @description Methods for email, Google, and anonymous login
 * @module AuthLoginMethods
 */

import {
  Auth,
  GoogleAuthProvider,
  UserCredential,
  deleteUser,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
} from '@angular/fire/auth';
import {
  Firestore,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from '@angular/fire/firestore';
import { User } from '@core/models/user.model';
import { patchState } from '@ngrx/signals';

/**
 * Create login methods for auth store
 * @function createLoginMethods
 * @param {Auth} auth - Firebase Auth instance
 * @param {Firestore} firestore - Firestore instance
 * @param {any} store - NgRx Signal Store instance
 * @param {Function} handleSuccessfulAuth - Success handler
 * @param {Function} handleAuthError - Error handler
 * @returns {object} Login methods
 */
export const createLoginMethods = (
  auth: Auth,
  firestore: Firestore,
  store: any,
  handleSuccessfulAuth: (user: any) => void,
  handleAuthError: (error: unknown, message: string) => void,
) => ({
  /**
   * Login with email and password
   * @async
   * @param {string} email - User email address
   * @param {string} password - User password
   */
  async loginWithEmail(email: string, password: string): Promise<void> {
    await performLogin(
      () => signInWithEmailAndPassword(auth, email, password),
      firestore,
      store,
      handleSuccessfulAuth,
      handleAuthError,
    );
  },

  /**
   * Login with Google OAuth provider
   * @async
   */
  async loginWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
    await performLogin(
      () => signInWithPopup(auth, provider),
      firestore,
      store,
      handleSuccessfulAuth,
      handleAuthError,
    );
  },

  /**
   * Login anonymously as guest
   * @async
   */
  async loginAnonymously(): Promise<void> {
    await performLogin(
      () => signInAnonymously(auth),
      firestore,
      store,
      handleSuccessfulAuth,
      handleAuthError,
    );
  },

  /**
   * Logout current user
   * Updates Firestore user status before signing out
   * For guest users: Deletes all data (Firestore, Auth, channels, DMs)
   * @async
   */
  async logout(): Promise<void> {
    patchState(store, { isLoading: true });
    try {
      const currentUser = auth.currentUser;

      if (currentUser) {
        // Check if user is a guest
        const userDocRef = doc(firestore, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        const isGuest = userDoc.exists() && userDoc.data()?.['isGuest'] === true;

        if (isGuest) {
          // Guest user: Complete account deletion
          console.log('🗑️ Guest user logout - deleting account:', currentUser.uid);

          try {
            // 1. Remove from all channels
            const channelsRef = collection(firestore, 'channels');
            const channelsSnapshot = await getDocs(channelsRef);

            const batch = writeBatch(firestore);
            let channelUpdates = 0;

            for (const channelDoc of channelsSnapshot.docs) {
              const channel = channelDoc.data();
              if (channel['members']?.includes(currentUser.uid)) {
                batch.update(channelDoc.ref, {
                  members: channel['members'].filter((id: string) => id !== currentUser.uid),
                  updatedAt: new Date(),
                });
                channelUpdates++;
              }
            }

            if (channelUpdates > 0) {
              await batch.commit();
              console.log(`✅ Removed guest from ${channelUpdates} channels`);
            }

            // 2. Delete Notes-DM (self-conversation)
            const notesDmId = `${currentUser.uid}_${currentUser.uid}`;
            const notesDmRef = doc(firestore, 'directMessages', notesDmId);
            try {
              await deleteDoc(notesDmRef);
              console.log('✅ Deleted Notes-DM:', notesDmId);
            } catch (dmError) {
              console.warn('Notes-DM not found or already deleted:', dmError);
            }

            // 3. Delete user document from Firestore
            await deleteDoc(userDocRef);
            console.log('✅ Deleted Firestore user document');

            // 4. Delete Firebase Auth account
            await deleteUser(currentUser);
            console.log('✅ Deleted Firebase Auth account');

            console.log('🎉 Guest account completely deleted');
          } catch (deleteError) {
            console.error('❌ Error deleting guest account:', deleteError);
            // Continue with logout even if deletion fails
          }
        } else {
          // Regular user: Update status only
          try {
            await setDoc(
              userDocRef,
              {
                isOnline: false,
                lastSeen: new Date(),
                updatedAt: new Date(),
              },
              { merge: true },
            );
          } catch (firestoreError) {
            // Log Firestore error but continue with logout
            console.warn('Failed to update user status in Firestore:', firestoreError);
          }
        }
      }

      // Always logout from Firebase Auth (unless already deleted)
      if (!auth.currentUser) {
        // User already deleted (guest user case)
        patchState(store, { user: null, isAuthenticated: false, isLoading: false });
      } else {
        await auth.signOut();
        patchState(store, { user: null, isAuthenticated: false, isLoading: false });
      }
    } catch (error) {
      handleAuthError(error, 'Logout failed');
    }
  },
});

/**
 * Generic login handler for different authentication methods
 * Creates Firestore user document if it doesn't exist
 * @async
 * @function performLogin
 * @param {Function} loginFn - Function that returns UserCredential promise
 * @param {Firestore} firestore - Firestore instance
 * @param {any} store - NgRx Signal Store instance
 * @param {Function} handleSuccessfulAuth - Success handler
 * @param {Function} handleAuthError - Error handler
 * @private
 */
async function performLogin(
  loginFn: () => Promise<UserCredential>,
  firestore: Firestore,
  store: any,
  handleSuccessfulAuth: (user: any) => void,
  handleAuthError: (error: unknown, message: string) => void,
): Promise<void> {
  patchState(store, { isLoading: true, error: null });
  try {
    const credential = await loginFn();
    const firebaseUser = credential.user;

    // Check if Firestore user document exists
    const userDocRef = doc(firestore, 'users', firebaseUser.uid);
    const userSnapshot = await getDoc(userDocRef);

    // Create user document if it doesn't exist (e.g., Google login first time)
    if (!userSnapshot.exists()) {
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

      // Add expiration time for guest users (1 hour from now)
      if (isAnonymous) {
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);
        (newUser as any).expiresAt = expiresAt;
        (newUser as any).isGuest = true;
        console.log('🕐 Guest user will expire at:', expiresAt.toISOString());
      }

      await setDoc(userDocRef, newUser);
      console.log(`✅ User document created: ${isAnonymous ? 'Guest' : 'Google'} user`);

      // Create Notes DM (self-conversation) for the new user
      try {
        const notesDmId = `${firebaseUser.uid}_${firebaseUser.uid}`;
        const notesDmRef = doc(firestore, 'directMessages', notesDmId);
        const notesDmDoc = await getDoc(notesDmRef);

        if (!notesDmDoc.exists()) {
          const notesDmData = {
            participants: [firebaseUser.uid, firebaseUser.uid],
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

      // Add user to default channels (DABubble-welcome and Let's Bubble)
      const defaultChannels = [
        {
          name: 'DABubble-welcome',
          description: 'Welcome to DABubble! General announcements and introductions.',
        },
        {
          name: "Let's Bubble",
          description:
            'Connect with all DABubble users! Share ideas, ask questions, and collaborate.',
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
            // Channel exists - add user as member
            const channel = channelSnapshot.docs[0];
            const channelRef = doc(firestore, 'channels', channel.id);
            await updateDoc(channelRef, {
              members: arrayUnion(firebaseUser.uid),
              updatedAt: new Date(),
            });
            console.log(
              `✅ ${isAnonymous ? 'Guest' : 'Google'} user added to ${channelConfig.name} channel`,
            );
          } else {
            // Channel doesn't exist - create it with this user as creator
            const channelData = {
              name: channelConfig.name,
              description: channelConfig.description,
              isPrivate: false,
              createdBy: firebaseUser.uid,
              members: [firebaseUser.uid],
              admins: [firebaseUser.uid],
              createdAt: new Date(),
              updatedAt: new Date(),
              lastMessageAt: new Date(),
              messageCount: 0,
            };
            await setDoc(doc(collection(firestore, 'channels')), channelData);
            console.log(
              `✅ ${channelConfig.name} channel created with ${
                isAnonymous ? 'Guest' : 'Google'
              } user as admin`,
            );
          }
        } catch (channelError) {
          console.warn(`⚠️ Could not add user to ${channelConfig.name} channel:`, channelError);
          // Don't fail login if channel addition fails
        }
      }
    } else {
      // Update last seen and online status
      await setDoc(
        userDocRef,
        {
          isOnline: true,
          lastSeen: new Date(),
          updatedAt: new Date(),
        },
        { merge: true },
      );
    }

    await handleSuccessfulAuth(firebaseUser);
  } catch (error) {
    handleAuthError(error, 'Login failed');
    throw error;
  }
}
