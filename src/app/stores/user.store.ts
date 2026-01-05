/**
 * @fileoverview User Store for DABubble Application
 * @description NgRx SignalStore for managing user state with Firestore integration
 * @module UserStore
 */

import { computed, inject } from '@angular/core';
import { signalStore, withState, withMethods, withComputed, patchState } from '@ngrx/signals';
import {
  Firestore,
  collection,
  doc,
  updateDoc,
  getDocs,
  getDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from '@angular/fire/firestore';
import { User } from '@core/models/user.model';

/**
 * Normalize Google profile photo URL to a shorter, stable format
 * @param photoURL - The original photo URL from Google
 * @returns Normalized photo URL or undefined
 */
const normalizeGooglePhotoURL = (photoURL: string | null | undefined): string | undefined => {
  if (!photoURL) return undefined;

  // Check if it's a Google photo URL
  if (photoURL.includes('googleusercontent.com')) {
    // Remove any existing size parameters and add =s96-c
    // This handles both short and long Google photo URLs
    const baseUrl = photoURL.split('=')[0].split('?')[0];
    return `${baseUrl}=s96-c`;
  }

  return photoURL;
};

/**
 * User management state interface
 * @interface UserState
 */
export interface UserState {
  users: User[];
  selectedUser: User | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Initial user state
 * @constant {UserState}
 */
const initialState: UserState = {
  users: [],
  selectedUser: null,
  isLoading: false,
  error: null,
};

/**
 * User management store with Firestore integration
 * Provides methods for user CRUD operations and presence management
 * @constant {SignalStore}
 */
export const UserStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    userCount: computed(() => store.users().length),
    getUserById: computed(() => (uid: string) => store.users().find((user) => user.uid === uid)),
    getUsersByIds: computed(
      () => (uids: string[]) => store.users().filter((user) => uids.includes(user.uid))
    ),
  })),
  withMethods((store) => {
    const firestore = inject(Firestore);
    const usersCollection = collection(firestore, 'users');
    let unsubscribe: (() => void) | null = null;

    return {
      // === ENTRY POINT METHODS ===

      /**
       * Entry point: Load all users from Firestore
       * @async
       * @function loadUsers
       * @returns {Promise<void>}
       */
      async loadUsers() {
        await this.performLoad();
      },

      /**
       * Entry point: Create new user
       * @async
       * @function createUser
       * @param {User} userData - User data to create
       * @returns {Promise<void>}
       */
      async createUser(userData: User) {
        await this.performCreate(userData);
      },

      /**
       * Entry point: Update user data
       * @async
       * @function updateUserData
       * @param {string} uid - User ID to update
       * @param {Partial<User>} updates - Data to update
       * @returns {Promise<void>}
       */
      async updateUserData(uid: string, updates: Partial<User>) {
        await this.performUpdate(uid, updates);
      },

      /**
       * Entry point: Delete user
       * @async
       * @function deleteUser
       * @param {string} uid - User ID to delete
       * @returns {Promise<void>}
       */
      async deleteUser(uid: string) {
        await this.performDelete(uid);
      },

      /**
       * Entry point: Fetch user by ID from Firestore
       * @async
       * @function fetchUserById
       * @param {string} uid - User ID to fetch
       * @returns {Promise<User | null>} User data or null if not found
       */
      async fetchUserById(uid: string): Promise<User | null> {
        return await this.performGetById(uid);
      },

      // === IMPLEMENTATION METHODS ===

      /**
       * Implementation: Load all users from Firestore with real-time updates
       * @async
       * @function performLoad
       * @returns {Promise<void>}
       */
      async performLoad() {
        // Unsubscribe from previous listener if exists
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }

        patchState(store, { isLoading: true });
        try {
          // Set up real-time listener for users
          const q = query(usersCollection, orderBy('createdAt', 'desc'));

          unsubscribe = onSnapshot(
            q,
            (snapshot) => {
              const users = this.mapUsersFromSnapshot(snapshot);
              patchState(store, { users, isLoading: false, error: null });
            },
            (error: any) => {
              // Auto-cleanup on permission error (user logged out)
              if (error.code === 'permission-denied' || error.message?.includes('permissions')) {
                console.log('🔓 Permission error detected - cleaning up user subscription');
                if (unsubscribe) {
                  unsubscribe();
                  unsubscribe = null;
                }
                patchState(store, initialState);
                return;
              }
              console.error('Error in users listener:', error);
              this.handleError(error, 'Failed to load users');
            }
          );
        } catch (error) {
          this.handleError(error, 'Failed to load users');
        }
      },

      /**
       * Cleanup when store is destroyed
       */
      cleanup(): void {
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
        patchState(store, initialState);
      },

      /**
       * Implementation: Create new user in Firestore
       * @async
       * @function performCreate
       * @param {User} userData - User data to create
       * @returns {Promise<void>}
       */
      async performCreate(userData: User) {
        patchState(store, { isLoading: true, error: null });
        try {
          const userDoc = doc(usersCollection, userData.uid);
          const userWithTimestamps = this.addTimestamps(userData);
          await updateDoc(userDoc, { ...userWithTimestamps });
          patchState(store, { users: [...store.users(), userWithTimestamps], isLoading: false });
        } catch (error) {
          this.handleError(error, 'Failed to create user');
        }
      },

      /**
       * Implementation: Update user data in Firestore
       * @async
       * @function performUpdate
       * @param {string} uid - User ID to update
       * @param {Partial<User>} updates - Data to update
       * @returns {Promise<void>}
       */
      async performUpdate(uid: string, updates: Partial<User>) {
        try {
          const userDoc = doc(usersCollection, uid);
          const updatesWithTimestamp = { ...updates, updatedAt: new Date() };
          await updateDoc(userDoc, updatesWithTimestamp);
          this.updateUserInState(uid, updatesWithTimestamp);
        } catch (error) {
          this.handleError(error, 'Failed to update user');
        }
      },

      /**
       * Implementation: Delete user from Firestore
       * @async
       * @function performDelete
       * @param {string} uid - User ID to delete
       * @returns {Promise<void>}
       */
      async performDelete(uid: string) {
        try {
          const userDoc = doc(usersCollection, uid);
          await deleteDoc(userDoc);
          this.removeUserFromState(uid);
        } catch (error) {
          this.handleError(error, 'Failed to delete user');
        }
      },

      /**
       * Implementation: Get user by ID from Firestore
       * @async
       * @function performGetById
       * @param {string} uid - User ID to get
       * @returns {Promise<User | null>} User data or null if not found
       */
      async performGetById(uid: string): Promise<User | null> {
        try {
          const userDoc = doc(usersCollection, uid);
          const snapshot = await getDoc(userDoc);
          return snapshot.exists() ? ({ uid, ...snapshot.data() } as User) : null;
        } catch (error) {
          this.handleError(error, 'Failed to get user');
          return null;
        }
      },

      // === HELPER FUNCTIONS ===

      /**
       * Map Firestore snapshot to User array
       * @function mapUsersFromSnapshot
       * @param {any} snapshot - Firestore query snapshot
       * @returns {User[]} Array of user objects
       */
      mapUsersFromSnapshot(snapshot: any): User[] {
        return snapshot.docs.map((doc: any) => {
          const data = doc.data();
          const originalPhotoURL = data.photoURL;
          const normalizedPhotoURL = normalizeGooglePhotoURL(data.photoURL);

          return {
            uid: doc.id,
            ...data,
            photoURL: normalizedPhotoURL,
          } as User;
        });
      },

      /**
       * Add timestamps to user data
       * @function addTimestamps
       * @param {User} userData - User data to add timestamps to
       * @returns {User} User data with timestamps
       */
      addTimestamps(userData: User): User {
        const now = new Date();
        return {
          ...userData,
          createdAt: userData.createdAt || now,
          updatedAt: now,
        };
      },

      /**
       * Update user in local state
       * @function updateUserInState
       * @param {string} uid - User ID to update
       * @param {Partial<User>} updates - Data to update
       */
      updateUserInState(uid: string, updates: Partial<User>) {
        patchState(store, {
          users: store.users().map((user) => (user.uid === uid ? { ...user, ...updates } : user)),
          error: null,
        });
      },

      /**
       * Remove user from local state
       * @function removeUserFromState
       * @param {string} uid - User ID to remove
       */
      removeUserFromState(uid: string) {
        patchState(store, {
          users: store.users().filter((user) => user.uid !== uid),
          selectedUser: store.selectedUser()?.uid === uid ? null : store.selectedUser(),
        });
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
       * Set all users in state
       * @function setUsers
       * @param {User[]} users - Array of users to set
       */
      setUsers(users: User[]) {
        patchState(store, { users, error: null });
      },

      /**
       * Add user to state
       * @function addUser
       * @param {User} user - User to add
       */
      addUser(user: User) {
        patchState(store, { users: [...store.users(), user], error: null });
      },

      /**
       * Update user in state
       * @function updateUser
       * @param {string} uid - User ID to update
       * @param {Partial<User>} updates - Updates to apply
       */
      updateUser(uid: string, updates: Partial<User>) {
        this.updateUserInState(uid, updates);
      },

      /**
       * Select user for detailed view
       * @function selectUser
       * @param {User | null} user - User to select or null to deselect
       */
      selectUser(user: User | null) {
        patchState(store, { selectedUser: user });
      },

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

      clearError() {
        patchState(store, { error: null });
      },
    };
  })
);
