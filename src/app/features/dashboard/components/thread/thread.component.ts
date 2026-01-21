/**
 * @fileoverview Thread Component
 * @description Thread conversations for replying to specific messages
 * @module features/dashboard/components/thread
 */

import { Component, signal, input, output, inject, effect, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MessageBoxComponent } from '@shared/dashboard-components/message-box/message-box.component';
import {
  ConversationMessagesComponent,
  type Message,
} from '@shared/dashboard-components/conversation-messages/conversation-messages.component';
import { ProfileViewComponent } from '@shared/dashboard-components/profile-view/profile-view.component';
import { ProfileEditComponent } from '@shared/dashboard-components/profile-edit/profile-edit.component';
import { ThreadStore } from '@stores/thread.store';
import { ChannelStore } from '@stores/channel.store';
import { AuthStore } from '@stores/auth';
import { UnreadService } from '@core/services/unread/unread.service';
import { ProfileManagementService } from '@core/services/profile-management/profile-management.service';
import { ThreadStateService } from '@core/services/thread-state/thread-state.service';
import { ThreadInteractionService } from '@core/services/thread-interaction/thread-interaction.service';
import { ChannelMembershipService } from '@core/services/channel-membership/channel-membership.service';
import { ChannelViewComponent } from '@shared/dashboard-components/channel-view/channel-view.component';

export interface ThreadInfo {
  channelId: string;
  parentMessageId: string;
  channelName: string;
  parentMessage?: Message;
  isDirectMessage?: boolean;
}

@Component({
  selector: 'app-thread',
  imports: [
    DatePipe,
    MessageBoxComponent,
    ConversationMessagesComponent,
    ProfileViewComponent,
    ProfileEditComponent,
    ChannelViewComponent,
  ],
  templateUrl: './thread.component.html',
  styleUrl: './thread.component.scss',
})
export class ThreadComponent {
  private threadStore = inject(ThreadStore);
  private channelStore = inject(ChannelStore);
  private authStore = inject(AuthStore);
  private channelMembership = inject(ChannelMembershipService);
  private unreadService = inject(UnreadService);
  private profileManagement = inject(ProfileManagementService);
  private threadInteraction = inject(ThreadInteractionService);
  private threadState = inject(ThreadStateService);

  threadInfo = input.required<ThreadInfo>();
  closeRequested = output<void>();
  directMessageRequested = output<string>();
  backRequested = output<void>();
  channelMentionRequested = output<string>();

  protected isProfileViewOpen = signal<boolean>(false);
  protected isEditProfileOpen = signal<boolean>(false);
  protected selectedUserId = signal<string | null>(null);
  protected isChannelViewOpen = signal<boolean>(false);
  protected selectedChannelId = signal<string | null>(null);
  protected replies = this.threadState.getReplies(this.threadInfo);
  protected searchableReplies = this.threadState.getSearchableReplies(this.threadInfo, this.replies);
  protected threadParticipants = this.threadState.getThreadParticipants(this.threadInfo, this.replies);
  protected channelListItems = this.threadState.getChannelListItems();
  protected repliesGroupedByDate = this.threadState.getRepliesGroupedByDate(this.replies);
  protected replyCount = this.threadState.getReplyCount(this.replies);
  protected selectedUserProfile = this.threadState.getSelectedUserProfile(this.selectedUserId);
  protected editProfileUser = this.threadState.getEditProfileUser(this.selectedUserId);
  protected isOwnProfile = this.threadState.getIsOwnProfile(this.selectedUserId);

  constructor() {
    this.setupThreadLoader();
    this.setupAutoReadMarking();
  }

  /**
   * Setup effect to load threads when threadInfo changes
   * @private
   * @returns {void}
   */
  private setupThreadLoader = (): void => {
    let lastChannelId: string | null = null;
    let lastMessageId: string | null = null;

    effect(() => {
      const info = this.threadInfo();
      if (!this.threadState.isValidThreadInfo(info)) {
        lastChannelId = null;
        lastMessageId = null;
        return;
      }

      if (this.threadState.hasThreadInfoChanged(info, lastChannelId, lastMessageId)) {
        lastChannelId = info.channelId;
        lastMessageId = info.parentMessageId;
        this.threadStore.loadThreads(info.channelId, info.parentMessageId, info.isDirectMessage);
      }
    });
  };

  /**
   * Setup effect to auto-mark thread as read when new replies arrive
   * @private
   * @returns {void}
   */
  private setupAutoReadMarking = (): void => {
    let previousReplyCount = 0;
    effect(() => {
      const info = this.threadInfo();
      const currentUserId = untracked(() => this.authStore.user()?.uid);
      if (!this.threadState.canMarkAsRead(info, currentUserId)) return;

      const currentCount = this.replies().length;
      if (this.threadState.shouldMarkAsRead(currentCount, previousReplyCount)) {
        untracked(() => {
          this.unreadService.markThreadAndParentAsRead(info.channelId, info.parentMessageId);
        });
      }
      previousReplyCount = currentCount;
    });
  };

  /**
   * Handle close button click
   * @returns {void}
   */
  onClose = (): void => {
    this.closeRequested.emit();
  };

  /**
   * Send reply to thread
   * @param {string} content - Reply content
   * @returns {Promise<void>}
   */
  sendReply = async (content: string): Promise<void> => {
    if (!content.trim()) return;

    const currentUserId = this.authStore.user()?.uid;
    if (!currentUserId) return;

    const info = this.threadInfo();
    await this.threadStore.addThreadReply(
      info.channelId,
      info.parentMessageId,
      content.trim(),
      currentUserId,
      info.isDirectMessage
    );
    this.unreadService.markThreadAndParentAsRead(info.channelId, info.parentMessageId);
  };

  /**
   * Scroll to a specific message in thread
   * @param {string} messageId - Message ID in format containerId_messageId
   * @returns {void}
   */
  scrollToMessage = (messageId: string): void => {
    const actualMessageId = messageId.split('_')[1];
    setTimeout(() => {
      const element = document.querySelector(`[data-message-id="${actualMessageId}"]`);
      if (!element) return;
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('highlight');
      setTimeout(() => element.classList.remove('highlight'), 2000);
    }, 100);
  };

  /**
   * Handle message click
   * @param {string} messageId - Message ID
   * @returns {void}
   */
  onMessageClick = (_messageId: string): void => {
    // Reserved for future message actions
  };

  /**
   * Handle avatar click to show profile
   * @param {string} senderId - Sender user ID
   * @returns {void}
   */
  onAvatarClick = (senderId: string): void => {
    this.selectedUserId.set(senderId);
    this.isProfileViewOpen.set(true);
  };

  /**
   * Handle sender name click to show profile
   * @param {string} senderId - Sender user ID
   * @returns {void}
   */
  onSenderClick = (senderId: string): void => {
    this.selectedUserId.set(senderId);
    this.isProfileViewOpen.set(true);
  };

  /**
   * Handle reaction added to message
   * @param {Object} data - Reaction data
   * @param {string} data.messageId - Message ID
   * @param {string} data.emoji - Emoji ID
   * @returns {Promise<void>}
   */
  onReactionAdded = async (data: { messageId: string; emoji: string }): Promise<void> => {
    const info = this.threadInfo();
    const currentUserId = this.authStore.user()?.uid;
    if (!currentUserId) return;

    await this.threadInteraction.toggleReaction(
      info.channelId,
      info.parentMessageId,
      data.messageId,
      data.emoji,
      currentUserId,
      info.isDirectMessage || false
    );
  };

  /**
   * Handle message edited
   * @param {Object} data - Edit data
   * @param {string} data.messageId - Message ID
   * @param {string} data.newContent - New message content
   * @returns {Promise<void>}
   */
  onMessageEdited = async (data: { messageId: string; newContent: string }): Promise<void> => {
    const info = this.threadInfo();
    await this.threadInteraction.editMessage(
      info.channelId,
      info.parentMessageId,
      data.messageId,
      data.newContent,
      info.isDirectMessage || false
    );
  };

  /**
   * Handle message deleted
   * @param {string} messageId - Message ID
   * @returns {Promise<void>}
   */
  onMessageDeleted = async (messageId: string): Promise<void> => {
    const info = this.threadInfo();
    await this.threadInteraction.deleteMessage(
      info.channelId,
      info.parentMessageId,
      messageId,
      info.isDirectMessage || false
    );
  };

  /**
   * Handle profile view close
   * @returns {void}
   */
  onProfileViewClose = (): void => {
    this.isProfileViewOpen.set(false);
    this.selectedUserId.set(null);
  };

  /**
   * Handle profile edit click
   * @returns {void}
   */
  onProfileEdit = (): void => {
    this.isProfileViewOpen.set(false);
    this.isEditProfileOpen.set(true);
  };

  /**
   * Handle profile message click - opens DM with selected user
   * @returns {void}
   */
  onProfileMessage = (): void => {
    const userId = this.selectedUserId();
    if (!userId) return;

    this.isProfileViewOpen.set(false);
    this.directMessageRequested.emit(userId);
  };

  /**
   * Handle edit profile close
   * @returns {void}
   */
  onEditProfileClose = (): void => {
    this.isEditProfileOpen.set(false);
    this.selectedUserId.set(null);
  };

  /**
   * Handle edit profile save
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
  onChannelViewClose = (): void => {
    this.isChannelViewOpen.set(false);
    this.selectedChannelId.set(null);
  };

  /**
   * Handle channel view join
   * @param {string} channelId - Channel ID
   * @returns {Promise<void>}
   */
  onChannelViewJoin = async (channelId: string): Promise<void> => {
    await this.channelMembership.joinChannel(channelId);
    this.isChannelViewOpen.set(false);
    this.channelMentionRequested.emit(channelId);
  };

  /**
   * Handle channel view navigate
   * @param {string} channelId - Channel ID
   * @returns {void}
   */
  onChannelViewNavigate = (channelId: string): void => {
    this.isChannelViewOpen.set(false);
    this.channelMentionRequested.emit(channelId);
  };

  /**
   * Open profile view from mention click
   * @param {string} userId - User ID
   * @returns {void}
   */
  openProfileView = (userId: string): void => {
    this.selectedUserId.set(userId);
    this.isProfileViewOpen.set(true);
  };
}
