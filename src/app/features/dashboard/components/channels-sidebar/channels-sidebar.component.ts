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
    console.log('Create channel:', data);
    this.isCreateChannelOpen.set(false);
    this.isAddMemberAfterChannelOpen.set(true);
    // TODO: Implement create channel logic
  }

  /**
   * Handle add member after channel close
   */
  onClose(): void {
    this.isAddMemberAfterChannelOpen.set(false);
  }

  /**
   * Handle add member after channel cancel
   */
  onCancel(): void {
    console.log('Create channel without member');
    this.isAddMemberAfterChannelOpen.set(false);
    // TODO: Implement create channel without member logic
  }

  /**
   * Handle add member after channel create
   */
  onCreate(data: { type: 'all' | 'specific'; searchValue?: string }): void {
    console.log('Create channel with members:', data);
    this.isAddMemberAfterChannelOpen.set(false);
    // TODO: Implement create channel with members logic
  }

  /**
   * Select a direct message
   */
  selectDirectMessage(messageId: string): void {
    this.selectedDirectMessageId.set(messageId);
    this.directMessageSelected.emit(messageId);
  }
}
