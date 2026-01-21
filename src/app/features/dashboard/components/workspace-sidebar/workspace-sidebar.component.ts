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
import { DirectMessageListService } from '@core/services/direct-message-list/direct-message-list.service';
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

  // Inputs
  isNewMessageActive = input<boolean>(false);
  isMailboxActive = input<boolean>(false);
  isLegalActive = input<boolean>(false);
  isMobileView = input<boolean>(false);

  // Outputs
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
   * Channels from ChannelListService - sorted with DABubble-welcome first, Let's Bubble second, then alphabetically
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

  openNewMessage = (): void => this.newMessageRequested.emit();
  openMailbox = (): void => this.mailboxRequested.emit();
  toggleChannels = (): void => this.workspaceSidebarService.toggleChannels();
  toggleDirectMessages = (): void => this.workspaceSidebarService.toggleDirectMessages();
  toggleSystemControl = (): void => this.workspaceSidebarService.toggleSystemControl();
  openLegal = (): void => this.navigationService.navigateToLegal();
  openSettings = (): void => { /* TODO: Open settings dialog/page */ };

  /**
   * Select a channel or special view (mailbox, etc.)
   * Delegates to NavigationService for routing and state management
   * @param {string} channelId - Channel ID to select
   * @returns {void}
   */
  selectChannel = (channelId: string): void => {
    this.workspaceInitializationService.resetAutoSelectSuppression();
    this.navigationService.selectChannel(channelId);
    this.channelSelected.emit(channelId);
  };

  selectChannelById = (channelId: string): void => this.navigationService.selectChannelById(channelId);
  selectDirectMessageById = (messageId: string): void => this.navigationService.selectDirectMessageById(messageId);
  deselectDirectMessage = (): void => this.navigationService.deselectDirectMessage();

  addChannel = (): void => this.workspaceSidebarService.startAddChannel();
  onCreateChannelClose = (): void => this.workspaceSidebarService.closeCreateChannel();
  onClose = (): void => this.workspaceSidebarService.closeAddMemberAfterChannel();

  /**
   * Handle create channel submit
   * @param {Object} data - Channel data
   * @param {string} data.name - Channel name
   * @param {string} data.description - Channel description
   * @param {boolean} data.isPrivate - Whether channel is private
   * @returns {void}
   */
  onCreateChannel = (data: { name: string; description: string; isPrivate: boolean }): void => {
    this.workspaceSidebarService.setPendingChannelData(data.name, data.description, data.isPrivate);
    this.workspaceSidebarService.closeCreateChannel();
    this.workspaceSidebarService.openAddMemberAfterChannel();
  };

  /**
   * Handle add member after channel create - create channel and send invitations
   * @param {Object} data - Channel creation data
   * @returns {Promise<void>}
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
      currentUserId,
    );

    if (!newChannelId) return; // Locked or failed

    // Notify parent component
    this.channelSelected.emit(newChannelId);
  }

  /**
   * Select a direct message (handles self-DM automatically)
   * @param {string} messageId - Direct message ID to select
   * @returns {Promise<void>}
   */
  selectDirectMessage = async (messageId: string): Promise<void> => {
    const currentUserId = this.authStore.user()?.uid;
    if (!currentUserId) return;

    this.workspaceInitializationService.resetAutoSelectSuppression();

    const actualConversationId = await this.directMessageListService.selectConversation(
      messageId,
      currentUserId,
    );

    if (!actualConversationId) return;
    this.navigationService.selectDirectMessage(actualConversationId);
    this.directMessageSelected.emit(actualConversationId);
  };

  /**
   * Start or open a direct message conversation with a user
   * @param {string} userId - The other user's ID
   * @returns {Promise<{id: string, participants: string[]} | null>} Conversation data or null
   */
  startDirectMessage = async (userId: string): Promise<{ id: string; participants: string[] } | null> => {
    const currentUserId = this.authStore.user()?.uid;
    if (!currentUserId) return null;

    const conversation = await this.directMessageListService.startAndSelectConversation(
      currentUserId,
      userId,
    );

    return conversation;
  };

  /**
   * Handle thread click from popup
   * @param {Object} event - Thread event data
   * @param {string} event.messageId - Message ID
   * @param {PopupMessage} event.parentMessage - Parent message
   * @param {string} event.conversationId - Conversation ID
   * @param {boolean} event.isDirectMessage - Is direct message flag
   * @param {boolean} isDirectMessage - Direct message flag
   * @returns {Promise<void>}
   */
  onThreadClick = async (
    event: {
      messageId: string;
      parentMessage: PopupMessage;
      conversationId: string;
      isDirectMessage: boolean;
    },
    isDirectMessage: boolean,
  ): Promise<void> => {
    const { viewMessage } = this.navigationService.handleThreadClick(
      {
        conversationId: event.conversationId,
        messageId: event.messageId,
        message: event.parentMessage,
      },
      event.isDirectMessage,
    );

    this.threadOpened.emit({
      messageId: event.messageId,
      parentMessage: viewMessage,
      conversationId: event.conversationId,
      isDirectMessage: event.isDirectMessage,
    });
  };

  onThreadUnreadMouseEnter = (id: string): void => this.workspaceSidebarService.onThreadUnreadMouseEnter(id);
  onThreadUnreadMouseLeave = (): void => this.workspaceSidebarService.onThreadUnreadMouseLeave();
  onPopupMouseEnter = (): void => this.workspaceSidebarService.onPopupMouseEnter();

  /**
   * Handle image load error - use fallback avatar
   * @param {Event} event - Error event
   * @returns {void}
   */
  onImageError = (event: Event): void => {
    const img = event.target as HTMLImageElement;
    img.src = '/img/profile/profile-0.svg';
  };
}
