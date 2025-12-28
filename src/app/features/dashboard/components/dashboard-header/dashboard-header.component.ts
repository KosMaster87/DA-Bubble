/**
 * @fileoverview Dashboard Header Component
 * @description Header for dashboard with logo, search and profile
 * @module features/dashboard/components/dashboard-header
 */

import { Component, inject, signal, output, computed } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '@stores/auth';
import { DABubbleLogoComponent } from '@shared/components/dabubble-logo/dabubble-logo.component';
import { UserOptionsMenuComponent } from '@shared/dashboard-components';
import {
  ProfileViewComponent,
  ProfileUser,
} from '@shared/dashboard-components/profile-view/profile-view.component';
import {
  EditProfileComponent,
  EditProfileUser,
} from '@shared/dashboard-components/edit-profile/edit-profile.component';
import { DummyUsersService } from '../../services/dummy-users.service';
import { CurrentUserService } from '../../services/current-user.service';

@Component({
  selector: 'app-dashboard-header',
  imports: [
    DABubbleLogoComponent,
    UserOptionsMenuComponent,
    ProfileViewComponent,
    EditProfileComponent,
  ],
  templateUrl: './dashboard-header.component.html',
  styleUrl: './dashboard-header.component.scss',
})
export class DashboardHeaderComponent {
  private router = inject(Router);
  protected authStore = inject(AuthStore);
  protected usersService = inject(DummyUsersService);
  protected currentUserService = inject(CurrentUserService);
  protected isOptionsOpen = signal(false);
  protected isProfileViewOpen = signal(false);
  protected isEditProfileOpen = signal(false);

  mailboxRequested = output<void>();

  /**
   * Get current dummy user
   */
  protected currentDummyUser = computed(() => {
    return this.usersService.getUserById(this.currentUserService.currentUserId());
  });

  /**
   * Get current user
   * @returns {User | null} Current user
   */
  get currentUser() {
    return this.authStore.user();
  }

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
    const userId = this.currentUserService.currentUserId();
    this.usersService.updateUser(userId, {
      name: data.displayName,
      isAdmin: data.isAdmin,
    });
    console.log('Save profile:', data);
  }

  /**
   * Get current user as EditProfileUser
   */
  get editProfileUser(): EditProfileUser | null {
    const user = this.currentDummyUser();
    if (!user) return null;
    return {
      id: user.id,
      displayName: user.name,
      email: user.email,
      photoURL: user.avatar,
      isAdmin: user.isAdmin,
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
    const user = this.currentDummyUser();
    if (!user) return null;
    return {
      id: user.id,
      displayName: user.name,
      email: user.email,
      photoURL: user.avatar,
      status: user.isOnline ? 'online' : 'offline',
      isAdmin: user.isAdmin,
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
