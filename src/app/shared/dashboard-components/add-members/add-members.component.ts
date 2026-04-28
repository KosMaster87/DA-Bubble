/**
 * @fileoverview Add Members Component
 * @description Popup for adding members to a channel
 * @module shared/dashboard-components/add-members
 */

import { Component, computed, input, output, signal } from '@angular/core';
import { BtnActionComponent } from '../btn-action/btn-action.component';
import { InputFieldBasicComponent } from '../input-field-basic/input-field-basic.component';
import { UserListItem } from '../user-list-item/user-list-item.component';
import { UserSelectionComponent } from '../user-selection/user-selection.component';

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
   * @description Drives expanded mobile sheet styling when the user picker is currently open.
   */
  isExpanded = computed(() => {
    return this.isUserSelectionOpen();
  });

  /**
   * Show user dropdown when selection is open
   * @description Exposes dropdown visibility state for template conditions and animation hooks.
   */
  showUserDropdown = computed(() => {
    return this.isUserSelectionOpen();
  });

  /**
   * Available users (excluding already selected ones)
   * @description Filters candidate users to only those not yet staged in the selection chips.
   */
  availableUsers = computed(() => {
    const selectedUserIds = this.selectedUsers().map((u) => u.id);
    return this.users().filter((u) => !selectedUserIds.includes(u.id));
  });

  /**
   * Handle close button click
   * @description Emits close intent and resets local state so reopening starts from a clean selection context.
   */
  onClose(): void {
    this.closeClicked.emit();
    this.resetComponent();
  }

  /**
   * Handle search input change
   * @description Stores the latest search input to drive user filtering in the selection list.
   */
  onSearchChange(value: string): void {
    this.searchValue.set(value);
  }

  /**
   * Open user selection dropdown when input is focused
   * @description Opens the user picker on focus so available members can be chosen immediately.
   */
  onInputFocused(): void {
    this.isUserSelectionOpen.set(true);
  }

  /**
   * Handle user selection
   * @description Adds a picked user to staged members with duplicate protection.
   */
  onUserSelected(user: UserListItem): void {
    const isAlreadySelected = this.selectedUsers().some((u) => u.id === user.id);
    if (!isAlreadySelected) {
      this.selectedUsers.update((users) => [...users, user]);
    }
  }

  /**
   * Handle user selection close
   * @description Closes the user picker after explicit dismiss or completion actions.
   */
  onUserSelectionClose(): void {
    this.isUserSelectionOpen.set(false);
  }

  /**
   * Remove selected user
   * @description Removes one staged user from the pending member list without resetting other selections.
   */
  removeSelectedUser(userId: string): void {
    this.selectedUsers.update((users) => users.filter((u) => u.id !== userId));
  }

  /**
   * Handle add member button click
   * @description Emits selected member IDs only when at least one user is staged, then resets component-local state.
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
   * @description Prevents submission when no members are selected by exposing a simple disabled predicate.
   */
  isAddDisabled(): boolean {
    return this.selectedUsers().length === 0;
  }

  /**
   * Reset component state
   * @description Clears search, staged users, and dropdown visibility so subsequent opens start from baseline state.
   */
  private resetComponent(): void {
    this.searchValue.set('');
    this.selectedUsers.set([]);
    this.isUserSelectionOpen.set(false);
  }
}
