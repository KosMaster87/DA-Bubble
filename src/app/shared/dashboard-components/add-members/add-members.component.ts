/**
 * @fileoverview Add Members Component
 * @description Popup for adding members to a channel
 * @module shared/dashboard-components/add-members
 */

import { Component, input, output, signal, computed } from '@angular/core';
import { InputFieldBasicComponent } from '../input-field-basic/input-field-basic.component';
import { BtnActionComponent } from '../btn-action/btn-action.component';
import { UserSelectionComponent } from '../user-selection/user-selection.component';
import { UserListItem } from '../user-list-item/user-list-item.component';

@Component({
  selector: 'app-add-members',
  imports: [InputFieldBasicComponent, BtnActionComponent, UserSelectionComponent],
  templateUrl: './add-members.component.html',
  styleUrl: './add-members.component.scss',
})
export class AddMembersComponent {
  isVisible = input<boolean>(false);
  channelName = input<string>('');
  users = input<UserListItem[]>([]);
  closeClicked = output<void>();
  membersAdded = output<string[]>();
  protected searchValue = signal<string>('');
  protected isUserSelectionOpen = signal<boolean>(false);
  protected selectedUsers = signal<UserListItem[]>([]);

  /**
   * Check if dropdown is open for mobile expansion
   */
  isExpanded = computed(() => {
    return this.isUserSelectionOpen();
  });

  /**
   * Show user dropdown when selection is open
   */
  showUserDropdown = computed(() => {
    return this.isUserSelectionOpen();
  });

  /**
   * Available users (excluding already selected ones)
   */
  availableUsers = computed(() => {
    const selectedUserIds = this.selectedUsers().map((u) => u.id);
    return this.users().filter((u) => !selectedUserIds.includes(u.id));
  });

  /**
   * Handle close button click
   */
  onClose(): void {
    this.closeClicked.emit();
    this.resetComponent();
  }

  /**
   * Handle search input change
   */
  onSearchChange(value: string): void {
    this.searchValue.set(value);
  }

  /**
   * Open user selection dropdown when input is focused
   */
  onInputFocused(): void {
    this.isUserSelectionOpen.set(true);
  }

  /**
   * Handle user selection
   */
  onUserSelected(user: UserListItem): void {
    const isAlreadySelected = this.selectedUsers().some((u) => u.id === user.id);
    if (!isAlreadySelected) {
      this.selectedUsers.update((users) => [...users, user]);
    }
  }

  /**
   * Handle user selection close
   */
  onUserSelectionClose(): void {
    this.isUserSelectionOpen.set(false);
  }

  /**
   * Remove selected user
   */
  removeSelectedUser(userId: string): void {
    this.selectedUsers.update((users) => users.filter((u) => u.id !== userId));
  }

  /**
   * Handle add member button click
   */
  onAddMember(): void {
    if (this.selectedUsers().length > 0) {
      const userIds = this.selectedUsers().map((u) => u.id);
      this.membersAdded.emit(userIds);
      this.resetComponent();
    }
  }

  /**
   * Check if add button should be disabled
   */
  isAddDisabled(): boolean {
    return this.selectedUsers().length === 0;
  }

  /**
   * Reset component state
   */
  private resetComponent(): void {
    this.searchValue.set('');
    this.selectedUsers.set([]);
    this.isUserSelectionOpen.set(false);
  }
}
