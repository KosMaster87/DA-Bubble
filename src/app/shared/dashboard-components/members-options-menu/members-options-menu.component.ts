/**
 * @fileoverview Members Options Menu Component
 * @description Popup menu for viewing and managing channel members
 * @module shared/dashboard-components/members-options-menu
 */

import { Component, input, output } from '@angular/core';
import { UserListItemComponent, UserListItem } from '../user-list-item/user-list-item.component';

@Component({
  selector: 'app-members-options-menu',
  imports: [UserListItemComponent],
  templateUrl: './members-options-menu.component.html',
  styleUrl: './members-options-menu.component.scss',
})
export class MembersOptionsMenuComponent {
  members = input.required<UserListItem[]>();
  isOpen = input<boolean>(false);
  showAddMember = input<boolean>(true);
  closeClicked = output<void>();
  addMemberClicked = output<void>();
  memberSelected = output<string>();

  /**
   * Handle close button click
   */
  onClose(): void {
    this.closeClicked.emit();
  }

  /**
   * Handle add member click
   */
  onAddMember(): void {
    this.addMemberClicked.emit();
  }

  /**
   * Handle member item click
   */
  onMemberClick(memberId: string): void {
    this.memberSelected.emit(memberId);
  }
}
