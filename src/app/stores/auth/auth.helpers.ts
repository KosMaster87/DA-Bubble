/**
 * @fileoverview Authentication Helper Functions
 * @description Utility functions for authentication state management
 * @module AuthHelpers
 */

import { User as FirebaseUser } from '@angular/fire/auth';
import { Firestore, doc, getDoc, onSnapshot, Unsubscribe } from '@angular/fire/firestore';
import { User } from '@core/models/user.model';
import { patchState } from '@ngrx/signals';
import type { AuthState } from './auth.types';

/**
 * Convert Firebase user to app User model
 * @function mapFirebaseUserToUser
 * @param {FirebaseUser} firebaseUser - Firebase user object
 * @returns {User} App user object
 */
export const mapFirebaseUserToUser = (firebaseUser: FirebaseUser): User => ({
  uid: firebaseUser.uid,
  email: firebaseUser.email || '',
  displayName: firebaseUser.displayName || '',
  photoURL: firebaseUser.photoURL || undefined,
  isOnline: true,
  lastSeen: new Date(),
  channels: [],
  directMessages: [],
  createdAt: new Date(),
  updatedAt: new Date(),
});

/**
 * Handle user authenticated state
 * @function createAuthStateHandlers
 * @param {any} store - NgRx Signal Store instance
 * @param {Firestore} firestore - Firestore instance
 * @returns {object} Handler functions
 */
export const createAuthStateHandlers = (store: any, firestore: Firestore) => {
  let userDocListener: Unsubscribe | null = null;

  return {
    /**
     * Handle user authenticated state
     * Loads user data from Firestore to get displayName and other fields
     * @param {FirebaseUser} firebaseUser - Firebase user object
     */
    handleUserAuthenticated: async (firebaseUser: FirebaseUser): Promise<void> => {
      try {
        // Cleanup previous listener if exists
        if (userDocListener) {
          userDocListener();
          userDocListener = null;
        }

        // Try to load user data from Firestore first
        const userDocRef = doc(firestore, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);

        let user: User;
        if (userDoc.exists()) {
          // Use Firestore data which has the correct displayName
          const firestoreData = userDoc.data();
          user = {
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
        } else {
          // Fallback to Firebase Auth data only
          user = mapFirebaseUserToUser(firebaseUser);
        }

        patchState(store, { user, isAuthenticated: true, isLoading: false });

        // Setup real-time listener for user document changes (e.g., directMessages updates)
        userDocListener = onSnapshot(userDocRef, (snapshot) => {
          if (snapshot.exists()) {
            const firestoreData = snapshot.data();
            const currentUser = store.user();
            const newDirectMessages = firestoreData['directMessages'] || [];

            // Only update if directMessages actually changed
            const directMessagesChanged =
              !currentUser ||
              JSON.stringify(currentUser.directMessages) !== JSON.stringify(newDirectMessages);

            if (directMessagesChanged) {
              const updatedUser: User = {
                uid: firestoreData['uid'],
                email: firestoreData['email'],
                displayName: firestoreData['displayName'],
                photoURL: firestoreData['photoURL'],
                isOnline: firestoreData['isOnline'],
                lastSeen: firestoreData['lastSeen']?.toDate() || new Date(),
                channels: firestoreData['channels'] || [],
                directMessages: newDirectMessages,
                createdAt: firestoreData['createdAt']?.toDate() || new Date(),
                updatedAt: firestoreData['updatedAt']?.toDate() || new Date(),
              };
              patchState(store, { user: updatedUser });
              console.log('🔄 User document updated:', {
                directMessages: updatedUser.directMessages.length,
              });
            }
          }
        });
      } catch (error) {
        console.warn('Failed to load user from Firestore, using Auth data:', error);
        // Fallback to Firebase Auth data
        const user = mapFirebaseUserToUser(firebaseUser);
        patchState(store, { user, isAuthenticated: true, isLoading: false });
      }
    },

    /**
     * Handle user logged out state
     */
    handleUserLoggedOut: (): void => {
      // Cleanup listener
      if (userDocListener) {
        userDocListener();
        userDocListener = null;
      }
      patchState(store, { user: null, isAuthenticated: false, isLoading: false });
    },

    /**
     * Handle successful authentication response
     * Loads user data from Firestore to ensure we have the latest photoURL and other data
     * @param {FirebaseUser} firebaseUser - Firebase user object
     */
    handleSuccessfulAuth: async (firebaseUser: FirebaseUser): Promise<void> => {
      try {
        // Load user data from Firestore to get photoURL and other fields
        const userDocRef = doc(firestore, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);

        let user: User;
        if (userDoc.exists()) {
          // Use Firestore data which has the complete profile including photoURL
          const firestoreData = userDoc.data();
          user = {
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
          console.log('✅ User data loaded from Firestore:', {
            displayName: user.displayName,
            photoURL: user.photoURL,
          });
        } else {
          // Fallback to Firebase Auth data
          user = mapFirebaseUserToUser(firebaseUser);
          console.warn('⚠️ No Firestore document found, using Auth data');
        }

        patchState(store, {
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.error('Failed to load user from Firestore:', error);
        // Fallback to Firebase Auth data
        const user = mapFirebaseUserToUser(firebaseUser);
        patchState(store, {
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      }
    },

    /**
     * Handle authentication errors
     * @param {unknown} error - Error object
     * @param {string} defaultMessage - Default error message
     */
    handleAuthError: (error: unknown, defaultMessage: string): void => {
      const errorMessage = error instanceof Error ? error.message : defaultMessage;
      patchState(store, { error: errorMessage, isLoading: false });
    },
  };
};
