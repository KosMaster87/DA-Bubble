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
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { patchState } from '@ngrx/signals';
import {
  createLoginFirestoreUser,
  createLoginNotesDM,
  addLoginUserToDefaultChannels,
  updateLoginUserStatus,
  updateLogoutUserStatus,
  deleteGuestUserAccount,
  isGuestUser,
} from './auth-methods-helpers';

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
   * For regular users: updates offline status
   * For guests: deletes all account data completely
   * @async
   */
  async logout(): Promise<void> {
    patchState(store, { isLoading: true });
    try {
      const currentUser = auth.currentUser;

      if (currentUser) {
        const isGuest = await isGuestUser(currentUser.uid, firestore);

        if (isGuest) {
          await deleteGuestUserAccount(currentUser.uid, auth, firestore);
        } else {
          await updateLogoutUserStatus(currentUser.uid, firestore);
          await auth.signOut();
        }
      }

      patchState(store, { user: null, isAuthenticated: false, isLoading: false });
    } catch (error) {
      handleAuthError(error, 'Logout failed');
    }
  },
});

/**
 * Generic login handler for different authentication methods
 * Creates Firestore user document if it doesn't exist and adds to default channels
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
    const userDocRef = doc(firestore, 'users', firebaseUser.uid);
    const userSnapshot = await getDoc(userDocRef);

    if (!userSnapshot.exists()) {
      // Create new user and assign to channels
      await createLoginFirestoreUser(firebaseUser, firestore);
      await createLoginNotesDM(firebaseUser.uid, firestore);
      await addLoginUserToDefaultChannels(firebaseUser.uid, firestore, firebaseUser.isAnonymous);
    } else {
      // Update existing user status
      await updateLoginUserStatus(firebaseUser.uid, firestore);
    }

    await handleSuccessfulAuth(firebaseUser);
  } catch (error) {
    handleAuthError(error, 'Login failed');
    throw error;
  }
}
