/**
 * @fileoverview User Selection Component
 * @description Popup to select users for invitations
 * @module shared/dashboard-components/user-selection
 */

import { Component, input, output, signal, computed } from '@angular/core';
import { UserListItemComponent, UserListItem } from '../user-list-item/user-list-item.component';

@Component({
  selector: 'app-user-selection',
  imports: [UserListItemComponent],
  templateUrl: './user-selection.component.html',
  styleUrl: './user-selection.component.scss',
})
export class UserSelectionComponent {
  users = input<UserListItem[]>([]);
  searchValue = input<string>('');
  userSelected = output<UserListItem>();
  closed = output<void>();

  /**
   * Filtered users based on search
   * Filters user list by name matching search value
   * @returns {UserListItem[]} Filtered array of users
   */
  protected filteredUsers = computed(() => {
    const search = this.searchValue().toLowerCase();
    if (!search) return this.users();
    return this.users().filter((user) => user.name.toLowerCase().includes(search));
  });

  /**
   * Handle user selection
   * Finds user by ID and emits selection event
   * @param {string} userId - ID of selected user
   * @returns {void}
   */
  protected onUserClick = (userId: string): void => {
    const user = this.users().find((u) => u.id === userId);
    if (user) {
      this.userSelected.emit(user);
    }
  };

  /**
   * Handle overlay click
   * Closes the selection popup
   * @returns {void}
   */
  protected onOverlayClick = (): void => {
    this.closed.emit();
  };
}
