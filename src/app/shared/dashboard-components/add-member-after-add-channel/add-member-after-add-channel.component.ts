/**
 * @fileoverview Add Member After Add Channel Component
 * @description Popup to add members after creating a channel
 * @module shared/dashboard-components/add-member-after-add-channel
 */

import { Component, computed, inject, input, output, signal } from '@angular/core';
import { AuthStore } from '@stores/auth';
import { BtnActionComponent } from '../btn-action/btn-action.component';
import { ChannelListItem } from '../channel-list-item/channel-list-item.component';
import { ChannelSelectionComponent } from '../channel-selection/channel-selection.component';
import { InputFieldBasicComponent } from '../input-field-basic/input-field-basic.component';
import { UserListItem } from '../user-list-item/user-list-item.component';
import { UserSelectionComponent } from '../user-selection/user-selection.component';

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
   * @description Drives expanded modal layout when any selector is open or the sheet was manually expanded.
   */
  isExpanded = computed<boolean>(() => {
    return this.isChannelSelectionOpen() || this.isUserSelectionOpen() || this.isManuallyExpanded();
  });

  /**
   * Available channels that are NOT yet selected and NOT system channels
   * @description Limits selectable channels to non-system channels that are not already part of the pending selection.
   */
  availableChannels = computed<ChannelListItem[]>(() => {
    const selectedIds = this.selectedChannels().map((c) => c.id);
    const systemChannels = ['Mailbox', 'DABubble welcome', "Let's Bubble"];
    return this.channels().filter(
      (channel) => !selectedIds.includes(channel.id) && !systemChannels.includes(channel.name),
    );
  });

  /**
   * Available users that are NOT yet selected and NOT the current user
   * @description Limits selectable users to unselected members while excluding the current user from invitations.
   */
  availableUsers = computed<UserListItem[]>(() => {
    const selectedIds = this.selectedUsers().map((u) => u.id);
    const currentUserId = this.authStore.user()?.uid;
    return this.users().filter(
      (user) => !selectedIds.includes(user.id) && user.id !== currentUserId,
    );
  });

  /**
   * Show user dropdown when typing and specific option selected
   * @description Binds dropdown visibility to specific-invite mode so the user picker is hidden in channel-copy mode.
   */
  showUserDropdown = computed(() => {
    return this.selectedOption() === 'specific' && this.isUserSelectionOpen();
  });

  /**
   * Open channel selection dropdown
   * @description Opens channel selector only for all-members mode and marks the sheet as manually expanded.
   */
  openChannelSelection(): void {
    if (this.selectedOption() === 'all') {
      this.isChannelSelectionOpen.set(true);
      this.isManuallyExpanded.set(true);
    }
  }

  /**
   * Open user selection dropdown
   * @description Opens user selector only for specific-members mode and marks the sheet as manually expanded.
   */
  openUserSelection(): void {
    if (this.selectedOption() === 'specific') {
      this.isUserSelectionOpen.set(true);
      this.isManuallyExpanded.set(true);
    }
  }

  /**
   * Select radio option
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
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
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   */
  onOverlayClick(): void {
    this.triggerClose();
  }

  /**
   * Handle close button click
   * @description Triggers the same closing flow as overlay dismissal to keep modal-exit behavior consistent.
   */
  onClose(): void {
    this.triggerClose();
  }

  /**
   * Trigger closing animation
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   */
  triggerClose(): void {
    this.isClosing.set(true);
    setTimeout(() => {
      this.closed.emit();
    }, 300);
  }

  /**
   * Handle touch start for drag gesture
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   */
  onTouchStart(event: TouchEvent): void {
    this.dragStartY = event.touches[0].clientY;
    this.isDragging.set(true);
  }

  /**
   * Handle touch move for drag gesture
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
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
      const additionalHeight = (Math.abs(deltaY) / 100) * 10;
      const newHeight = Math.min(90 + additionalHeight, 100);
      this.dragHeightPercentage.set(newHeight);
    }
  }

  /**
   * Handle touch end for drag gesture
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
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
   * @description Keeps creation and onboarding flow centralized so follow-up side effects stay consistent and easy to evolve.
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
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   */
  onSearchValueChange(value: string): void {
    this.searchValue.set(value);
  }

  /**
   * Handle channel search value change
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   */
  onChannelSearchValueChange(value: string): void {
    this.channelSearchValue.set(value);
  }

  /**
   * Toggle channel selection
   * @description Toggles channel selector visibility for compact open/close interactions.
   */
  toggleChannelSelection(): void {
    this.isChannelSelectionOpen.update((v) => !v);
  }

  /**
   * Handle channel selection
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
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
   * @description Closes channel selector explicitly after blur, escape, or selection-complete actions.
   */
  onChannelSelectionClose(): void {
    this.isChannelSelectionOpen.set(false);
  }

  /**
   * Remove selected channel
   * @description Removes one channel from the staged channel-selection list without affecting other staged entries.
   */
  removeSelectedChannel(channelId: string): void {
    this.selectedChannels.update((channels) => channels.filter((c) => c.id !== channelId));
  }

  /**
   * Handle user selection
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
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
   * @description Removes one user from the staged user-selection list without resetting the rest of the invite state.
   */
  removeSelectedUser(userId: string): void {
    this.selectedUsers.update((users) => users.filter((u) => u.id !== userId));
  }
}
