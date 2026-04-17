/**
 * @fileoverview Authentication Signup Methods
 * @description Methods for user registration and email verification
 * @module AuthSignupMethods
 */

import { Auth, createUserWithEmailAndPassword, applyActionCode } from '@angular/fire/auth';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';
import { patchState } from '@ngrx/signals';
import { User } from '@core/models/user.model';
import {
  updateSignupProfile,
  updateExistingUserProfile,
  createSignupFirestoreUser,
  addSignupUserToDefaultChannels,
  sendSignupVerificationEmail,
} from './auth-methods-helpers';

/**
 * Create signup methods for auth store
 * @function createSignupMethods
 * @param {Auth} auth - Firebase Auth instance
 * @param {Firestore} firestore - Firestore instance
 * @param {any} store - NgRx Signal Store instance
 * @param {Function} handleSuccessfulAuth - Success handler
 * @param {Function} handleAuthError - Error handler
 * @returns {object} Signup methods
 */
export const createSignupMethods = (
  auth: Auth,
  firestore: Firestore,
  store: any,
  handleSuccessfulAuth: (user: any) => void,
  handleAuthError: (error: unknown, message: string) => void,
) => ({
  /**
   * Signup new user with email and password
   * Orchestrates profile creation, Firestore sync, channel assignment, and email verification
   * @async
   * @param {string} email - User email address
   * @param {string} password - User password
   * @param {string} displayName - User display name
   */
  async signup(email: string, password: string, displayName: string): Promise<void> {
    patchState(store, { isLoading: true, error: null });
    try {
      console.log('🚀 Starting signup process for:', email);

      const credential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('✅ Firebase Auth user created:', credential.user.uid);

      await updateSignupProfile(credential, displayName);
      await createSignupFirestoreUser(credential, displayName, firestore);
      await addSignupUserToDefaultChannels(credential.user.uid, firestore);
      await sendSignupVerificationEmail(credential);

      patchState(store, { isLoading: false });
      console.log('✅ Signup process completed successfully!');
    } catch (error) {
      console.error('❌ Signup failed with error:', error);
      handleAuthError(error, 'Registration failed');
    }
  },

  /**
   * Verify email with code
   * @async
   * @param {string} code - Verification code from email
   */
  async verifyEmail(code: string): Promise<void> {
    await applyActionCode(auth, code);
  },

  /**
   * Update user profile and sync with store
   * @async
   * @param {Object} profile - Profile data to update
   */
  async updateUserProfile(profile: { displayName?: string; photoURL?: string }): Promise<void> {
    patchState(store, { isLoading: true });
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('No user logged in');

      // Update Firebase Auth profile if displayName is provided
      if (profile.displayName || profile.photoURL) {
        await updateExistingUserProfile(currentUser, profile);
      }

      // Update Firestore user document
      const userDocRef = doc(firestore, 'users', currentUser.uid);
      await setDoc(
        userDocRef,
        {
          ...profile,
          updatedAt: new Date(),
        },
        { merge: true },
      );

      console.log('🖼️ Profile updated in Firestore:', profile);

      // Read back updated data from Firestore
      const updatedUserDoc = await getDoc(userDocRef);
      if (updatedUserDoc.exists()) {
        const firestoreData = updatedUserDoc.data();
        const user: User = {
          uid: firestoreData['uid'],
          email: firestoreData['email'],
          displayName: firestoreData['displayName'],
          photoURL: firestoreData['photoURL'],
          isOnline: firestoreData['isOnline'],
          lastSeen: firestoreData['lastSeen']?.toDate() || new Date(),
          channels: firestoreData['channels'] || [],
          directMessages: firestoreData['directMessages'] || [],
          createdAt: firestoreData['createdAt']?.toDate() || new Date(),
          updatedAt: firestoreData['updatedAt']?.toDate() || new Date(),
        };

        // Update store with fresh Firestore data
        patchState(store, {
          user,
          isLoading: false,
          error: null,
        });

        console.log('✅ AuthStore user state updated:', {
          displayName: user.displayName,
          photoURL: user.photoURL,
        });
      } else {
        await handleSuccessfulAuth(currentUser);
      }
    } catch (error) {
      handleAuthError(error, 'Profile update failed');
    }
  },
});
