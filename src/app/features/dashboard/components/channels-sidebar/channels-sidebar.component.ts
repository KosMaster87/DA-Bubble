/**
 * @fileoverview Channels Sidebar Component
 * @description Collapsible sidebar showing channels list
 * @module features/dashboard/components/channels-sidebar
 */

import { Component, inject, output, input, signal, computed } from '@angular/core';
import { ChannelStore } from '@stores/channel.store';
import { CommonModule } from '@angular/common';
import { WorkspaceSidebarService } from '@shared/services/workspace-sidebar.service';
import { CreateChannelComponent } from '@shared/dashboard-components/create-channel/create-channel.component';
import { AddMemberAfterAddChannelComponent } from '@app/shared/dashboard-components/add-member-after-add-channel/add-member-after-add-channel.component';
import { DummyChannelsService } from '../../services/dummy-channels.service';
import { DummyChatDmService } from '../../services/dummy-chat-dm.service';
import { DummyUsersService } from '../../services/dummy-users.service';
import { CurrentUserService } from '../../services/current-user.service';

@Component({
  selector: 'app-channels-sidebar',
  imports: [CommonModule, CreateChannelComponent, AddMemberAfterAddChannelComponent],
  templateUrl: './channels-sidebar.component.html',
  styleUrl: './channels-sidebar.component.scss',
})
export class ChannelsSidebarComponent {
  protected channelStore = inject(ChannelStore);
  protected sidebarService = inject(WorkspaceSidebarService);
  protected channelsService = inject(DummyChannelsService);
  protected chatDmService = inject(DummyChatDmService);
  protected usersService = inject(DummyUsersService);
  protected currentUserService = inject(CurrentUserService);
  isNewMessageActive = input<boolean>(false);
  isMailboxActive = input<boolean>(false);
  newMessageRequested = output<void>();
  mailboxRequested = output<void>();
  channelSelected = output<string>();
  directMessageSelected = output<string>();
  protected isChannelsOpen = signal(true);
  protected isDirectMessagesOpen = signal(true);
  protected isAddChannelActive = signal(false);
  protected isCreateChannelOpen = signal(false);
  protected isAddMemberAfterChannelOpen = signal(false);

  // Temporary storage for channel data between popups
  protected pendingChannelName = signal<string>('');
  protected pendingChannelDescription = signal<string>('');

  /**
   * Channels from service
   */
  protected dummyChannels = computed(() =>
    this.channelsService.channels().map((ch) => ({
      id: ch.id,
      name: ch.name,
    }))
  );

  /**
   * Selected channel ID
   */
  protected selectedChannelId = signal<string | null>(null);

  /**
   * Direct messages from service mapped to template interface
   */
  protected directMessages = computed(() =>
    this.chatDmService.directMessages().map((dm) => ({
      id: dm.id,
      name: dm.userName,
      avatar: dm.userAvatar,
      isOnline: dm.isOnline,
    }))
  );

  /**
   * All users mapped to UserListItem for add-member popup
   */
  protected allUsers = computed(() =>
    this.usersService.users().map((user) => ({
      id: user.id,
      name: user.name,
      avatar: user.avatar,
    }))
  );

  /**
   * Selected direct message ID
   */
  protected selectedDirectMessageId = signal<string | null>(null);

  /**
   * Open new message view
   */
  openNewMessage(): void {
    this.newMessageRequested.emit();
  }

  /**
   * Open mailbox view
   */
  openMailbox(): void {
    this.mailboxRequested.emit();
  }

  /**
   * Toggle channels dropdown
   */
  toggleChannels(): void {
    this.isChannelsOpen.update((value) => !value);
  }

  /**
   * Toggle direct messages dropdown
   */
  toggleDirectMessages(): void {
    this.isDirectMessagesOpen.update((value) => !value);
  }

  /**
   * Select a channel
   */
  selectChannel(channelId: string): void {
    const channel = this.channelStore.channels().find((ch) => ch.id === channelId);
    if (channel) {
      this.channelStore.selectChannel(channel);
    }
  }

  /**
   * Select a dummy channel
   */
  selectDummyChannel(channelId: string): void {
    this.selectedChannelId.set(channelId);
    this.channelSelected.emit(channelId);
  }

  /**
   * Add new channel
   */
  addChannel(): void {
    this.isAddChannelActive.update((v) => !v);
    this.isCreateChannelOpen.set(true);
  }

  /**
   * Handle create channel close
   */
  onCreateChannelClose(): void {
    this.isCreateChannelOpen.set(false);
  }

  /**
   * Handle create channel submit
   */
  onCreateChannel(data: { name: string; description: string }): void {
    // Store channel data temporarily
    this.pendingChannelName.set(data.name);
    this.pendingChannelDescription.set(data.description);

    this.isCreateChannelOpen.set(false);
    this.isAddMemberAfterChannelOpen.set(true);
  }

  /**
   * Handle add member after channel close
   */
  onClose(): void {
    this.isAddMemberAfterChannelOpen.set(false);
    this.pendingChannelName.set('');
    this.pendingChannelDescription.set('');
  }

  /**
   * Handle add member after channel cancel - create channel without inviting members
   */
  onCancel(): void {
    const currentUserId = this.currentUserService.currentUserId();
    const newChannel = this.channelsService.createChannel(
      this.pendingChannelName(),
      this.pendingChannelDescription(),
      currentUserId
    );

    this.isAddMemberAfterChannelOpen.set(false);
    this.pendingChannelName.set('');
    this.pendingChannelDescription.set('');

    // Select the newly created channel
    this.selectDummyChannel(newChannel.id);
  }

  /**
   * Handle add member after channel create - create channel and send invitations
   */
  onCreate(data: { type: 'all' | 'specific'; searchValue?: string }): void {
    const currentUserId = this.currentUserService.currentUserId();
    const newChannel = this.channelsService.createChannel(
      this.pendingChannelName(),
      this.pendingChannelDescription(),
      currentUserId
    );

    // TODO: Implement invitations logic
    // - If type === 'all': Get all members from selected channels and send invitations
    // - If type === 'specific': Get selected users and send invitations
    console.log('Create channel with invitations:', data);

    this.isAddMemberAfterChannelOpen.set(false);
    this.pendingChannelName.set('');
    this.pendingChannelDescription.set('');

    // Select the newly created channel
    this.selectDummyChannel(newChannel.id);
  }

  /**
   * Select a direct message
   */
  selectDirectMessage(messageId: string): void {
    this.selectedDirectMessageId.set(messageId);
    this.directMessageSelected.emit(messageId);
  }
}
