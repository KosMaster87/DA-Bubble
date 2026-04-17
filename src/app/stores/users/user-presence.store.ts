/**
 * @fileoverview User presence management store with NgRx SignalStore
 * Provides state management for user online/offline status and presence tracking.
 * @description This store handles user presence operations including online status,
 * last seen timestamps, and real-time presence updates.
 * @module UserPresenceStore
 */

import { computed, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

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
      async setUserOnline(uid: string): Promise<void> {
        await this.performSetUserOnline(uid);
      },

      /**
       * Entry point: Set user as offline
       * @async
       * @function setUserOffline
       * @param {string} uid - User ID to set offline
       * @returns {Promise<void>}
       */
      async setUserOffline(uid: string): Promise<void> {
        await this.performSetUserOffline(uid);
      },

      /**
       * Entry point: Batch update multiple users online status
       * @function updateMultipleUserPresence
       * @param {string[]} onlineUserIds - Array of online user IDs
       */
      updateMultipleUserPresence(onlineUserIds: string[]): void {
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
          this.setOnlineUsersFromSnapshot(snapshot);
        } catch (error) {
          this.handleError(error, 'Failed to load online users');
        }
      },

      /**
       * Entry point: Start listening to online user changes
       * @function startPresenceListener
       * @returns {Function} Unsubscribe function
       */
      startPresenceListener(): () => void {
        const q = query(usersCollection, where('isOnline', '==', true), limit(100));
        return onSnapshot(q, (snapshot) => {
          this.setOnlineUsersFromSnapshot(snapshot);
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
      async performSetUserOnline(uid: string): Promise<void> {
        await this.executePresenceOperation(uid, true, 'Failed to set user online');
      },

      /**
       * Implementation: Set user offline in Firestore and state
       * @async
       * @function performSetUserOffline
       * @param {string} uid - User ID to set offline
       * @returns {Promise<void>}
       */
      async performSetUserOffline(uid: string): Promise<void> {
        await this.executePresenceOperation(uid, false, 'Failed to set user offline');
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
      async updateUserPresenceInFirestore(uid: string, isOnline: boolean): Promise<void> {
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
      updateUserPresence(uid: string, isOnline: boolean): void {
        const currentOnlineUsers = store.onlineUsers();
        if (isOnline && !currentOnlineUsers.includes(uid)) {
          patchState(store, { onlineUsers: [...currentOnlineUsers, uid] });
        } else if (!isOnline) {
          patchState(store, { onlineUsers: currentOnlineUsers.filter((id) => id !== uid) });
        }
      },

      /**
       * Execute shared presence update flow.
       */
      async executePresenceOperation(
        uid: string,
        isOnline: boolean,
        defaultMessage: string,
      ): Promise<void> {
        try {
          await this.updateUserPresenceInFirestore(uid, isOnline);
          this.updateUserPresence(uid, isOnline);
        } catch (error) {
          this.handleError(error, defaultMessage);
        }
      },

      /**
       * Set online users from a Firestore snapshot.
       */
      setOnlineUsersFromSnapshot(snapshot: { docs: Array<{ id: string }> }): void {
        patchState(store, { onlineUsers: snapshot.docs.map((doc) => doc.id) });
      },

      /**
       * Handle errors and update state
       * @function handleError
       * @param {unknown} error - Error object
       * @param {string} defaultMessage - Default error message
       */
      handleError(error: unknown, defaultMessage: string): void {
        const errorMessage = error instanceof Error ? error.message : defaultMessage;
        patchState(store, { error: errorMessage, isLoading: false });
      },

      // === STATE MANAGEMENT HELPERS ===

      /**
       * Set loading state
       * @function setLoading
       * @param {boolean} isLoading - Loading state
       */
      setLoading(isLoading: boolean): void {
        patchState(store, { isLoading });
      },

      /**
       * Set error message
       * @function setError
       * @param {string | null} error - Error message or null to clear
       */
      setError(error: string | null): void {
        patchState(store, { error });
      },

      /**
       * Clear error message
       * @function clearError
       */
      clearError(): void {
        patchState(store, { error: null });
      },

      /**
       * Clear all online users from state
       * @function clearOnlineUsers
       */
      clearOnlineUsers(): void {
        patchState(store, { onlineUsers: [] });
      },
    };
  }),
);
