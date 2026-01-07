/**
 * @fileoverview Profile Management Service
 * @description Handles user profile updates for both own and other users
 * @module core/services/profile-management
 */

import { Injectable, inject } from '@angular/core';
import { AuthStore } from '@stores/auth';
import { UserStore } from '@stores/user.store';

/**
 * Service for managing user profile updates
 */
@Injectable({
  providedIn: 'root',
})
export class ProfileManagementService {
  private authStore = inject(AuthStore);
  private userStore = inject(UserStore);

  /**
   * Update user profile (own or other user)
   * Automatically determines whether to update via AuthStore or UserStore
   * @param userId User ID to update
   * @param data Profile data to update
   */
  async updateUserProfile(
    userId: string,
    data: { displayName: string; isAdmin?: boolean }
  ): Promise<void> {
    const currentUserId = this.authStore.user()?.uid;

    if (userId === currentUserId) {
      // Update AuthStore for own profile (syncs to UserStore automatically)
      await this.authStore.updateUserProfile({ displayName: data.displayName });
    } else {
      // Update UserStore for other users
      await this.userStore.updateUserData(userId, {
        displayName: data.displayName,
        // TODO: isAdmin not in User model yet
      });
    }
  }
}
