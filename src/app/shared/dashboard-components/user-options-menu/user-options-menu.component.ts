/**
 * @fileoverview User Options Menu Component
 * @description Dropdown menu with user options (Profile, Logout)
 * @module shared/dashboard-components/user-options-menu
 */

import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-user-options-menu',
  imports: [CommonModule],
  templateUrl: './user-options-menu.component.html',
  styleUrl: './user-options-menu.component.scss',
})
export class UserOptionsMenuComponent {
  isVisible = input.required<boolean>();
  profileClicked = output<void>();
  mailboxClicked = output<void>();
  logoutClicked = output<void>();
  closeClicked = output<void>();

  /**
   * Handle close click (overlay)
   * @description Emits close intent when overlay dismissal is triggered.
   */
  onClose(): void {
    this.closeClicked.emit();
  }

  /**
   * Handle profile click
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   */
  onProfileClick(): void {
    this.profileClicked.emit();
  }

  /**
   * Handle mailbox click
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   */
  onMailboxClick(): void {
    this.mailboxClicked.emit();
  }

  /**
   * Handle logout click
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   */
  onLogoutClick(): void {
    this.logoutClicked.emit();
  }
}
