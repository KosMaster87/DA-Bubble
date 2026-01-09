/**
 * @fileoverview Workspace Sidebar Component
 * @description Collapsible sidebar showing channels, direct messages and workspace navigation
 * @module features/dashboard/components/workspace-sidebar
 */

import { Component, inject, output, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkspaceSidebarService } from '@shared/services/workspace-sidebar.service';
import { CreateChannelComponent } from '@shared/dashboard-components/create-channel/create-channel.component';
import { AddMemberAfterAddChannelComponent } from '@app/shared/dashboard-components/add-member-after-add-channel/add-member-after-add-channel.component';
import { ThreadUnreadPopupComponent } from '@shared/dashboard-components/thread-unread-popup/thread-unread-popup.component';
import { AuthStore } from '@stores/auth';
import { UserPresenceStore } from '@stores/index';
import { ChannelListService } from '@core/services/channel-list/channel-list.service';
import {
  DirectMessageListService,
  type DirectMessageListItem,
} from '@core/services/direct-message-list/direct-message-list.service';
import { ChannelManagementService } from '@core/services/channel-management/channel-management.service';
import { NavigationService } from '@core/services/navigation/navigation.service';
import { UserTransformationService } from '@core/services/user-transformation/user-transformation.service';
import { MailboxBadgeService } from '@core/services/mailbox-badge/mailbox-badge.service';
import { WorkspaceInitializationService } from '@core/services/workspace-initialization/workspace-initialization.service';
import { type Message as PopupMessage } from '@core/models/message.model';
import { type Message as ViewMessage } from '@shared/dashboard-components/conversation-messages/conversation-messages.component';

@Component({
  selector: 'app-workspace-sidebar',
  imports: [
    CommonModule,
    CreateChannelComponent,
    AddMemberAfterAddChannelComponent,
    ThreadUnreadPopupComponent,
  ],
  templateUrl: './workspace-sidebar.component.html',
  styleUrl: './workspace-sidebar.component.scss',
})
export class WorkspaceSidebarComponent {
  protected authStore = inject(AuthStore);
  protected userPresenceStore = inject(UserPresenceStore);
  protected channelListService = inject(ChannelListService);
  protected directMessageListService = inject(DirectMessageListService);
  protected channelManagementService = inject(ChannelManagementService);
  protected navigationService = inject(NavigationService);
  protected userTransformationService = inject(UserTransformationService);
  protected workspaceSidebarService = inject(WorkspaceSidebarService);
  protected mailboxBadgeService = inject(MailboxBadgeService);
  protected workspaceInitializationService = inject(WorkspaceInitializationService);
  isNewMessageActive = input<boolean>(false);
  isMailboxActive = input<boolean>(false);
  isLegalActive = input<boolean>(false);
  newMessageRequested = output<void>();
  mailboxRequested = output<void>();
  channelSelected = output<string>();
  directMessageSelected = output<string>();
  threadOpened = output<{
    messageId: string;
    parentMessage: ViewMessage;
    conversationId: string;
    isDirectMessage: boolean;
  }>();

  constructor() {
    // Initialize workspace (load stores and setup auto-selection)
    this.workspaceInitializationService.initialize((channelId) => {
      this.channelSelected.emit(channelId);
    });
  }

  /**
   * Channels from ChannelListService - sorted with DABubble-welcome first, then alphabetically
   * Includes unread badge calculation
   */
  protected sortedChannels = this.channelListService.getVisibleChannels();

  /**
   * Selected channel ID (from NavigationService)
   */
  protected selectedChannelId = this.navigationService.getSelectedChannelId();

  /**
   * Check if mailbox has unread messages or pending invitations (from MailboxBadgeService)
   */
  protected hasMailboxUnread = this.mailboxBadgeService.hasUnread;

  /**
   * Direct messages from DirectMessageListService with self-DM (Notes to self) at the top
   * Shows all DM conversations sorted alphabetically with unread badges
   */
  protected directMessages = this.directMessageListService.getConversationsWithSelfDM();

  /**
   * All users from UserStore mapped to UserListItem for add-member popup (from UserTransformationService)
   */
  protected allUsers = this.userTransformationService.getUserList();

  /**
   * Selected direct message ID (from NavigationService)
   */
  protected selectedDirectMessageId = this.navigationService.getSelectedDirectMessageId();

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
    this.workspaceSidebarService.toggleChannels();
  }

  /**
   * Toggle direct messages dropdown
   */
  toggleDirectMessages(): void {
    this.workspaceSidebarService.toggleDirectMessages();
  }

  /**
   * Toggle system control dropdown
   */
  toggleSystemControl(): void {
    this.workspaceSidebarService.toggleSystemControl();
  }

  /**
   * Open legal page
   */
  openLegal(): void {
    this.navigationService.navigateToLegal();
  }

  /**
   * Open settings
   */
  openSettings(): void {
    // TODO: Open settings dialog/page
    console.log('Opening settings...');
  }

  /**
   * Select a channel or special view (mailbox, etc.)
   * Delegates to NavigationService for routing and state management
   */
  selectChannel(channelId: string): void {
    this.navigationService.selectChannel(channelId);
    this.channelSelected.emit(channelId);
  }

  /**
   * Public method to select a channel by ID (for parent components)
   * Note: Does not emit event to avoid circular navigation loops
   */
  selectChannelById(channelId: string): void {
    this.navigationService.selectChannelById(channelId);
  }

  /**
   * Add new channel
   */
  addChannel(): void {
    this.workspaceSidebarService.startAddChannel();
  }

  /**
   * Handle create channel close
   */
  onCreateChannelClose(): void {
    this.workspaceSidebarService.closeCreateChannel();
  }

  /**
   * Handle create channel submit
   */
  onCreateChannel(data: { name: string; description: string; isPrivate: boolean }): void {
    // Store channel data temporarily
    this.workspaceSidebarService.setPendingChannelData(data.name, data.description, data.isPrivate);

    this.workspaceSidebarService.closeCreateChannel();
    this.workspaceSidebarService.openAddMemberAfterChannel();
  }

  /**
   * Handle add member after channel close
   */
  onClose(): void {
    this.workspaceSidebarService.closeAddMemberAfterChannel();
  }

  /**
   * Handle add member after channel create - create channel and send invitations
   */
  async onCreate(data: {
    type: 'all' | 'specific';
    searchValue?: string;
    selectedChannels: Array<{ id: string; name: string }>;
    selectedUsers: Array<{ id: string; name: string; avatar: string }>;
  }): Promise<void> {
    const currentUserId = this.authStore.user()?.uid;
    if (!currentUserId) return;

    // Create channel from pending data via ChannelManagementService
    // (includes lock, cleanup, and auto-selection)
    const newChannelId = await this.channelManagementService.createChannelFromPending(
      data,
      currentUserId
    );

    if (!newChannelId) return; // Locked or failed

    // Notify parent component
    this.channelSelected.emit(newChannelId);
  }

  /**
   * Select a direct message (handles self-DM automatically)
   */
  async selectDirectMessage(messageId: string): Promise<void> {
    const currentUserId = this.authStore.user()?.uid;
    if (!currentUserId) return;

    // Handle self-DM and get actual conversation ID via DirectMessageListService
    const actualConversationId = await this.directMessageListService.selectConversation(
      messageId,
      currentUserId
    );

    if (!actualConversationId) return;

    // Use NavigationService for selection
    this.navigationService.selectDirectMessage(actualConversationId);
    this.directMessageSelected.emit(actualConversationId);
  }

  /**
   * Public method to select a direct message by ID (for parent components)
   * Note: Does not emit event to avoid circular navigation loops
   */
  selectDirectMessageById(messageId: string): void {
    this.navigationService.selectDirectMessageById(messageId);
  }

  /**
   * Deselect the current direct message
   */
  deselectDirectMessage(): void {
    this.navigationService.deselectDirectMessage();
  }

  /**
   * Start or open a direct message conversation with a user
   * @param userId The other user's ID
   * @returns Conversation data { id, participants }
   */
  async startDirectMessage(userId: string): Promise<{
    id: string;
    participants: string[];
  } | null> {
    const currentUserId = this.authStore.user()?.uid;
    if (!currentUserId) {
      console.error('❌ Cannot start DM: No current user');
      return null;
    }

    // Start conversation and auto-select via DirectMessageListService
    // (includes navigation state update)
    const conversation = await this.directMessageListService.startAndSelectConversation(
      currentUserId,
      userId
    );

    return conversation;
  }

  /**
   * Handle thread click from popup
   */
  async onThreadClick(
    event: {
      messageId: string;
      parentMessage: PopupMessage;
      conversationId: string;
      isDirectMessage: boolean;
    },
    isDirectMessage: boolean
  ): Promise<void> {
    // Don't emit conversation selection - thread opening will handle navigation
    // Emitting selection here causes thread to be closed by showChannel/showDirectMessage

    // Handle thread navigation and message transformation via NavigationService
    const { viewMessage } = this.navigationService.handleThreadClick(
      {
        conversationId: event.conversationId,
        messageId: event.messageId,
        message: event.parentMessage,
      },
      event.isDirectMessage
    );

    // Emit thread opened event for parent component
    this.threadOpened.emit({
      messageId: event.messageId,
      parentMessage: viewMessage,
      conversationId: event.conversationId,
      isDirectMessage: event.isDirectMessage,
    });
  }

  /**
   * Handle mouse enter on thread unread item
   */
  onThreadUnreadMouseEnter(id: string): void {
    this.workspaceSidebarService.onThreadUnreadMouseEnter(id);
  }

  /**
   * Handle mouse leave on thread unread item
   */
  onThreadUnreadMouseLeave(): void {
    this.workspaceSidebarService.onThreadUnreadMouseLeave();
  }

  /**
   * Cancel hover timeout (when entering popup)
   */
  onPopupMouseEnter(): void {
    this.workspaceSidebarService.onPopupMouseEnter();
  }

  /**
   * Handle image load error - use fallback avatar
   */
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = '/img/profile/profile-0.svg';
  }
}
