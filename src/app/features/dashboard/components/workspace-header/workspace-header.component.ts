/**
 * @fileoverview Workspace Header Component
 * @description Header for workspace with search and user menu
 * @module features/dashboard/components/workspace-header
 */

import { Component, computed, inject, input, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { WorkspaceHeaderStateService } from '@core/services/workspace-header-state/workspace-header-state.service';
import { BackToWorkspaceComponent } from '@shared/components/back-to-workspace/back-to-workspace.component';
import { DABubbleLogoComponent } from '@shared/components/dabubble-logo/dabubble-logo.component';
import {
  UserOptionsMenuComponent,
  UserOptionsMenuMobileComponent,
} from '@shared/dashboard-components';
import { ProfileEditComponent } from '@shared/dashboard-components/profile-edit/profile-edit.component';
import { ProfileViewComponent } from '@shared/dashboard-components/profile-view/profile-view.component';
import { AuthStore } from '@stores/auth';
import { UserPresenceStore } from '@stores/index';

@Component({
  selector: 'app-workspace-header',
  imports: [
    DABubbleLogoComponent,
    BackToWorkspaceComponent,
    UserOptionsMenuComponent,
    UserOptionsMenuMobileComponent,
    ProfileViewComponent,
    ProfileEditComponent,
  ],
  templateUrl: './workspace-header.component.html',
  styleUrl: './workspace-header.component.scss',
})
export class WorkspaceHeaderComponent {
  private router = inject(Router);
  private headerState = inject(WorkspaceHeaderStateService);
  protected authStore = inject(AuthStore);
  protected userPresenceStore = inject(UserPresenceStore);
  protected isOptionsOpen = signal(false);
  protected isProfileViewOpen = signal(false);
  protected isEditProfileOpen = signal(false);
  protected currentUser = computed(() => this.authStore.user());
  protected profileUser = this.headerState.getProfileUser();
  protected editProfileUser = this.headerState.getEditProfileUser();

  isMobileView = input<boolean>(false);
  showBackToWorkspace = input<boolean>(false);
  mailboxRequested = output<void>();
  backToWorkspaceRequested = output<void>();

  /**
   * Handle search input
   * @param {Event} event - Input event
   * @returns {void}
   */
  onSearch = (event: Event): void => {
    const _query = (event.target as HTMLInputElement).value;
  };

  /**
   * Toggle profile options menu
   * @returns {void}
   */
  toggleOptions = (): void => {
    this.isOptionsOpen.update((value) => !value);
  };

  /**
   * Handle profile click - opens profile view
   * @returns {void}
   */
  onProfileClick = (): void => {
    this.isOptionsOpen.set(false);
    this.isProfileViewOpen.set(true);
  };

  /**
   * Handle mailbox click
   * @returns {void}
   */
  onMailboxClick = (): void => {
    this.isOptionsOpen.set(false);
    this.mailboxRequested.emit();
  };

  /**
   * Close profile view
   * @returns {void}
   */
  onProfileViewClose = (): void => {
    this.isProfileViewOpen.set(false);
  };

  /**
   * Handle profile edit
   * @returns {void}
   */
  onProfileEdit = (): void => {
    this.isProfileViewOpen.set(false);
    this.isEditProfileOpen.set(true);
  };

  /**
   * Close edit profile
   * @returns {void}
   */
  onEditProfileClose = (): void => {
    this.isEditProfileOpen.set(false);
  };

  /**
   * Handle profile save
   * @param {Object} data - Profile data
   * @param {string} data.displayName - New display name
   * @param {boolean} data.isAdmin - Admin status
   * @returns {Promise<void>}
   */
  onProfileSave = async (data: { displayName: string; isAdmin: boolean }): Promise<void> => {
    this.isEditProfileOpen.set(false);
    await this.authStore.updateUserProfile({ displayName: data.displayName });
  };

  /**
   * Handle message click from profile
   * @returns {void}
   */
  onProfileMessage = (): void => {
    this.isProfileViewOpen.set(false);
  };

  /**
   * Logout user
   * @returns {Promise<void>}
   */
  logout = async (): Promise<void> => {
    this.isOptionsOpen.set(false);
    await this.authStore.logout();
    await this.router.navigate(['/'], { state: { signedOut: true } });
  };

  /**
   * Handle image load error - fallback to placeholder
   * @param {Event} event - Image error event
   * @returns {void}
   */
  onImageError = (event: Event): void => {
    const img = event.target as HTMLImageElement;
    img.src = '/img/profile/profile-0.svg';
  };
}
