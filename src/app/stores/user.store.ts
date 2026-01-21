/**
 * @fileoverview User Store for DABubble Application
 * @description NgRx SignalStore for managing user state
 * @module UserStore
 */

import { computed, inject } from '@angular/core';
import { signalStore, withState, withMethods, withComputed, patchState } from '@ngrx/signals';
import { User } from '@core/models/user.model';
import { UserService } from '@core/services/user/user.service';

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
    const userService = inject(UserService);
    let unsubscribe: (() => void) | null = null;

    return {
      // === PUBLIC METHODS ===

      /**
       * Load all users with real-time updates
       */
      async loadUsers() {
        this.cleanup();
        patchState(store, { isLoading: true });

        try {
          unsubscribe = userService.setupUsersListener(
            (users) => this.handleUsersSuccess(users),
            (error) => this.handleUsersError(error)
          );
        } catch (error) {
          this.handleError(error, 'Failed to load users');
        }
      },

      /**
       * Create new user
       */
      async createUser(userData: User) {
        patchState(store, { isLoading: true, error: null });
        try {
          await userService.createUser(userData);
          patchState(store, { isLoading: false });
        } catch (error) {
          this.handleError(error, 'Failed to create user');
        }
      },

      /**
       * Update user data
       */
      async updateUserData(uid: string, updates: Partial<User>) {
        try {
          await userService.updateUser(uid, updates);
          this.updateUserInState(uid, { ...updates, updatedAt: new Date() });
        } catch (error) {
          this.handleError(error, 'Failed to update user');
        }
      },

      /**
       * Delete user
       */
      async deleteUser(uid: string) {
        try {
          await userService.deleteUser(uid);
          this.removeUserFromState(uid);
        } catch (error) {
          this.handleError(error, 'Failed to delete user');
        }
      },

      /**
       * Fetch user by ID from Firestore
       */
      async fetchUserById(uid: string): Promise<User | null> {
        try {
          return await userService.getUserById(uid);
        } catch (error) {
          this.handleError(error, 'Failed to get user');
          return null;
        }
      },

      /**
       * Cleanup when store is destroyed
       */
      cleanup() {
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
      },

      // === PRIVATE HELPER METHODS ===

      /**
       * Handle successful users load
       */
      handleUsersSuccess(users: User[]) {
        patchState(store, { users, isLoading: false, error: null });
      },

      /**
       * Handle users listener error
       */
      handleUsersError(error: any) {
        if (error.code === 'permission-denied' || error.message?.includes('permissions')) {
          console.log('🔓 Permission error - cleaning up user subscription');
          this.cleanup();
          patchState(store, initialState);
          return;
        }

        console.error('Error in users listener:', error);
        this.handleError(error, 'Failed to load users');
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
