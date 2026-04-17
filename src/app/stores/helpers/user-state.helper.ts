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
   */
  static updateUserInArray(users: User[], uid: string, updates: Partial<User>): User[] {
    return users.map((user) => (user.uid === uid ? { ...user, ...updates } : user));
  }

  /**
   * Remove a user from the current user array.
   */
  static removeUserFromArray(users: User[], uid: string): User[] {
    return users.filter((user) => user.uid !== uid);
  }

  /**
   * Append a user to the current user array.
   */
  static appendUser(users: User[], user: User): User[] {
    return [...users, user];
  }

  /**
   * Check whether an error indicates Firestore permission denial.
   */
  static isPermissionError(error: unknown): boolean {
    return isPermissionError(error);
  }
}
