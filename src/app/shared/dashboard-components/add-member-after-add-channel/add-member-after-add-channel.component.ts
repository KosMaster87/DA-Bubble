/**
 * @fileoverview Add Member After Add Channel Component
 * @description Popup to add members after creating a channel
 * @module shared/dashboard-components/add-member-after-add-channel
 */

import { Component, input, output, signal, computed } from '@angular/core';
import { BtnActionComponent } from '../btn-action/btn-action.component';
import { BtnCancelComponent } from '../btn-cancel/btn-cancel.component';
import { InputFieldBasicComponent } from '../input-field-basic/input-field-basic.component';
import { ChannelSelectionComponent } from '../channel-selection/channel-selection.component';
import { ChannelListItem } from '../channel-list-item/channel-list-item.component';
import { UserSelectionComponent } from '../user-selection/user-selection.component';
import { UserListItem } from '../user-list-item/user-list-item.component';

type MemberSelectionType = 'all' | 'specific';

@Component({
  selector: 'app-add-member-after-add-channel',
  imports: [
    BtnActionComponent,
    BtnCancelComponent,
    InputFieldBasicComponent,
    ChannelSelectionComponent,
    UserSelectionComponent,
  ],
  templateUrl: './add-member-after-add-channel.component.html',
  styleUrl: './add-member-after-add-channel.component.scss',
})
export class AddMemberAfterAddChannelComponent {
  channelName = input<string>('');
  channels = input<ChannelListItem[]>([]);
  users = input<UserListItem[]>([]);
  closed = output<void>();
  cancelled = output<void>();
  created = output<{ type: MemberSelectionType; searchValue?: string }>();
  selectedOption = signal<MemberSelectionType>('all');
  searchValue = signal<string>('');
  channelSearchValue = signal<string>('');
  isChannelSelectionOpen = signal<boolean>(false);
  selectedChannels = signal<ChannelListItem[]>([]);
  selectedUsers = signal<UserListItem[]>([]);
  isUserSelectionOpen = signal<boolean>(false);

  /**
   * Show user dropdown when typing and specific option selected
   */
  showUserDropdown = computed(() => {
    return this.selectedOption() === 'specific' && this.isUserSelectionOpen();
  });

  /**
   * Open channel selection dropdown
   */
  openChannelSelection(): void {
    if (this.selectedOption() === 'all') {
      this.isChannelSelectionOpen.set(true);
    }
  }

  /**
   * Open user selection dropdown
   */
  openUserSelection(): void {
    if (this.selectedOption() === 'specific') {
      this.isUserSelectionOpen.set(true);
    }
  }

  /**
   * Select radio option
   */
  selectOption(option: MemberSelectionType): void {
    this.selectedOption.set(option);
    if (option === 'all') {
      this.searchValue.set('');
      this.isUserSelectionOpen.set(false);
      this.channelSearchValue.set('');
    } else {
      this.isChannelSelectionOpen.set(false);
      this.channelSearchValue.set('');
    }
  }

  /**
   * Handle overlay click
   */
  onOverlayClick(): void {
    this.closed.emit();
  }

  /**
   * Handle close button click
   */
  onClose(): void {
    this.closed.emit();
  }

  /**
   * Handle cancel button click
   */
  onCancel(): void {
    this.cancelled.emit();
  }

  /**
   * Handle create button click
   */
  onCreate(): void {
    this.created.emit({
      type: this.selectedOption(),
      searchValue: this.selectedOption() === 'specific' ? this.searchValue() : undefined,
    });
  }

  /**
   * Handle search value change
   */
  onSearchValueChange(value: string): void {
    this.searchValue.set(value);
  }

  /**
   * Handle channel search value change
   */
  onChannelSearchValueChange(value: string): void {
    this.channelSearchValue.set(value);
  }

  /**
   * Toggle channel selection
   */
  toggleChannelSelection(): void {
    this.isChannelSelectionOpen.update((v) => !v);
  }

  /**
   * Handle channel selection
   */
  onChannelSelected(channel: ChannelListItem): void {
    // Add channel if not already selected
    const isAlreadySelected = this.selectedChannels().some((c) => c.id === channel.id);
    if (!isAlreadySelected) {
      this.selectedChannels.update((channels) => [...channels, channel]);
    }
    // Keep search value and dropdown open for multiple selections
  }

  /**
   * Handle channel selection close
   */
  onChannelSelectionClose(): void {
    this.isChannelSelectionOpen.set(false);
  }

  /**
   * Remove selected channel
   */
  removeSelectedChannel(channelId: string): void {
    this.selectedChannels.update((channels) => channels.filter((c) => c.id !== channelId));
  }

  /**
   * Handle user selection
   */
  onUserSelected(user: UserListItem): void {
    // Add user if not already selected
    const isAlreadySelected = this.selectedUsers().some((u) => u.id === user.id);
    if (!isAlreadySelected) {
      this.selectedUsers.update((users) => [...users, user]);
    }
    // Keep search value and dropdown open for multiple selections
  }

  /**
   * Remove selected user
   */
  removeSelectedUser(userId: string): void {
    this.selectedUsers.update((users) => users.filter((u) => u.id !== userId));
  }
}
