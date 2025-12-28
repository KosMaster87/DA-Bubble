/**
 * @fileoverview Profile View Component
 * @description Popup for viewing and editing user profile
 * @module shared/dashboard-components/profile-view
 */

import { Component, input, output } from '@angular/core';
import { BtnDeleteComponent } from '../btn-delete/btn-delete.component';

export interface ProfileUser {
  id: string;
  displayName: string;
  email: string;
  photoURL?: string;
  status?: 'online' | 'offline' | 'away';
  isAdmin?: boolean;
}

@Component({
  selector: 'app-profile-view',
  imports: [BtnDeleteComponent],
  templateUrl: './profile-view.component.html',
  styleUrl: './profile-view.component.scss',
})
export class ProfileViewComponent {
  user = input.required<ProfileUser>();
  isVisible = input<boolean>(false);
  isOwnProfile = input<boolean>(false);
  isAdmin = input<boolean>(false);
  closeClicked = output<void>();
  editClicked = output<void>();
  messageClicked = output<void>();
  removeMemberClicked = output<void>();

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
   * Handle remove member button click
   */
  onRemoveMember(): void {
    this.removeMemberClicked.emit();
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
