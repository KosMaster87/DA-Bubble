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
 * @description Keeps the presence surface intentionally minimal — only online UIDs are stored, not full user objects, to avoid duplication with UserStore.
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
 * @description Zero-state baseline used both for store creation and cleanup resets on logout.
 */
const initialState: UserPresenceState = {
  onlineUsers: [],
  isLoading: false,
  error: null,
};

/**
 * User presence management store with Firestore integration
 * Provides methods for tracking user online/offline status
 * @description Encapsulates presence reads and writes so components consume a small API instead of managing Firestore presence queries directly.
 * @constant {SignalStore}
 */
export const UserPresenceStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    /**
     * Computed property for online user count
     * @returns {Signal<number>} Number of online users
     * @description Exposes count as a reactive signal so badge components don't need to read the full onlineUsers array.
     */
    onlineUserCount: computed(() => store.onlineUsers().length),

    /**
     * Computed function to check if user is online
     * @returns {Signal<Function>} Function that takes uid and returns online status
     * @description Returns a stable function reference so templates can call isUserOnline(uid) inside computed expressions without breaking signal tracking.
     */
    isUserOnline: computed(() => (uid: string) => store.onlineUsers().includes(uid)),

    /**
     * Computed property to get all online user IDs
     * @returns {Signal<string[]>} Array of online user IDs
     * @description Exposes the raw array for consumers that need to iterate over all online user IDs.
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
       * @description Public facade that keeps the API stable while the actual Firestore write and state update live in performSetUserOnline.
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
       * @description Public facade that keeps the API stable while the actual Firestore write and state update live in performSetUserOffline.
       */
      async setUserOffline(uid: string): Promise<void> {
        await this.performSetUserOffline(uid);
      },

      /**
       * Entry point: Batch update multiple users online status
       * @function updateMultipleUserPresence
       * @param {string[]} onlineUserIds - Array of online user IDs
       * @description Used after a Firestore snapshot update to sync all online IDs in one patchState call instead of per-user updates.
       */
      updateMultipleUserPresence(onlineUserIds: string[]): void {
        patchState(store, { onlineUsers: onlineUserIds });
      },

      /**
       * Entry point: Load all online users from Firestore
       * @async
       * @function loadOnlineUsers
       * @returns {Promise<void>}
       * @description One-shot fetch for initial load; use startPresenceListener for ongoing real-time updates.
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
       * @description Returns an unsubscribe function so the caller controls when the listener is torn down (e.g. on logout).
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
       * @description Delegates to the shared presence operation to keep set-online and set-offline code paths DRY.
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
       * @description Delegates to the shared presence operation to keep set-online and set-offline code paths DRY.
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
       * @description Writes both isOnline and lastSeen atomically so the Firestore document always reflects when the status changed.
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
       * @description Immutably updates the onlineUsers array to add or remove a single UID without replacing the whole array.
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
       * @description Shared implementation for online/offline flows to avoid duplicating error handling and Firestore write logic.
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
       * @description Extracts document IDs from a snapshot to update the onlineUsers array in one patchState call.
       */
      setOnlineUsersFromSnapshot(snapshot: { docs: Array<{ id: string }> }): void {
        patchState(store, { onlineUsers: snapshot.docs.map((doc) => doc.id) });
      },

      /**
       * Handle errors and update state
       * @function handleError
       * @param {unknown} error - Error object
       * @param {string} defaultMessage - Default error message
       * @description Normalises errors to strings before storing in state so templates can bind the error message without type guards.
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
       * @description Allows callers to control the loading indicator independently of async operation lifecycle.
       */
      setLoading(isLoading: boolean): void {
        patchState(store, { isLoading });
      },

      /**
       * Set error message
       * @function setError
       * @param {string | null} error - Error message or null to clear
       * @description Exposes direct error mutation so callers can pre-set or clear errors before async operations.
       */
      setError(error: string | null): void {
        patchState(store, { error });
      },

      /**
       * Clear error message
       * @function clearError
       * @description Convenience reset for components that need to dismiss errors after the user acknowledges them.
       */
      clearError(): void {
        patchState(store, { error: null });
      },

      /**
       * Clear all online users from state
       * @function clearOnlineUsers
       * @description Used on logout to reset the presence list so stale online indicators don't persist into the next session.
       */
      clearOnlineUsers(): void {
        patchState(store, { onlineUsers: [] });
      },
    };
  }),
);
