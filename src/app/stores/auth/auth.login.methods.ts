/**
 * @fileoverview Authentication Login Methods
 * @description Methods for email, Google, and anonymous login
 * @module AuthLoginMethods
 */

import {
  Auth,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInAnonymously,
  GoogleAuthProvider,
  UserCredential,
} from '@angular/fire/auth';
import {
  Firestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  arrayUnion,
} from '@angular/fire/firestore';
import { patchState } from '@ngrx/signals';
import { User } from '@core/models/user.model';

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
  handleAuthError: (error: unknown, message: string) => void
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
      handleAuthError
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
      handleAuthError
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
      handleAuthError
    );
  },

  /**
   * Logout current user
   * Updates Firestore user status before signing out
   * @async
   */
  async logout(): Promise<void> {
    patchState(store, { isLoading: true });
    try {
      const currentUser = auth.currentUser;

      // Update Firestore before logout (with error handling)
      if (currentUser) {
        try {
          const userDocRef = doc(firestore, 'users', currentUser.uid);
          await setDoc(
            userDocRef,
            {
              isOnline: false,
              lastSeen: new Date(),
              updatedAt: new Date(),
            },
            { merge: true }
          );
        } catch (firestoreError) {
          // Log Firestore error but continue with logout
          console.warn('Failed to update user status in Firestore:', firestoreError);
        }
      }

      // Always logout from Firebase Auth
      await auth.signOut();
      patchState(store, { user: null, isAuthenticated: false, isLoading: false });
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
  handleAuthError: (error: unknown, message: string) => void
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
      const newUser: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || 'Anonymous',
        photoURL: firebaseUser.photoURL || undefined,
        isOnline: true,
        lastSeen: new Date(),
        channels: [],
        directMessages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await setDoc(userDocRef, newUser);

      // Add user to DABubble-Welcome channel (create if not exists)
      try {
        const welcomeChannelQuery = query(
          collection(firestore, 'channels'),
          where('name', '==', 'DABubble-welcome')
        );
        const welcomeSnapshot = await getDocs(welcomeChannelQuery);

        if (!welcomeSnapshot.empty) {
          // DABubble-Welcome exists - add user as member
          const welcomeChannel = welcomeSnapshot.docs[0];
          const channelRef = doc(firestore, 'channels', welcomeChannel.id);
          await updateDoc(channelRef, {
            members: arrayUnion(firebaseUser.uid),
            updatedAt: new Date(),
          });
          console.log('✅ Google user added to DABubble-Welcome channel');
        } else {
          // DABubble-Welcome doesn't exist - create it with this user as creator
          const welcomeChannelData = {
            name: 'DABubble-welcome',
            description: 'Welcome to DABubble! General announcements and introductions.',
            isPrivate: false,
            createdBy: firebaseUser.uid,
            members: [firebaseUser.uid],
            admins: [firebaseUser.uid],
            createdAt: new Date(),
            updatedAt: new Date(),
            lastMessageAt: new Date(),
            messageCount: 0,
          };
          await setDoc(doc(collection(firestore, 'channels')), welcomeChannelData);
          console.log('✅ DABubble-Welcome channel created with Google user as admin');
        }
      } catch (channelError) {
        console.warn('⚠️ Could not add Google user to DABubble-Welcome channel:', channelError);
        // Don't fail login if channel addition fails
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
        { merge: true }
      );
    }

    await handleSuccessfulAuth(firebaseUser);
  } catch (error) {
    handleAuthError(error, 'Login failed');
  }
}
