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
 * @description Holds the full user list alongside selection and async state so
 * components can display users and respond to loading/error conditions reactively.
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
 * @description Zero-value baseline shared by initialization and post-logout cleanup
 * so the store always starts from a known predictable condition.
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
 * @description Owns the real-time user list listener and exposes computed accessors
 * so components never need to filter or map the raw users array themselves.
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
       * @description Cleans up any existing listener before starting a fresh
       * subscription so stale callbacks do not accumulate across calls.
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
       * @description Delegates to the operation executor so loading state and error
       * handling are applied consistently with all other mutation methods.
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
       * @description Applies an optimistic local update alongside the Firestore write
       * so the UI reflects changes immediately without waiting for a snapshot.
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
       * @description Removes the user from local state optimistically after the
       * Firestore delete succeeds to keep the list in sync without re-fetching.
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
       * @description Performs a one-shot read for cases where the real-time listener
       * has not yet populated the user — e.g. profile page initial load.
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
       * @description Detaches the Firestore listener to prevent memory leaks and
       * permission errors after the user logs out.
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
       * @description Replaces the users array atomically and clears error state so
       * the UI transitions cleanly from loading to populated.
       */
      handleUsersSuccess(users: User[]): void {
        patchState(store, { users, isLoading: false, error: null });
      },

      /**
       * Subscribe to real-time user updates.
       * @description Stores the unsubscribe handle so `cleanup` can detach the
       * listener without needing a reference to the underlying Firestore query.
       */
      subscribeToUsers(): void {
        unsubscribe = userService.setupUsersListener(
          (users) => this.handleUsersSuccess(users),
          (error) => this.handleUsersError(error),
        );
      },

      /**
       * Handle users listener error
       * @description Distinguishes permission errors from other failures so a
       * post-logout permission denial does not surface as a visible error message.
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
       * @description Detaches the listener and resets to initial state so the store
       * is clean when a new user session begins.
       */
      resetUsersAfterPermissionError(): void {
        console.log('🔓 Permission error - cleaning up user subscription');
        this.cleanup();
        patchState(store, initialState);
      },

      /**
       * Handle initial user load setup failure.
       * @description Wraps `handleError` so the error-reporting path for setup
       * failures is separate from the listener error path.
       */
      handleUsersLoadFailure(error: unknown): void {
        this.handleError(error, 'Failed to load users');
      },

      /**
       * Update user in local state
       * @description Uses `UserStateHelper` for the array update so the immutability
       * pattern is consistent with how the user list is managed everywhere.
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
       * @description Clears the selection if the removed user is currently selected
       * to prevent dangling references in the UI.
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
       * @description Normalizes errors to strings and clears loading state atomically
       * so the store never remains stuck in an in-progress condition.
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
       * @description Centralizes loading-state lifecycle and error handling so
       * each user mutation only contains its specific service call.
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
       * @description Runs the optional success callback and conditionally clears
       * loading state in the correct order after a successful write.
       */
      completeUserOperation(withLoadingState: boolean, onSuccess?: () => void): void {
        onSuccess?.();
        if (withLoadingState) {
          this.finishUserLoading();
        }
      },

      /**
       * Start user operation loading.
       * @description Pairs with `finishUserLoading` to bookend loading state for
       * operations that need a visible in-progress indicator.
       */
      startUserLoading(): void {
        patchState(store, { isLoading: true, error: null });
      },

      /**
       * Finish user operation loading.
       * @description Clears the loading flag set by `startUserLoading` after a
       * successful mutation so the UI returns to its idle state.
       */
      finishUserLoading(): void {
        patchState(store, { isLoading: false });
      },

      // === STATE MANAGEMENT HELPERS ===

      /**
       * Set all users in state
       * @description Replaces the entire user array atomically, used by tests and
       * scenarios where a full list refresh is preferable to incremental updates.
       * @function setUsers
       * @param {User[]} users - Array of users to set
       */
      setUsers(users: User[]): void {
        patchState(store, { users, error: null });
      },

      /**
       * Add user to state
       * @description Appends a single user without replacing the full array so
       * other users' signals are not re-evaluated unnecessarily.
       * @function addUser
       * @param {User} user - User to add
       */
      addUser(user: User): void {
        patchState(store, { users: UserStateHelper.appendUser(store.users(), user), error: null });
      },

      /**
       * Update user in state
       * @description Public alias for `updateUserInState` to keep the external API
       * consistent with the naming convention used by component-facing store methods.
       * @function updateUser
       * @param {string} uid - User ID to update
       * @param {Partial<User>} updates - Updates to apply
       */
      updateUser(uid: string, updates: Partial<User>): void {
        this.updateUserInState(uid, updates);
      },

      /**
       * Select user for detailed view
       * @description Stores the selection in the store so multiple components can
       * react to the active user without local component state.
       * @function selectUser
       * @param {User | null} user - User to select or null to deselect
       */
      selectUser(user: User | null): void {
        patchState(store, { selectedUser: user });
      },

      /**
       * Set loading state
       * @description Allows external callers to coordinate loading indicators for
       * operations that span multiple store method calls.
       * @function setLoading
       * @param {boolean} isLoading - Loading state
       */
      setLoading(isLoading: boolean): void {
        patchState(store, { isLoading });
      },

      /**
       * Set error message
       * @description Allows components to surface custom errors not produced by the
       * standard store error path.
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
