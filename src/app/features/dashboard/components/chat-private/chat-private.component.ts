/**
 * @fileoverview Chat Private Component
 * @description Private 1-on-1 chat conversations
 * @module features/dashboard/components/chat-private
 */

import { Component, computed, inject, input, output, signal } from '@angular/core';
import { ChannelMembershipService } from '@core/services/channel-membership/channel-membership.service';
import { ChatPrivateStateService } from '@core/services/chat-private-state/chat-private-state.service';
import { DirectMessageInteractionService } from '@core/services/direct-message-interaction/direct-message-interaction.service';
import { DirectMessageStateService } from '@core/services/direct-message-state/direct-message-state.service';
import { ProfileManagementService } from '@core/services/profile-management/profile-management.service';
import { UnreadService } from '@core/services/unread/unread.service';
import { ChannelViewComponent } from '@shared/dashboard-components/channel-view/channel-view.component';
import {
  ConversationMessagesComponent,
  type Message,
} from '@shared/dashboard-components/conversation-messages/conversation-messages.component';
import { MessageBoxComponent } from '@shared/dashboard-components/message-box/message-box.component';
import { ProfileEditComponent } from '@shared/dashboard-components/profile-edit/profile-edit.component';
import { ProfileViewComponent } from '@shared/dashboard-components/profile-view/profile-view.component';
import { UserListItemComponent } from '@shared/dashboard-components/user-list-item/user-list-item.component';
import { AuthStore } from '@stores/auth';
import { ChannelStore, DirectMessageStore } from '@stores/index';

export interface DMInfo {
  conversationId: string;
  userName: string;
  userAvatar: string;
  isOnline: boolean;
}

@Component({
  selector: 'app-chat-private',
  imports: [
    MessageBoxComponent,
    ConversationMessagesComponent,
    ProfileViewComponent,
    ProfileEditComponent,
    UserListItemComponent,
    ChannelViewComponent,
  ],
  templateUrl: './chat-private.component.html',
  styleUrl: './chat-private.component.scss',
})
export class ChatPrivateComponent {
  protected directMessageStore = inject(DirectMessageStore);
  protected authStore = inject(AuthStore);
  protected unreadService = inject(UnreadService);
  private profileManagement = inject(ProfileManagementService);
  private dmInteraction = inject(DirectMessageInteractionService);
  private dmState = inject(DirectMessageStateService);
  private channelMembership = inject(ChannelMembershipService);
  private chatPrivateState = inject(ChatPrivateStateService);
  private channelStore = inject(ChannelStore);
  protected userName = computed(() => this.dmInfo().userName);
  protected userStatus = computed(() => (this.dmInfo().isOnline ? 'Online' : 'Offline'));
  private conversationId = computed(() => this.dmInfo().conversationId);
  dmInfo = input.required<DMInfo>();
  threadRequested = output<{
    messageId: string;
    parentMessage: Message;
    isDirectMessage?: boolean;
  }>();
  backRequested = output<void>();
  channelMentionRequested = output<string>();

  protected isProfileViewOpen = signal<boolean>(false);
  protected isEditProfileOpen = signal<boolean>(false);
  protected selectedUserId = signal<string | null>(null);
  protected isChannelViewOpen = signal<boolean>(false);
  protected selectedChannelId = signal<string | null>(null);

  constructor() {
    this.dmState.setupLoadMessagesEffect(this.conversationId);
    this.dmState.setupAutoMarkAsReadEffect(this.conversationId);
  }

  private otherUserId = this.chatPrivateState.getOtherUserId(this.dmInfo);
  protected userListItem = this.chatPrivateState.getUserListItem(this.dmInfo, this.otherUserId);
  protected dmParticipantList = this.chatPrivateState.getDmParticipantList(
    this.dmInfo,
    this.otherUserId,
  );
  protected messages = this.chatPrivateState.getMessages(this.dmInfo);
  protected searchableMessages = this.chatPrivateState.getSearchableMessages(
    this.dmInfo,
    this.messages,
  );
  protected channelListItems = this.chatPrivateState.getChannelListItems();
  protected hasMoreMessages = this.chatPrivateState.getHasMoreMessages(this.dmInfo);
  protected loadingOlderMessages = this.chatPrivateState.getLoadingOlderMessages(this.dmInfo);
  protected messagesGroupedByDate = this.chatPrivateState.getMessagesGroupedByDate(this.messages);
  protected selectedUserProfile = this.chatPrivateState.getSelectedUserProfile(this.selectedUserId);
  protected editProfileUser = this.chatPrivateState.getEditProfileUser(this.selectedUserId);
  protected isOwnProfile = this.chatPrivateState.getIsOwnProfile(this.selectedUserId);
  /**
   * Load older messages for pagination
   * @protected
   * @returns {Promise<void>}
   */
  protected loadOlderMessages = async (): Promise<void> => {
    const conversationId = this.dmInfo().conversationId;
    await this.directMessageStore.loadOlderMessages(conversationId);
  };

  /**
   * Send message to conversation
   * @param {string} content - Message content
   * @returns {Promise<void>}
   */
  sendMessage = async (content: string): Promise<void> => {
    if (!content.trim()) return;

    const currentUserId = this.authStore.user()?.uid;
    if (!currentUserId) return;

    const conversationId = this.dmInfo().conversationId;
    await this.directMessageStore.sendMessage(conversationId, currentUserId, content.trim());
    this.unreadService.markAsRead(conversationId, true);
  };

  /**
   * Scroll to a specific message
   * @param {string} messageId - Message ID in format conversationId_messageId
   * @returns {void}
   */
  scrollToMessage = (messageId: string): void => {
    const actualMessageId = messageId.split('_')[1];

    setTimeout(() => {
      const messageElement = document.querySelector(`[data-message-id="${actualMessageId}"]`);
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        messageElement.classList.add('highlight');
        setTimeout(() => messageElement.classList.remove('highlight'), 2000);
      }
    }, 100);
  };

  /**
   * Open user profile view
   * @param {string} userId - User ID
   * @returns {void}
   */
  protected openUserProfile = (userId: string): void => {
    this.selectedUserId.set(userId);
    this.isProfileViewOpen.set(true);
  };

  onAvatarClick = this.openUserProfile;
  onSenderClick = this.openUserProfile;
  openProfileView = this.openUserProfile;

  /**
   * Handle reaction added to message
   * @param {Object} data - Reaction data
   * @param {string} data.messageId - Message ID
   * @param {string} data.emoji - Emoji ID
   * @returns {Promise<void>}
   */
  onReactionAdded = async (data: { messageId: string; emoji: string }): Promise<void> => {
    const currentUserId = this.getCurrentUserId();
    if (!currentUserId) return;

    const conversationId = this.dmInfo().conversationId;
    await this.dmInteraction.toggleReaction(
      conversationId,
      data.messageId,
      data.emoji,
      currentUserId,
    );
  };

  /**
   * Get current user ID with validation
   * @private
   * @returns {string | undefined} Current user ID or undefined
   */
  private getCurrentUserId = (): string | undefined => {
    return this.authStore.user()?.uid;
  };

  /**
   * Handle message edited
   * @param {Object} data - Edit data
   * @param {string} data.messageId - Message ID
   * @param {string} data.newContent - New message content
   * @returns {Promise<void>}
   */
  onMessageEdited = async (data: { messageId: string; newContent: string }): Promise<void> => {
    const conversationId = this.dmInfo().conversationId;
    await this.dmInteraction.editMessage(conversationId, data.messageId, data.newContent);
  };

  /**
   * Handle message deleted
   * @param {string} messageId - Message ID
   * @returns {Promise<void>}
   */
  onMessageDeleted = async (messageId: string): Promise<void> => {
    const conversationId = this.dmInfo().conversationId;
    await this.dmInteraction.deleteMessage(conversationId, messageId);
  };

  /**
   * Handle thread click to open thread view
   * @param {string} messageId - Message ID
   * @returns {void}
   */
  onThreadClick = (messageId: string): void => {
    const parentMessage = this.messages().find((m) => m.id === messageId);
    if (!parentMessage) return;

    this.threadRequested.emit({
      messageId,
      parentMessage,
      isDirectMessage: true,
    });
  };

  /**
   * Handle user button click to show profile
   * @protected
   * @returns {void}
   */
  protected onUserButtonClick = (): void => {
    const otherUserId = this.otherUserId();
    const userId = otherUserId || this.authStore.user()?.uid;
    if (userId) this.openUserProfile(userId);
  };

  /**
   * Close profile view and reset state
   * @returns {void}
   */
  protected onProfileViewClose = (): void => {
    this.isProfileViewOpen.set(false);
    this.selectedUserId.set(null);
  };

  protected onProfileEdit = (): void => {
    this.isProfileViewOpen.set(false);
    this.isEditProfileOpen.set(true);
  };

  protected onProfileMessage = (): void => this.isProfileViewOpen.set(false);
  protected onEditProfileClose = (): void => this.isEditProfileOpen.set(false);

  /**
   * Save edited profile data
   * @param {Object} data - Profile data to update
   * @param {string} data.displayName - New display name
   * @param {boolean} data.isAdmin - Admin status
   * @returns {Promise<void>}
   */
  onEditProfileSave = async (data: { displayName: string; isAdmin: boolean }): Promise<void> => {
    const userId = this.selectedUserId();
    if (!userId) return;
    await this.profileManagement.updateUserProfile(userId, data);
    this.isEditProfileOpen.set(false);
    this.selectedUserId.set(null);
  };

  /**
   * Leave current conversation
   * @returns {Promise<void>}
   */
  onLeaveConversation = async (): Promise<void> => {
    const currentUserId = this.authStore.user()?.uid;
    if (!currentUserId) return;

    const success = await this.dmState.leaveConversation(this.conversationId(), currentUserId);
    if (success) this.onProfileViewClose();
  };

  /**
   * Handle channel mention click
   * @param {string} channelId - Channel ID
   * @returns {void}
   */
  onChannelMentionClick = (channelId: string): void => {
    const channel = this.channelStore.getChannelById()(channelId);
    if (channel) {
      this.selectedChannelId.set(channelId);
      this.isChannelViewOpen.set(true);
    }
  };

  /**
   * Handle channel view close
   * @returns {void}
   */
  protected onChannelViewClose = (): void => {
    this.isChannelViewOpen.set(false);
    this.selectedChannelId.set(null);
  };

  /**
   * Handle channel view join
   * @param {string} channelId - Channel ID
   * @returns {Promise<void>}
   */
  protected onChannelViewJoin = async (channelId: string): Promise<void> => {
    await this.channelMembership.joinChannel(channelId);
    this.onChannelViewClose();
    this.channelMentionRequested.emit(channelId);
  };

  protected onChannelViewNavigate = (channelId: string): void => {
    this.onChannelViewClose();
    this.channelMentionRequested.emit(channelId);
  };
}
