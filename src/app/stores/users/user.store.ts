/**
 * @fileoverview User Store for DABubble Application
 * @description NgRx SignalStore for managing user state
 * @module UserStore
 */

import { computed, inject } from '@angular/core';
import { User } from '@core/models/user.model';
import { UserService } from '@core/services/user/user.service';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { UserStateHelper } from '../helpers/user-state.helper';

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
      () => (uids: string[]) => store.users().filter((user) => uids.includes(user.uid)),
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
      async loadUsers(): Promise<void> {
        this.cleanup();
        this.startUserLoading();

        try {
          this.subscribeToUsers();
        } catch (error) {
          this.handleUsersLoadFailure(error);
        }
      },

      /**
       * Create new user
       */
      async createUser(userData: User): Promise<void> {
        await this.executeUserOperation(
          () => userService.createUser(userData),
          'Failed to create user',
          true,
        );
      },

      /**
       * Update user data
       */
      async updateUserData(uid: string, updates: Partial<User>): Promise<void> {
        await this.executeUserOperation(
          () => userService.updateUser(uid, updates),
          'Failed to update user',
          false,
          () => this.updateUserInState(uid, { ...updates, updatedAt: new Date() }),
        );
      },

      /**
       * Delete user
       */
      async deleteUser(uid: string): Promise<void> {
        await this.executeUserOperation(
          () => userService.deleteUser(uid),
          'Failed to delete user',
          false,
          () => this.removeUserFromState(uid),
        );
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
      cleanup(): void {
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
      },

      // === PRIVATE HELPER METHODS ===

      /**
       * Handle successful users load
       */
      handleUsersSuccess(users: User[]): void {
        patchState(store, { users, isLoading: false, error: null });
      },

      /**
       * Subscribe to real-time user updates.
       */
      subscribeToUsers(): void {
        unsubscribe = userService.setupUsersListener(
          (users) => this.handleUsersSuccess(users),
          (error) => this.handleUsersError(error),
        );
      },

      /**
       * Handle users listener error
       */
      handleUsersError(error: unknown): void {
        if (UserStateHelper.isPermissionError(error)) {
          this.resetUsersAfterPermissionError();
          return;
        }

        console.error('Error in users listener:', error);
        this.handleError(error, 'Failed to load users');
      },

      /**
       * Reset user state after permission-denied listener error.
       */
      resetUsersAfterPermissionError(): void {
        console.log('🔓 Permission error - cleaning up user subscription');
        this.cleanup();
        patchState(store, initialState);
      },

      /**
       * Handle initial user load setup failure.
       */
      handleUsersLoadFailure(error: unknown): void {
        this.handleError(error, 'Failed to load users');
      },

      /**
       * Update user in local state
       * @function updateUserInState
       * @param {string} uid - User ID to update
       * @param {Partial<User>} updates - Data to update
       */
      updateUserInState(uid: string, updates: Partial<User>): void {
        patchState(store, {
          users: UserStateHelper.updateUserInArray(store.users(), uid, updates),
          error: null,
        });
      },

      /**
       * Remove user from local state
       * @function removeUserFromState
       * @param {string} uid - User ID to remove
       */
      removeUserFromState(uid: string): void {
        patchState(store, {
          users: UserStateHelper.removeUserFromArray(store.users(), uid),
          selectedUser: store.selectedUser()?.uid === uid ? null : store.selectedUser(),
        });
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

      /**
       * Execute shared user operation flow.
       */
      async executeUserOperation(
        operation: () => Promise<void>,
        defaultMessage: string,
        withLoadingState: boolean,
        onSuccess?: () => void,
      ): Promise<void> {
        if (withLoadingState) {
          this.startUserLoading();
        }

        try {
          await operation();
          this.completeUserOperation(withLoadingState, onSuccess);
        } catch (error) {
          this.handleError(error, defaultMessage);
        }
      },

      /**
       * Apply successful user operation effects.
       */
      completeUserOperation(withLoadingState: boolean, onSuccess?: () => void): void {
        onSuccess?.();
        if (withLoadingState) {
          this.finishUserLoading();
        }
      },

      /**
       * Start user operation loading.
       */
      startUserLoading(): void {
        patchState(store, { isLoading: true, error: null });
      },

      /**
       * Finish user operation loading.
       */
      finishUserLoading(): void {
        patchState(store, { isLoading: false });
      },

      // === STATE MANAGEMENT HELPERS ===

      /**
       * Set all users in state
       * @function setUsers
       * @param {User[]} users - Array of users to set
       */
      setUsers(users: User[]): void {
        patchState(store, { users, error: null });
      },

      /**
       * Add user to state
       * @function addUser
       * @param {User} user - User to add
       */
      addUser(user: User): void {
        patchState(store, { users: UserStateHelper.appendUser(store.users(), user), error: null });
      },

      /**
       * Update user in state
       * @function updateUser
       * @param {string} uid - User ID to update
       * @param {Partial<User>} updates - Updates to apply
       */
      updateUser(uid: string, updates: Partial<User>): void {
        this.updateUserInState(uid, updates);
      },

      /**
       * Select user for detailed view
       * @function selectUser
       * @param {User | null} user - User to select or null to deselect
       */
      selectUser(user: User | null): void {
        patchState(store, { selectedUser: user });
      },

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

      clearError(): void {
        patchState(store, { error: null });
      },
    };
  }),
);
