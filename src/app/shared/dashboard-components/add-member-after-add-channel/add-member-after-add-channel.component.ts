/**
 * @fileoverview Add Member After Add Channel Component
 * @description Popup to add members after creating a channel
 * @module shared/dashboard-components/add-member-after-add-channel
 */

import { Component, input, output, signal, computed, inject } from '@angular/core';
import { BtnActionComponent } from '../btn-action/btn-action.component';
import { InputFieldBasicComponent } from '../input-field-basic/input-field-basic.component';
import { ChannelSelectionComponent } from '../channel-selection/channel-selection.component';
import { ChannelListItem } from '../channel-list-item/channel-list-item.component';
import { UserSelectionComponent } from '../user-selection/user-selection.component';
import { UserListItem } from '../user-list-item/user-list-item.component';
import { AuthStore } from '@stores/auth';

type MemberSelectionType = 'all' | 'specific';

@Component({
  selector: 'app-add-member-after-add-channel',
  imports: [
    BtnActionComponent,
    InputFieldBasicComponent,
    ChannelSelectionComponent,
    UserSelectionComponent,
  ],
  templateUrl: './add-member-after-add-channel.component.html',
  styleUrl: './add-member-after-add-channel.component.scss',
})
export class AddMemberAfterAddChannelComponent {
  protected authStore = inject(AuthStore);

  channelName = input<string>('');
  channels = input<ChannelListItem[]>([]);
  users = input<UserListItem[]>([]);
  closed = output<void>();
  created = output<{
    type: MemberSelectionType;
    searchValue?: string;
    selectedChannels: ChannelListItem[];
    selectedUsers: UserListItem[];
  }>();
  selectedOption = signal<MemberSelectionType>('all');
  searchValue = signal<string>('');
  channelSearchValue = signal<string>('');
  isChannelSelectionOpen = signal<boolean>(false);
  selectedChannels = signal<ChannelListItem[]>([]);
  selectedUsers = signal<UserListItem[]>([]);
  isUserSelectionOpen = signal<boolean>(false);

  // Touch drag state
  protected isDragging = signal(false);
  protected dragStartY = 0;
  protected currentTranslateY = signal(0);
  protected isClosing = signal(false);
  protected isManuallyExpanded = signal(false);
  protected dragHeightPercentage = signal<number | null>(null);

  /**
   * Check if any dropdown is open or manually expanded (for mobile expansion)
   */
  isExpanded = computed<boolean>(() => {
    return this.isChannelSelectionOpen() || this.isUserSelectionOpen() || this.isManuallyExpanded();
  });

  /**
   * Available channels that are NOT yet selected and NOT system channels
   */
  availableChannels = computed<ChannelListItem[]>(() => {
    const selectedIds = this.selectedChannels().map((c) => c.id);
    const systemChannels = ['Mailbox', 'DABubble welcome', "Let's Bubble"];
    return this.channels().filter(
      (channel) => !selectedIds.includes(channel.id) && !systemChannels.includes(channel.name)
    );
  });

  /**
   * Available users that are NOT yet selected and NOT the current user
   */
  availableUsers = computed<UserListItem[]>(() => {
    const selectedIds = this.selectedUsers().map((u) => u.id);
    const currentUserId = this.authStore.user()?.uid;
    return this.users().filter(
      (user) => !selectedIds.includes(user.id) && user.id !== currentUserId
    );
  });

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
      this.isManuallyExpanded.set(true);
    }
  }

  /**
   * Open user selection dropdown
   */
  openUserSelection(): void {
    if (this.selectedOption() === 'specific') {
      this.isUserSelectionOpen.set(true);
      this.isManuallyExpanded.set(true);
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
    this.triggerClose();
  }

  /**
   * Handle close button click
   */
  onClose(): void {
    this.triggerClose();
  }

  /**
   * Trigger closing animation
   */
  triggerClose(): void {
    this.isClosing.set(true);
    setTimeout(() => {
      this.closed.emit();
    }, 300);
  }

  /**
   * Handle touch start for drag gesture
   */
  onTouchStart(event: TouchEvent): void {
    this.dragStartY = event.touches[0].clientY;
    this.isDragging.set(true);
  }

  /**
   * Handle touch move for drag gesture
   */
  onTouchMove(event: TouchEvent): void {
    if (!this.isDragging()) return;

    const currentY = event.touches[0].clientY;
    const deltaY = currentY - this.dragStartY;

    // Dead zone to prevent jittering when dragging near starting position
    if (Math.abs(deltaY) < 5) {
      return;
    }

    // Dragging down - for closing (move element down)
    if (deltaY > 0) {
      this.currentTranslateY.set(deltaY);
      this.dragHeightPercentage.set(null);
    }
    // Dragging up - for expanding height (keep position, grow height)
    else {
      this.currentTranslateY.set(0);
      // Start at 90vh, increase to 100vh based on drag distance
      // Every 100px of upward drag increases height by 10vh
      const additionalHeight = Math.abs(deltaY) / 100 * 10;
      const newHeight = Math.min(90 + additionalHeight, 100);
      this.dragHeightPercentage.set(newHeight);
    }
  }

  /**
   * Handle touch end for drag gesture
   */
  onTouchEnd(): void {
    if (!this.isDragging()) return;

    this.isDragging.set(false);
    const deltaY = this.currentTranslateY();

    // If dragged down more than 100px, close the modal
    if (deltaY > 100) {
      this.triggerClose();
    }
    // If dragged up more than 50px, expand to full height
    else if (deltaY < -50) {
      this.isManuallyExpanded.set(true);
      this.currentTranslateY.set(0);
      this.dragHeightPercentage.set(null);
    }
    // Otherwise snap back to original position
    else {
      this.currentTranslateY.set(0);
      this.dragHeightPercentage.set(null);
    }
  }

  /**
   * Handle create button click
   */
  onCreate(): void {
    this.created.emit({
      type: this.selectedOption(),
      searchValue: this.selectedOption() === 'specific' ? this.searchValue() : undefined,
      selectedChannels: this.selectedChannels(),
      selectedUsers: this.selectedUsers(),
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
