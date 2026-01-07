/**
 * @fileoverview Thread Component
 * @description Thread conversations for replying to specific messages in channels and private conversations
 * @module features/dashboard/components/thread
 */

import {
  Component,
  signal,
  input,
  output,
  computed,
  inject,
  effect,
  untracked,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { MessageBoxComponent } from '@shared/dashboard-components/message-box/message-box.component';
import {
  ConversationMessagesComponent,
  type Message,
  type MessageGroup,
} from '@shared/dashboard-components/conversation-messages/conversation-messages.component';
import {
  ProfileViewComponent,
  ProfileUser,
} from '@shared/dashboard-components/profile-view/profile-view.component';
import {
  ProfileEditComponent,
  EditProfileUser,
} from '@shared/dashboard-components/profile-edit/profile-edit.component';
import { ThreadStore } from '@stores/thread.store';
import { UserStore } from '@stores/user.store';
import { AuthStore } from '@stores/auth';
import { UnreadService } from '@core/services/unread/unread.service';
import { UserTransformationService } from '@core/services/user-transformation/user-transformation.service';
import { MessageGroupingService } from '@core/services/message-grouping/message-grouping.service';
import { ProfileManagementService } from '@core/services/profile-management/profile-management.service';
import { ThreadInteractionService } from '@core/services/thread-interaction/thread-interaction.service';

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
  ],
  templateUrl: './thread.component.html',
  styleUrl: './thread.component.scss',
})
export class ThreadComponent {
  private threadStore = inject(ThreadStore);
  private authStore = inject(AuthStore);
  private userStore = inject(UserStore);
  private unreadService = inject(UnreadService);
  private userTransformation = inject(UserTransformationService);
  private messageGrouping = inject(MessageGroupingService);
  private profileManagement = inject(ProfileManagementService);
  private threadInteraction = inject(ThreadInteractionService);

  threadInfo = input.required<ThreadInfo>();
  closeRequested = output<void>();

  // Profile state
  protected isProfileViewOpen = signal<boolean>(false);
  protected isEditProfileOpen = signal<boolean>(false);
  protected selectedUserId = signal<string | null>(null);

  /**
   * Thread replies loaded from store (reactive to real-time updates)
   */
  protected replies = computed<Message[]>(() => {
    const info = this.threadInfo();
    if (!info?.parentMessageId) return [];

    const threadMessages = this.threadStore.getThreadsByMessageId()(info.parentMessageId);
    return this.userTransformation.threadMessagesToViewMessages(threadMessages);
  });

  constructor() {
    // Load threads when threadInfo changes (sets up real-time listener)
    effect(() => {
      const info = this.threadInfo();
      if (info?.parentMessageId && info?.channelId) {
        this.threadStore.loadThreads(info.channelId, info.parentMessageId, info.isDirectMessage);
      }
    });

    // Auto-mark thread as read when new replies arrive while thread is open
    let previousReplyCount = 0;
    effect(() => {
      const info = this.threadInfo();
      const currentUserId = untracked(() => this.authStore.user()?.uid);
      if (!info?.parentMessageId || !currentUserId || !info?.channelId) return;

      const replies = this.replies();
      const currentCount = replies.length;

      // Only mark as read if reply count increased (new reply arrived)
      if (currentCount > previousReplyCount && currentCount > 0) {
        untracked(() => {
          // Mark both parent message AND thread as read
          this.unreadService.markThreadAndParentAsRead(info.channelId, info.parentMessageId);
        });
      }

      previousReplyCount = currentCount;
    });
  }

  /**
   * Group replies by date
   */
  protected repliesGroupedByDate = computed<MessageGroup[]>(() => {
    return this.messageGrouping.groupMessagesByDate(this.replies());
  });

  /**
   * Total reply count
   */
  protected replyCount = computed(() => this.replies().length);

  /**
   * Get the selected user's profile for profile view
   */
  protected selectedUserProfile = computed<ProfileUser | null>(() => {
    return this.userTransformation.toProfileUser(this.selectedUserId());
  });

  /**
   * Selected user for edit profile
   */
  protected editProfileUser = computed<EditProfileUser | null>(() => {
    return this.userTransformation.toEditProfileUser(this.selectedUserId());
  });

  /**
   * Check if selected user is own profile
   */
  protected isOwnProfile = computed(() => {
    return this.selectedUserId() === this.authStore.user()?.uid;
  });

  /**
   * Handle close button click
   */
  onClose(): void {
    this.closeRequested.emit();
  }

  /**
   * Send reply
   */
  async sendReply(content: string): Promise<void> {
    if (!content.trim()) return;

    const currentUserId = this.authStore.user()?.uid;
    if (!currentUserId) return;
    const info = this.threadInfo();

    // Add reply via store
    await this.threadStore.addThreadReply(
      info.channelId,
      info.parentMessageId,
      content.trim(),
      currentUserId,
      info.isDirectMessage // Pass DM flag
    );

    // Mark both parent message AND parent channel/conversation as read
    // to prevent current user from seeing their own thread message as unread
    this.unreadService.markThreadAndParentAsRead(info.channelId, info.parentMessageId);
    // Replies will auto-update via computed signal
  }

  /**
   * Handle message click
   */
  onMessageClick(messageId: string): void {
    console.log('Thread message clicked:', messageId);
    // TODO: Implement message actions
  }

  /**
   * Handle avatar click
   */
  onAvatarClick(senderId: string): void {
    console.log('Avatar clicked:', senderId);
    this.selectedUserId.set(senderId);
    this.isProfileViewOpen.set(true);
  }

  /**
   * Handle sender name click
   */
  onSenderClick(senderId: string): void {
    console.log('Sender name clicked:', senderId);
    this.selectedUserId.set(senderId);
    this.isProfileViewOpen.set(true);
  }

  /**
   * Handle reaction added
   */
  async onReactionAdded(data: { messageId: string; emoji: string }): Promise<void> {
    console.log('🟣 Thread: Reaction added:', data);
    const info = this.threadInfo();
    const currentUserId = this.authStore.user()?.uid;

    if (!currentUserId) {
      console.error('❌ No user ID available');
      return;
    }

    await this.threadInteraction.toggleReaction(
      info.channelId,
      info.parentMessageId,
      data.messageId,
      data.emoji,
      currentUserId,
      info.isDirectMessage || false
    );
  }

  /**
   * Handle message edited
   */
  async onMessageEdited(data: { messageId: string; newContent: string }): Promise<void> {
    const info = this.threadInfo();
    await this.threadInteraction.editMessage(
      info.channelId,
      info.parentMessageId,
      data.messageId,
      data.newContent,
      info.isDirectMessage || false
    );
  }

  /**
   * Handle message deleted
   */
  async onMessageDeleted(messageId: string): Promise<void> {
    const info = this.threadInfo();
    await this.threadInteraction.deleteMessage(
      info.channelId,
      info.parentMessageId,
      messageId,
      info.isDirectMessage || false
    );
  }

  /**
   * Handle profile view close
   */
  onProfileViewClose(): void {
    this.isProfileViewOpen.set(false);
    this.selectedUserId.set(null);
  }

  /**
   * Handle profile edit click
   */
  onProfileEdit(): void {
    this.isProfileViewOpen.set(false);
    this.isEditProfileOpen.set(true);
  }

  /**
   * Handle profile message click
   */
  onProfileMessage(): void {
    console.log('Send message to user:', this.selectedUserId());
    this.isProfileViewOpen.set(false);
    // TODO: Open DM with this user
  }

  /**
   * Handle edit profile close
   */
  onEditProfileClose(): void {
    this.isEditProfileOpen.set(false);
    this.selectedUserId.set(null);
  }

  /**
   * Handle edit profile save
   */
  async onEditProfileSave(data: { displayName: string; isAdmin: boolean }): Promise<void> {
    const userId = this.selectedUserId();
    if (!userId) return;

    try {
      await this.profileManagement.updateUserProfile(userId, data);
      console.log('✅ User profile updated:', data);
    } catch (error) {
      console.error('❌ Failed to update user profile:', error);
    }

    this.isEditProfileOpen.set(false);
    this.selectedUserId.set(null);
  }
}
