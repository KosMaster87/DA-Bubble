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
import { MessageSearchItem } from '@shared/dashboard-components/message-search-item/message-search-item.component';
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
import { ChannelStore } from '@stores/channel.store';
import { UserStore } from '@stores/user.store';
import { AuthStore } from '@stores/auth';
import { UnreadService } from '@core/services/unread/unread.service';
import { UserTransformationService } from '@core/services/user-transformation/user-transformation.service';
import { MessageGroupingService } from '@core/services/message-grouping/message-grouping.service';
import { ProfileManagementService } from '@core/services/profile-management/profile-management.service';
import { ThreadInteractionService } from '@core/services/thread-interaction/thread-interaction.service';
import { UserListItem } from '@shared/dashboard-components/user-list-item/user-list-item.component';
import { ChannelListItem } from '@shared/dashboard-components/channel-list-item/channel-list-item.component';

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
  private channelStore = inject(ChannelStore);
  private userStore = inject(UserStore);
  private authStore = inject(AuthStore);
  private unreadService = inject(UnreadService);
  private userTransformation = inject(UserTransformationService);
  private messageGrouping = inject(MessageGroupingService);
  private profileManagement = inject(ProfileManagementService);
  private threadInteraction = inject(ThreadInteractionService);

  threadInfo = input.required<ThreadInfo>();
  closeRequested = output<void>();
  directMessageRequested = output<string>();
  backRequested = output<void>(); // For mobile back navigation

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

  /**
   * Replies formatted for search in MessageBox
   */
  protected searchableReplies = computed<MessageSearchItem[]>(() => {
    const info = this.threadInfo();
    if (!info) return [];

    const displayName = info.isDirectMessage
      ? `@${info.channelName}`
      : `#${info.channelName}`;
    const containerId = info.isDirectMessage ? info.parentMessageId : info.channelId;

    return this.replies()
      .map(msg => ({
        id: `${containerId}_${msg.id}`,
        displayName,
        description: msg.content.substring(0, 60) + (msg.content.length > 60 ? '...' : ''),
        type: info.isDirectMessage ? 'dm' as const : 'channel' as const
      }))
      .sort((a, b) => {
        const msgA = this.replies().find(m => m.id === a.id.split('_')[1]);
        const msgB = this.replies().find(m => m.id === b.id.split('_')[1]);
        if (!msgA || !msgB) return 0;
        return msgB.timestamp.getTime() - msgA.timestamp.getTime();
      });
  });

  /**
   * Thread participants (channel members or DM participant) for message-box mentions
   */
  protected threadParticipants = computed<UserListItem[]>(() => {
    const info = this.threadInfo();
    if (!info?.channelId) return [];

    // For DM threads, get the other participant from replies
    if (info.isDirectMessage) {
      const replies = this.replies();
      if (replies.length === 0) return [];

      const currentUserId = this.authStore.user()?.uid;
      const otherUser = replies.find(r => r.senderId !== currentUserId);
      if (!otherUser) return [];

      return [{
        id: otherUser.senderId,
        name: otherUser.senderName,
        avatar: otherUser.senderAvatar,
      }];
    }

    // For channel threads, get channel members
    const channel = this.channelStore.channels().find(c => c.id === info.channelId);
    if (!channel?.members) return [];

    const allUsers = this.userStore.users();
    return channel.members
      .map((memberId: string) => {
        const user = allUsers.find(u => u.uid === memberId);
        if (!user) return null;
        return {
          id: user.uid,
          name: user.displayName,
          avatar: user.photoURL || '',
        } as UserListItem;
      })
      .filter((u): u is UserListItem => u !== null);
  });

  /**
   * Public channels formatted for message-box channel mentions
   */
  protected channelListItems = computed<ChannelListItem[]>(() => {
    return this.channelStore.getPublicChannels().map((ch) => ({
      id: ch.id,
      name: ch.name,
    }));
  });

  constructor() {
    this.setupThreadLoader();
    this.setupAutoReadMarking();
  }

  /**
   * Setup effect to load threads when threadInfo changes
   */
  private setupThreadLoader = (): void => {
    let lastChannelId: string | null = null;
    let lastMessageId: string | null = null;

    effect(() => {
      const info = this.threadInfo();
      if (!info?.parentMessageId || !info?.channelId) {
        lastChannelId = null;
        lastMessageId = null;
        return;
      }

      // Only load if IDs actually changed (prevent infinite loop from new object references)
      if (info.channelId === lastChannelId && info.parentMessageId === lastMessageId) {
        return;
      }

      lastChannelId = info.channelId;
      lastMessageId = info.parentMessageId;
      this.threadStore.loadThreads(info.channelId, info.parentMessageId, info.isDirectMessage);
    });
  };

  /**
   * Setup effect to auto-mark thread as read when new replies arrive
   */
  private setupAutoReadMarking = (): void => {
    let previousReplyCount = 0;
    effect(() => {
      const info = this.threadInfo();
      const currentUserId = untracked(() => this.authStore.user()?.uid);
      if (!info?.parentMessageId || !currentUserId || !info?.channelId) return;

      const replies = this.replies();
      const currentCount = replies.length;

      if (currentCount > previousReplyCount && currentCount > 0) {
        untracked(() => {
          this.unreadService.markThreadAndParentAsRead(info.channelId, info.parentMessageId);
        });
      }

      previousReplyCount = currentCount;
    });
  };

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

    await this.threadStore.addThreadReply(
      info.channelId,
      info.parentMessageId,
      content.trim(),
      currentUserId,
      info.isDirectMessage
    );

    this.unreadService.markThreadAndParentAsRead(info.channelId, info.parentMessageId);
  }

  /**
   * Scroll to a specific message in thread
   */
  scrollToMessage = (messageId: string): void => {
    // Extract the actual message ID from the format "containerId_messageId"
    const actualMessageId = messageId.split('_')[1];

    // Small delay to ensure DOM is updated
    setTimeout(() => {
      const messageElement = document.querySelector(`[data-message-id="${actualMessageId}"]`);
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Optional: Add highlight effect
        messageElement.classList.add('highlight');
        setTimeout(() => messageElement.classList.remove('highlight'), 2000);
      }
    }, 100);
  };

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
   * Handle profile message click - opens DM with selected user
   */
  onProfileMessage(): void {
    const userId = this.selectedUserId();
    if (!userId) return;

    this.isProfileViewOpen.set(false);
    this.directMessageRequested.emit(userId);
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
