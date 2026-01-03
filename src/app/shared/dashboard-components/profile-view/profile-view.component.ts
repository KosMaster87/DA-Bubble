/**
 * @fileoverview Profile View Component
 * @description Popup for viewing and editing user profile
 * @module shared/dashboard-components/profile-view
 */

import { Component, input, output, inject, computed } from '@angular/core';
import { BtnDeleteComponent } from '../btn-delete/btn-delete.component';
import { UserPresenceStore } from '../../../stores';

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
  protected userPresenceStore = inject(UserPresenceStore);

  user = input.required<ProfileUser>();
  isVisible = input<boolean>(false);
  isOwnProfile = input<boolean>(false);
  isChannelOwner = input<boolean>(false);
  isCurrentUserAdmin = input<boolean>(false);
  isSelectedUserOwner = input<boolean>(false);
  isDirectMessage = input<boolean>(false);
  closeClicked = output<void>();
  editClicked = output<void>();
  messageClicked = output<void>();
  removeMemberClicked = output<void>();
  leaveConversationClicked = output<void>();

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
   * Handle leave conversation button click
   */
  onLeaveConversation(): void {
    this.leaveConversationClicked.emit();
  }

  /**
   * Get status icon based on user status
   */
  getStatusIcon(): string {
    const isOnline = this.userPresenceStore.isUserOnline()(this.user().id);
    return isOnline ? '/img/icon/profile/status-online.svg' : '/img/icon/profile/status-away.svg';
  }

  /**
   * Get status text based on user status
   */
  getStatusText(): string {
    const isOnline = this.userPresenceStore.isUserOnline()(this.user().id);
    return isOnline ? 'Activ' : 'Offline';
  }
}
