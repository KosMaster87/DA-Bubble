/**
 * @fileoverview Workspace Header State Service
 * @description Manages computed state for workspace header component
 * @module core/services/workspace-header-state
 */

import { Injectable, inject, computed, Signal } from '@angular/core';
import { AuthStore } from '@stores/auth';
import type { User } from '@core/models/user.model';

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
