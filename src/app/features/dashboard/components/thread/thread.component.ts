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
import { ThreadStore, UserStore } from '@stores/index';
import { AuthStore } from '@stores/auth';
import { UnreadService } from '@core/services/unread/unread.service';

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
    const currentUserId = this.authStore.user()?.uid || '';

    // Convert ThreadMessage to Message format with user data
    return threadMessages.map((thread) => {
      const user = this.userStore.getUserById()(thread.authorId);
      return {
        id: thread.id,
        senderId: thread.authorId,
        senderName: user?.displayName || 'Unknown User',
        senderAvatar: user?.photoURL || '/img/profile/profile-0.svg',
        content: thread.content,
        timestamp: thread.createdAt,
        isOwnMessage: thread.authorId === currentUserId,
        reactions: thread.reactions || [],
      };
    });
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
          this.unreadService.markAsRead(info.parentMessageId);
          this.unreadService.markThreadAsRead(info.channelId, info.parentMessageId);
        });
      }

      previousReplyCount = currentCount;
    });
  }

  /**
   * Group replies by date
   */
  protected repliesGroupedByDate = computed<MessageGroup[]>(() => {
    const messages = this.replies();
    const groups = new Map<string, Message[]>();

    messages.forEach((message) => {
      const dateKey = this.getDateKey(message.timestamp);
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(message);
    });

    return Array.from(groups.entries()).map(([dateKey, msgs]) => ({
      date: msgs[0].timestamp,
      label: this.getDateLabel(msgs[0].timestamp),
      messages: msgs,
    }));
  });

  /**
   * Total reply count
   */
  protected replyCount = computed(() => this.replies().length);

  /**
   * Get the selected user's profile for profile view
   */
  protected selectedUserProfile = computed<ProfileUser | null>(() => {
    const userId = this.selectedUserId();
    if (!userId) return null;

    const user = this.userStore.getUserById()(userId);
    if (!user) return null;

    return {
      id: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL || '/img/profile/profile-0.svg',
      status: user.isOnline ? 'online' : 'offline',
      isAdmin: false,
    };
  });

  /**
   * Selected user for edit profile
   */
  protected editProfileUser = computed<EditProfileUser | null>(() => {
    const userId = this.selectedUserId();
    if (!userId) return null;

    const user = this.userStore.getUserById()(userId);
    if (!user) return null;

    return {
      id: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL || '/img/profile/profile-0.svg',
      isAdmin: false,
    };
  });

  /**
   * Check if selected user is own profile
   */
  protected isOwnProfile = computed(() => {
    return this.selectedUserId() === this.authStore.user()?.uid;
  });

  /**
   * Get date key for grouping (YYYY-MM-DD)
   */
  private getDateKey(date: Date): string {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
  }

  /**
   * Get date label ("Starting today" or formatted date)
   */
  private getDateLabel(date: Date): string {
    const today = new Date();
    const messageDate = new Date(date);

    // Check if same day
    if (
      today.getFullYear() === messageDate.getFullYear() &&
      today.getMonth() === messageDate.getMonth() &&
      today.getDate() === messageDate.getDate()
    ) {
      return 'Starting today';
    }

    // Format date: "Monday, 28 December"
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(messageDate);
  }

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
    this.unreadService.markAsRead(info.parentMessageId);
    this.unreadService.markAsRead(info.channelId);

    // Mark this specific thread as read to prevent orange border
    this.unreadService.markThreadAsRead(info.channelId, info.parentMessageId);
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

    try {
      await this.threadStore.toggleReaction(
        info.channelId,
        info.parentMessageId,
        data.messageId,
        data.emoji,
        currentUserId,
        info.isDirectMessage || false
      );
      console.log('✅ Thread Reaction toggled:', data.messageId, data.emoji);
    } catch (error) {
      console.error('❌ Failed to add reaction:', error);
    }
  }

  /**
   * Handle message edited
   */
  async onMessageEdited(data: { messageId: string; newContent: string }): Promise<void> {
    const info = this.threadInfo();
    await this.threadStore.updateThread(
      info.channelId,
      info.parentMessageId,
      data.messageId,
      { content: data.newContent },
      info.isDirectMessage
    );
  }

  /**
   * Handle message deleted
   */
  async onMessageDeleted(messageId: string): Promise<void> {
    const info = this.threadInfo();
    try {
      await this.threadStore.deleteThread(
        info.channelId,
        info.parentMessageId,
        messageId,
        info.isDirectMessage
      );
      console.log('✅ Thread message deleted successfully');
    } catch (error) {
      console.error('❌ Failed to delete thread message:', error);
    }
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
      // Check if editing own profile
      const currentUserId = this.authStore.user()?.uid;
      if (userId === currentUserId) {
        // Update AuthStore for own profile (syncs to UserStore automatically)
        await this.authStore.updateUserProfile({ displayName: data.displayName });
      } else {
        // Update UserStore for other users
        await this.userStore.updateUserData(userId, {
          displayName: data.displayName,
          // TODO: isAdmin not in User model yet
        });
      }
      console.log('✅ User profile updated:', data);
    } catch (error) {
      console.error('❌ Failed to update user profile:', error);
    }

    this.isEditProfileOpen.set(false);
    this.selectedUserId.set(null);
  }
}
