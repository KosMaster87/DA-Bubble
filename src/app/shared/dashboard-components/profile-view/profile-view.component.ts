/**
 * @fileoverview Profile View Component
 * @description Popup for viewing and editing user profile
 * @module shared/dashboard-components/profile-view
 */

import { Component, input, output } from '@angular/core';

export interface ProfileUser {
  id: string;
  displayName: string;
  email: string;
  photoURL?: string;
  status?: 'online' | 'offline' | 'away';
}

@Component({
  selector: 'app-profile-view',
  templateUrl: './profile-view.component.html',
  styleUrl: './profile-view.component.scss',
})
export class ProfileViewComponent {
  user = input.required<ProfileUser>();
  isVisible = input<boolean>(false);
  isOwnProfile = input<boolean>(false);
  closeClicked = output<void>();
  editClicked = output<void>();
  messageClicked = output<void>();

  /**
   * Handle close button click
   */
  onClose(): void {
    this.closeClicked.emit();
  }

  /**
   * Handle edit button click
   */
  onEdit(): void {
    this.editClicked.emit();
  }

  /**
   * Handle message button click
   */
  onMessage(): void {
    this.messageClicked.emit();
  }

  /**
   * Get status icon based on user status
   */
  getStatusIcon(): string {
    switch (this.user().status) {
      case 'online':
        return '/img/icon/profile/status-online.svg';
      case 'away':
        return '/img/icon/profile/status-away.svg';
      case 'offline':
      default:
        return '/img/icon/profile/status-away.svg';
    }
  }

  /**
   * Get status text based on user status
   */
  getStatusText(): string {
    switch (this.user().status) {
      case 'online':
        return 'Activ';
      case 'away':
        return 'Away';
      case 'offline':
      default:
        return 'Offline';
    }
  }
}
