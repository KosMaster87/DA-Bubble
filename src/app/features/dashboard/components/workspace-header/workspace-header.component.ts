/**
 * @fileoverview Workspace Header Component
 * @description Header for workspace with search and user menu
 * @module features/dashboard/components/workspace-header
 */

import { Component, inject, signal, output, computed } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '@stores/auth';
import { UserPresenceStore } from '@stores/index';
import { DABubbleLogoComponent } from '@shared/components/dabubble-logo/dabubble-logo.component';
import { UserOptionsMenuComponent } from '@shared/dashboard-components';
import {
  ProfileViewComponent,
  ProfileUser,
} from '@shared/dashboard-components/profile-view/profile-view.component';
import {
  ProfileEditComponent,
  EditProfileUser,
} from '@shared/dashboard-components/profile-edit/profile-edit.component';

@Component({
  selector: 'app-workspace-header',
  imports: [
    DABubbleLogoComponent,
    UserOptionsMenuComponent,
    ProfileViewComponent,
    ProfileEditComponent,
  ],
  templateUrl: './workspace-header.component.html',
  styleUrl: './workspace-header.component.scss',
})
export class WorkspaceHeaderComponent {
  private router = inject(Router);
  protected authStore = inject(AuthStore);
  protected userPresenceStore = inject(UserPresenceStore);
  protected isOptionsOpen = signal(false);
  protected isProfileViewOpen = signal(false);
  protected isEditProfileOpen = signal(false);

  mailboxRequested = output<void>();

  /**
   * Get current user from AuthStore
   */
  protected currentUser = computed(() => {
    return this.authStore.user();
  });

  /**
   * Handle search input
   * @param {Event} event - Input event
   */
  onSearch(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    console.log('Search query:', query);
    // TODO: Implement search functionality
  }

  /**
   * Toggle profile options menu
   */
  toggleOptions(): void {
    this.isOptionsOpen.update((value) => !value);
  }

  /**
   * Handle profile click - opens profile view
   */
  onProfileClick(): void {
    this.isOptionsOpen.set(false);
    this.isProfileViewOpen.set(true);
  }

  /**
   * Handle mailbox click
   */
  onMailboxClick(): void {
    this.isOptionsOpen.set(false);
    this.mailboxRequested.emit();
  }

  /**
   * Close profile view
   */
  onProfileViewClose(): void {
    this.isProfileViewOpen.set(false);
  }

  /**
   * Handle profile edit
   */
  onProfileEdit(): void {
    this.isProfileViewOpen.set(false);
    this.isEditProfileOpen.set(true);
  }

  /**
   * Close edit profile
   */
  onEditProfileClose(): void {
    this.isEditProfileOpen.set(false);
  }

  /**
   * Handle profile save
   */
  async onProfileSave(data: { displayName: string; isAdmin: boolean }): Promise<void> {
    this.isEditProfileOpen.set(false);

    try {
      // Update user profile via AuthStore
      await this.authStore.updateUserProfile({ displayName: data.displayName });
      console.log('✅ Profile updated:', data);
    } catch (error) {
      console.error('❌ Failed to update profile:', error);
    }
  }

  /**
   * Get current user as EditProfileUser
   */
  get editProfileUser(): EditProfileUser | null {
    const user = this.currentUser();
    if (!user) return null;
    return {
      id: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL || '/img/profile/profile-0.svg',
      isAdmin: false, // TODO: Implement admin flag in User model
    };
  }

  /**
   * Handle message click from profile
   */
  onProfileMessage(): void {
    this.isProfileViewOpen.set(false);
    console.log('Message user');
    // TODO: Open direct message
  }

  /**
   * Get current user as ProfileUser
   */
  get profileUser(): ProfileUser | null {
    const user = this.currentUser();
    if (!user) return null;
    return {
      id: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL || '/img/profile/profile-0.svg',
      status: user.isOnline ? 'online' : 'offline',
      isAdmin: false, // TODO: Implement admin flag in User model
    };
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    this.isOptionsOpen.set(false);
    await this.authStore.logout();
    await this.router.navigate(['/']);
  }
}
