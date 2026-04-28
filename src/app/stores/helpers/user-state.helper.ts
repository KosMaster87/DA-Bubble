/**
 * @fileoverview User State Helper
 * @description Pure helper functions for user store state updates
 * @module stores/helpers/user-state
 */

import { User } from '@core/models/user.model';
import { isPermissionError } from './shared-error.helpers';

export class UserStateHelper {
  /**
   * Update a single user inside the current user array.
   * @description Immutably replaces a matched user by uid so signal change detection sees a new array reference.
   */
  static updateUserInArray(users: User[], uid: string, updates: Partial<User>): User[] {
    return users.map((user) => (user.uid === uid ? { ...user, ...updates } : user));
  }

  /**
   * Remove a user from the current user array.
   * @description Filters out the given uid so the store state stays in sync with Firestore when a user document is deleted.
   */
  static removeUserFromArray(users: User[], uid: string): User[] {
    return users.filter((user) => user.uid !== uid);
  }

  /**
   * Append a user to the current user array.
   * @description Appends a freshly loaded user to the array without re-sorting to preserve the current display order.
   */
  static appendUser(users: User[], user: User): User[] {
    return [...users, user];
  }

  /**
   * Check whether an error indicates Firestore permission denial.
   * @description Delegates to the shared helper to keep permission-error detection logic in one place across all stores.
   */
  static isPermissionError(error: unknown): boolean {
    return isPermissionError(error);
  }
}
