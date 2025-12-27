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
   */
  filteredUsers = computed(() => {
    const search = this.searchValue().toLowerCase();
    if (!search) {
      return this.users();
    }
    return this.users().filter((user) => user.name.toLowerCase().includes(search));
  });

  /**
   * Handle user selection
   */
  onUserClick(userId: string): void {
    const user = this.users().find((u) => u.id === userId);
    if (user) {
      this.userSelected.emit(user);
    }
  }

  /**
   * Handle overlay click
   */
  onOverlayClick(): void {
    this.closed.emit();
  }
}
