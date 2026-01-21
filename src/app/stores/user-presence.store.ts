/**
 * @fileoverview User presence management store with NgRx SignalStore
 * Provides state management for user online/offline status and presence tracking.
 * @description This store handles user presence operations including online status,
 * last seen timestamps, and real-time presence updates.
 * @module UserPresenceStore
 */

import { computed, inject } from '@angular/core';
import { signalStore, withState, withMethods, withComputed, patchState } from '@ngrx/signals';
import {
  Firestore,
  collection,
  doc,
  updateDoc,
  query,
  where,
  onSnapshot,
  getDocs,
  limit,
} from '@angular/fire/firestore';

/**
 * State interface for user presence management
 * @interface UserPresenceState
 */
export interface UserPresenceState {
  /** Array of UIDs for users currently online */
  onlineUsers: string[];
  /** Loading state indicator */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
}

/**
 * Initial user presence state
 * @constant {UserPresenceState}
 */
const initialState: UserPresenceState = {
  onlineUsers: [],
  isLoading: false,
  error: null,
};

/**
 * User presence management store with Firestore integration
 * Provides methods for tracking user online/offline status
 * @constant {SignalStore}
 */
export const UserPresenceStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    /**
     * Computed property for online user count
     * @returns {Signal<number>} Number of online users
     */
    onlineUserCount: computed(() => store.onlineUsers().length),

    /**
     * Computed function to check if user is online
     * @returns {Signal<Function>} Function that takes uid and returns online status
     */
    isUserOnline: computed(() => (uid: string) => store.onlineUsers().includes(uid)),

    /**
     * Computed property to get all online user IDs
     * @returns {Signal<string[]>} Array of online user IDs
     */
    onlineUserIds: computed(() => store.onlineUsers()),
  })),
  withMethods((store) => {
    const firestore = inject(Firestore);
    const usersCollection = collection(firestore, 'users');

    return {
      // === ENTRY POINT METHODS ===

      /**
       * Entry point: Set user as online
       * @async
       * @function setUserOnline
       * @param {string} uid - User ID to set online
       * @returns {Promise<void>}
       */
      async setUserOnline(uid: string) {
        await this.performSetUserOnline(uid);
      },

      /**
       * Entry point: Set user as offline
       * @async
       * @function setUserOffline
       * @param {string} uid - User ID to set offline
       * @returns {Promise<void>}
       */
      async setUserOffline(uid: string) {
        await this.performSetUserOffline(uid);
      },

      /**
       * Entry point: Batch update multiple users online status
       * @function updateMultipleUserPresence
       * @param {string[]} onlineUserIds - Array of online user IDs
       */
      updateMultipleUserPresence(onlineUserIds: string[]) {
        patchState(store, { onlineUsers: onlineUserIds });
      },

      /**
       * Entry point: Load all online users from Firestore
       * @async
       * @function loadOnlineUsers
       * @returns {Promise<void>}
       */
      async loadOnlineUsers(): Promise<void> {
        try {
          const q = query(usersCollection, where('isOnline', '==', true));
          const snapshot = await getDocs(q);
          const onlineUserIds = snapshot.docs.map((doc) => doc.id);
          patchState(store, { onlineUsers: onlineUserIds });
        } catch (error) {
          this.handleError(error, 'Failed to load online users');
        }
      },

      /**
       * Entry point: Start listening to online user changes
       * @function startPresenceListener
       * @returns {Function} Unsubscribe function
       */
      startPresenceListener() {
        const q = query(usersCollection, where('isOnline', '==', true), limit(100));
        return onSnapshot(q, (snapshot) => {
          const onlineUserIds = snapshot.docs.map((doc) => doc.id);
          patchState(store, { onlineUsers: onlineUserIds });
        });
      },

      // === IMPLEMENTATION METHODS ===

      /**
       * Implementation: Set user online in Firestore and state
       * @async
       * @function performSetUserOnline
       * @param {string} uid - User ID to set online
       * @returns {Promise<void>}
       */
      async performSetUserOnline(uid: string) {
        try {
          await this.updateUserPresenceInFirestore(uid, true);
          this.updateUserPresence(uid, true);
        } catch (error) {
          this.handleError(error, 'Failed to set user online');
        }
      },

      /**
       * Implementation: Set user offline in Firestore and state
       * @async
       * @function performSetUserOffline
       * @param {string} uid - User ID to set offline
       * @returns {Promise<void>}
       */
      async performSetUserOffline(uid: string) {
        try {
          await this.updateUserPresenceInFirestore(uid, false);
          this.updateUserPresence(uid, false);
        } catch (error) {
          this.handleError(error, 'Failed to set user offline');
        }
      },

      // === HELPER FUNCTIONS ===

      /**
       * Update user presence in Firestore
       * @async
       * @function updateUserPresenceInFirestore
       * @param {string} uid - User ID
       * @param {boolean} isOnline - Online status
       * @returns {Promise<void>}
       */
      async updateUserPresenceInFirestore(uid: string, isOnline: boolean) {
        const userDoc = doc(usersCollection, uid);
        await updateDoc(userDoc, {
          isOnline,
          lastSeen: new Date(),
        });
      },

      /**
       * Update user presence in local state
       * @function updateUserPresence
       * @param {string} uid - User ID
       * @param {boolean} isOnline - Online status
       */
      updateUserPresence(uid: string, isOnline: boolean) {
        const currentOnlineUsers = store.onlineUsers();
        if (isOnline && !currentOnlineUsers.includes(uid)) {
          patchState(store, { onlineUsers: [...currentOnlineUsers, uid] });
        } else if (!isOnline) {
          patchState(store, { onlineUsers: currentOnlineUsers.filter((id) => id !== uid) });
        }
      },

      /**
       * Handle errors and update state
       * @function handleError
       * @param {unknown} error - Error object
       * @param {string} defaultMessage - Default error message
       */
      handleError(error: unknown, defaultMessage: string) {
        const errorMessage = error instanceof Error ? error.message : defaultMessage;
        patchState(store, { error: errorMessage, isLoading: false });
      },

      // === STATE MANAGEMENT HELPERS ===

      /**
       * Set loading state
       * @function setLoading
       * @param {boolean} isLoading - Loading state
       */
      setLoading(isLoading: boolean) {
        patchState(store, { isLoading });
      },

      /**
       * Set error message
       * @function setError
       * @param {string | null} error - Error message or null to clear
       */
      setError(error: string | null) {
        patchState(store, { error });
      },

      /**
       * Clear error message
       * @function clearError
       */
      clearError() {
        patchState(store, { error: null });
      },

      /**
       * Clear all online users from state
       * @function clearOnlineUsers
       */
      clearOnlineUsers() {
        patchState(store, { onlineUsers: [] });
      },
    };
  })
);
