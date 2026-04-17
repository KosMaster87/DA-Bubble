/**
 * @fileoverview Avatar Selection Component
 * @description Component for selecting user avatar after registration
 * @module features/auth/pages/avatar-selection
 */

import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BackButtonComponent, PrimaryButtonComponent } from '@shared/components';
import { AuthStore } from '@stores/auth';

@Component({
  selector: 'app-avatar-selection',
  imports: [PrimaryButtonComponent, BackButtonComponent],
  templateUrl: './avatar-selection.component.html',
  styleUrl: './avatar-selection.component.scss',
})
export class AvatarSelectionComponent {
  private router = inject(Router);
  private authStore = inject(AuthStore);

  protected selectedAvatar = signal<number | null>(null);
  protected isSubmitting = signal(false);

  protected avatars = [
    { id: 1, src: '/img/profile/profile-1.png', alt: 'Avatar 1' },
    { id: 2, src: '/img/profile/profile-2.png', alt: 'Avatar 2' },
    { id: 3, src: '/img/profile/profile-3.png', alt: 'Avatar 3' },
    { id: 4, src: '/img/profile/profile-4.png', alt: 'Avatar 4' },
    { id: 5, src: '/img/profile/profile-5.png', alt: 'Avatar 5' },
    { id: 6, src: '/img/profile/profile-6.png', alt: 'Avatar 6' },
  ];

  /**
   * Select avatar by ID
   * @function selectAvatar
   * @param {number} avatarId - Avatar ID
   * @returns {void}
   */
  selectAvatar(avatarId: number): void {
    this.selectedAvatar.set(avatarId);
  }

  /**
   * Get selected avatar source
   * @function selectedAvatarSrc
   * @returns {string} Avatar source URL
   */
  selectedAvatarSrc(): string {
    const id = this.selectedAvatar();
    if (!id) return '/img/profile/profile-0.svg';
    return `/img/profile/profile-${id}.png`;
  }

  /**
   * Get user display name
   * @function userName
   * @returns {string} User name
   */
  userName(): string {
    return this.authStore.user()?.displayName || 'User';
  }

  /**
   * Confirm avatar selection
   * @async
   * @function confirmSelection
   * @returns {Promise<void>}
   */
  async confirmSelection(): Promise<void> {
    const avatarId = this.selectedAvatar();
    if (!avatarId) return;

    await this.updateAvatar(avatarId);
  }

  /**
   * Update user avatar
   * @async
   * @function updateAvatar
   * @param {number} avatarId - Avatar ID
   * @returns {Promise<void>}
   */
  async updateAvatar(avatarId: number): Promise<void> {
    this.isSubmitting.set(true);

    try {
      const avatarUrl = `/img/profile/profile-${avatarId}.png`;
      await this.authStore.updateUserProfile({ photoURL: avatarUrl });
      await this.navigateToDashboard();
    } catch (error) {
      console.error('Avatar update failed:', error);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  /**
   * Navigate to dashboard page
   * @async
   * @function navigateToDashboard
   * @returns {Promise<void>}
   */
  async navigateToDashboard(): Promise<void> {
    await this.router.navigate(['/dashboard']);
  }

  /**
   * Logout and navigate back to signin
   * @async
   * @function goBack
   * @returns {Promise<void>}
   */
  async goBack(): Promise<void> {
    await this.authStore.logout();
    await this.router.navigate(['/'], { state: { signedOut: true } });
  }
}
