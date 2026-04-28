/**
 * @fileoverview Workspace Header State Service
 * @description Centralizes header-specific derived signals so the workspace header stays declarative and store access remains encapsulated.
 * @module core/services/workspace-header-state
 */

import { computed, inject, Injectable, Signal } from '@angular/core';
import type { User } from '@core/models/user.model';
import { AuthStore } from '@stores/auth';

export interface ProfileUser {
  id: string;
  displayName: string;
  email: string;
  photoURL: string;
  status: 'online' | 'offline';
  isAdmin: boolean;
}

export interface EditProfileUser {
  id: string;
  displayName: string;
  email: string;
  photoURL: string;
  isAdmin: boolean;
}

@Injectable({ providedIn: 'root' })
export class WorkspaceHeaderStateService {
  private authStore = inject(AuthStore);

  /**
   * Get current user as ProfileUser
   * @description Wraps auth state in a computed signal so the header view stays reactive to login/logout without subscribing to observables.
   * @returns {Signal<ProfileUser | null>} Profile user or null
   */
  getProfileUser = (): Signal<ProfileUser | null> => {
    return computed(() => {
      const user = this.authStore.user();
      if (!user) return null;
      return this.toProfileUser(user);
    });
  };

  /**
   * Get current user as EditProfileUser
   * @description Provides the mutable subset of the current user for the profile edit form, reactive to auth state.
   * @returns {Signal<EditProfileUser | null>} Edit profile user or null
   */
  getEditProfileUser = (): Signal<EditProfileUser | null> => {
    return computed(() => {
      const user = this.authStore.user();
      if (!user) return null;
      return this.toEditProfileUser(user);
    });
  };

  /**
   * Transform User to ProfileUser
   * @description Derives online status and sets a safe photoURL fallback so the profile view never renders a broken image.
   * @private
   * @param {User} user - User model
   * @returns {ProfileUser} Profile user
   */
  private toProfileUser = (user: User): ProfileUser => {
    return {
      id: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL || '/img/profile/profile-0.svg',
      status: user.isOnline ? 'online' : 'offline',
      isAdmin: false,
    };
  };

  /**
   * Transform User to EditProfileUser
   * @description Omits status so the edit form only exposes fields the user is actually allowed to change.
   * @private
   * @param {User} user - User model
   * @returns {EditProfileUser} Edit profile user
   */
  private toEditProfileUser = (user: User): EditProfileUser => {
    return {
      id: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL || '/img/profile/profile-0.svg',
      isAdmin: false,
    };
  };
}
