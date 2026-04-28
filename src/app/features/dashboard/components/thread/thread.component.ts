/**
 * @fileoverview Thread Component
 * @description Thread conversations for replying to specific messages
 * @module features/dashboard/components/thread
 */

import { DatePipe } from '@angular/common';
import { Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import { ChannelMembershipService } from '@core/services/channel-membership/channel-membership.service';
import { ProfileManagementService } from '@core/services/profile-management/profile-management.service';
import { ThreadInteractionService } from '@core/services/thread-interaction/thread-interaction.service';
import { ThreadStateService } from '@core/services/thread-state/thread-state.service';
import { UnreadService } from '@core/services/unread/unread.service';
import { ChannelViewComponent } from '@shared/dashboard-components/channel-view/channel-view.component';
import {
  ConversationMessagesComponent,
  type Message,
} from '@shared/dashboard-components/conversation-messages/conversation-messages.component';
import { MessageBoxComponent } from '@shared/dashboard-components/message-box/message-box.component';
import { ProfileEditComponent } from '@shared/dashboard-components/profile-edit/profile-edit.component';
import { ProfileViewComponent } from '@shared/dashboard-components/profile-view/profile-view.component';
import { AuthStore } from '@stores/auth';
import { ChannelStore } from '@stores/channels/channel.store';
import { ThreadStore } from '@stores/threads/thread.store';

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
  protected searchableReplies = this.threadState.getSearchableReplies(
    this.threadInfo,
    this.replies,
  );
  protected threadParticipants = this.threadState.getThreadParticipants(
    this.threadInfo,
    this.replies,
  );
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
   * @description Rehydrates thread data only when parent context changes so listeners are not recreated on unrelated signal updates.
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
   * @description Couples unread clearing to visible reply growth so thread unread state stays accurate without requiring manual user actions.
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
          this.unreadService.markThreadAndParentAsRead(
            info.channelId,
            info.parentMessageId,
            info.isDirectMessage,
          );
        });
      }
      previousReplyCount = currentCount;
    });
  };

  /**
   * Handle close button click
   * @description Emits a pure UI intent so parent containers own panel layout decisions and this component stays reusable.
   * @returns {void}
   */
  onClose = (): void => {
    this.closeRequested.emit();
  };

  /**
   * Send reply to thread
   * @description Co-locates optimistic user intent with thread write orchestration so reply submit behavior is consistent across entry points.
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
      info.isDirectMessage,
    );
    this.unreadService.markThreadAndParentAsRead(
      info.channelId,
      info.parentMessageId,
      info.isDirectMessage,
    );
  };

  /**
   * Scroll to a specific message in thread
   * @description Implements deep-link style in-thread navigation so highlight and scroll behavior remains consistent for search and jump actions.
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
   * @description Keeps a no-op extension point in place so future thread message actions can be introduced without changing template contracts.
   * @param {string} messageId - Message ID
   * @returns {void}
   */
  onMessageClick = (_messageId: string): void => {
    // Reserved for future message actions
  };

  /**
   * Handle avatar click to show profile
   * @description Normalizes profile-open behavior from avatar interactions so all user-entry points resolve through the same selection state.
   * @param {string} senderId - Sender user ID
   * @returns {void}
   */
  onAvatarClick = (senderId: string): void => {
    this.selectedUserId.set(senderId);
    this.isProfileViewOpen.set(true);
  };

  /**
   * Handle sender name click to show profile
   * @description Mirrors avatar behavior to keep sender-name interactions consistent and avoid divergent profile-opening paths.
   * @param {string} senderId - Sender user ID
   * @returns {void}
   */
  onSenderClick = (senderId: string): void => {
    this.selectedUserId.set(senderId);
    this.isProfileViewOpen.set(true);
  };

  /**
   * Handle reaction added to message
   * @description Routes thread reaction toggles through the shared interaction service so DM and channel-thread behavior stays aligned.
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
      info.isDirectMessage || false,
    );
  };

  /**
   * Handle message edited
   * @description Delegates thread edits to a single interaction path so edit permissions and unread side effects remain consistent.
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
      info.isDirectMessage || false,
    );
  };

  /**
   * Handle message deleted
   * @description Sends thread deletion through one interaction boundary so parent metadata and unread state stay synchronized.
   * @param {string} messageId - Message ID
   * @returns {Promise<void>}
   */
  onMessageDeleted = async (messageId: string): Promise<void> => {
    const info = this.threadInfo();
    await this.threadInteraction.deleteMessage(
      info.channelId,
      info.parentMessageId,
      messageId,
      info.isDirectMessage || false,
    );
  };

  /**
   * Handle profile view close
   * @description Resets both visibility and selection state atomically so stale user selection cannot leak into subsequent profile opens.
   * @returns {void}
   */
  onProfileViewClose = (): void => {
    this.isProfileViewOpen.set(false);
    this.selectedUserId.set(null);
  };

  /**
   * Handle profile edit click
   * @description Transitions profile modal from read-only to edit mode through one path to avoid overlapping overlay states.
   * @returns {void}
   */
  onProfileEdit = (): void => {
    this.isProfileViewOpen.set(false);
    this.isEditProfileOpen.set(true);
  };

  /**
   * Handle profile message click - opens DM with selected user
   * @description Bridges profile context into DM navigation so users can transition directly from participant inspection to conversation.
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
   * @description Closes edit mode and clears selection context to prevent stale profile targets between edit sessions.
   * @returns {void}
   */
  onEditProfileClose = (): void => {
    this.isEditProfileOpen.set(false);
    this.selectedUserId.set(null);
  };

  /**
   * Handle edit profile save
   * @description Persists profile updates via profile service from one handler so thread profile UX follows the same update contract as other views.
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
   * @description Opens channel-preview context from mentions without hard navigation so users can confirm before leaving the thread.
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
   * @description Clears channel-preview state in one place so mention-preview overlays never leak stale channel context.
   * @returns {void}
   */
  onChannelViewClose = (): void => {
    this.isChannelViewOpen.set(false);
    this.selectedChannelId.set(null);
  };

  /**
   * Handle channel view join
   * @description Couples join action with mention-navigation intent so mention-driven joins continue directly to the destination channel.
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
   * @description Closes preview modal before emitting navigation intent so overlay state stays deterministic across navigation triggers.
   * @param {string} channelId - Channel ID
   * @returns {void}
   */
  onChannelViewNavigate = (channelId: string): void => {
    this.isChannelViewOpen.set(false);
    this.channelMentionRequested.emit(channelId);
  };

  /**
   * Open profile view from mention click
   * @description Reuses profile-open state handling for mention interactions so all profile entry paths behave consistently.
   * @param {string} userId - User ID
   * @returns {void}
   */
  openProfileView = (userId: string): void => {
    this.selectedUserId.set(userId);
    this.isProfileViewOpen.set(true);
  };
}
