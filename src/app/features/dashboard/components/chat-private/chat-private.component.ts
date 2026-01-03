/**
 * @fileoverview Chat Private Component
 * @description Private 1-on-1 chat conversations
 * @module features/dashboard/components/chat-private
 */

import { Component, signal, input, inject, computed, output, effect } from '@angular/core';
import { DirectMessageStore, UserStore, ThreadStore, MessageStore } from '@stores/index';
import { MessageType } from '@core/models/message.model';
import { AuthStore } from '@stores/auth';
import { MessageBoxComponent } from '@shared/dashboard-components/message-box/message-box.component';
import {
  ConversationMessagesComponent,
  type Message,
  type MessageGroup,
} from '@shared/dashboard-components/conversation-messages/conversation-messages.component';
import { MembersMiniatureComponent } from '@shared/dashboard-components/members-miniatures/members-miniatures.component';
import { MembersOptionsMenuComponent } from '@shared/dashboard-components/members-options-menu/members-options-menu.component';
import {
  ProfileViewComponent,
  ProfileUser,
} from '@shared/dashboard-components/profile-view/profile-view.component';
import {
  EditProfileComponent,
  EditProfileUser,
} from '@shared/dashboard-components/edit-profile/edit-profile.component';
import {
  UserListItemComponent,
  UserListItem,
} from '@shared/dashboard-components/user-list-item/user-list-item.component';

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
    EditProfileComponent,
    UserListItemComponent,
  ],
  templateUrl: './chat-private.component.html',
  styleUrl: './chat-private.component.scss',
})
export class ChatPrivateComponent {
  protected directMessageStore = inject(DirectMessageStore);
  protected userStore = inject(UserStore);
  protected threadStore = inject(ThreadStore);
  protected messageStore = inject(MessageStore);
  protected authStore = inject(AuthStore);
  protected userName = computed(() => this.dmInfo().userName);
  protected userStatus = computed(() => (this.dmInfo().isOnline ? 'Online' : 'Offline'));
  dmInfo = input.required<DMInfo>();
  threadRequested = output<{
    messageId: string;
    parentMessage: Message;
    isDirectMessage?: boolean;
  }>();

  // Profile state
  protected isProfileViewOpen = signal<boolean>(false);
  protected isEditProfileOpen = signal<boolean>(false);
  protected selectedUserId = signal<string | null>(null);

  constructor() {
    console.log('🔷 ChatPrivateComponent: Constructor called');

    // Load messages when conversation changes
    effect(() => {
      const dmInfo = this.dmInfo();
      const currentUserId = this.authStore.user()?.uid;
      console.log('🔷 ChatPrivateComponent: Effect triggered', { dmInfo, currentUserId });
      if (dmInfo?.conversationId && currentUserId) {
        // Load messages for this conversation
        this.directMessageStore.loadMessages(dmInfo.conversationId);
      }
    });
  }

  /**
   * Get the other user's ID from conversation
   */
  private getOtherUserId(): string | null {
    const conversationId = this.dmInfo().conversationId;
    const currentUserId = this.authStore.user()?.uid;
    if (!currentUserId || !conversationId) return null;

    // ConversationId format: "uid1_uid2" (alphabetically sorted)
    const participants = conversationId.split('_');
    return participants.find((id) => id !== currentUserId) || null;
  }

  /**
   * User list item data for header button
   */
  protected userListItem = computed<UserListItem>(() => {
    const otherUserId = this.getOtherUserId();
    return {
      id: otherUserId || '',
      name: this.dmInfo().userName,
      avatar: this.dmInfo().userAvatar,
    };
  });

  /**
   * Messages from DirectMessageStore
   */
  protected messages = computed<Message[]>(() => {
    const conversationId = this.dmInfo().conversationId;
    const conversationMessages = this.directMessageStore.messages()[conversationId] || [];
    const currentUserId = this.authStore.user()?.uid || '';

    return conversationMessages.map((msg) => {
      const user = this.userStore.getUserById()(msg.authorId);
      return {
        id: msg.id,
        senderId: msg.authorId,
        senderName: user?.displayName || 'Unknown User',
        senderAvatar: user?.photoURL || '/img/profile/profile-0.svg',
        content: msg.content,
        timestamp: msg.createdAt,
        isOwnMessage: msg.authorId === currentUserId,
        threadCount: msg.threadCount || 0,
        reactions: msg.reactions || [],
        lastThreadTimestamp:
          msg.lastThreadTimestamp instanceof Date
            ? msg.lastThreadTimestamp
            : msg.lastThreadTimestamp
            ? new Date(msg.lastThreadTimestamp)
            : undefined,
        isEdited: msg.isEdited,
        editedAt:
          msg.editedAt instanceof Date
            ? msg.editedAt
            : msg.editedAt
            ? new Date(msg.editedAt)
            : undefined,
      };
    });
  });

  /**
   * Group messages by date
   */
  protected messagesGroupedByDate = computed<MessageGroup[]>(() => {
    const messages = this.messages();
    const groups = new Map<string, Message[]>();

    messages.forEach((message) => {
      const dateKey = this.getDateKey(message.timestamp);
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }

      groups.get(dateKey)!.push({
        ...message,
        threadCount:
          message.threadCount && message.threadCount > 0 ? message.threadCount : undefined,
      });
    });

    return Array.from(groups.entries()).map(([dateKey, msgs]) => ({
      date: msgs[0].timestamp,
      label: this.getDateLabel(msgs[0].timestamp),
      messages: msgs,
    }));
  });

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
   * Other user for edit profile
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
   * Send message
   */
  async sendMessage(content: string): Promise<void> {
    if (!content.trim()) return;

    const currentUserId = this.authStore.user()?.uid;
    if (!currentUserId) return;
    const conversationId = this.dmInfo().conversationId;

    console.log('📤 Sending DM message', { conversationId, authorId: currentUserId });

    // Send message via DirectMessageStore
    await this.directMessageStore.sendMessage(conversationId, currentUserId, content.trim());
  }

  /**
   * Handle message click
   */
  onMessageClick(messageId: string): void {
    console.log('Message clicked:', messageId);
    // TODO: Implement message actions (edit, delete, etc.)
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
    console.log('🟣 ChatPrivate: Reaction added:', data);
    const conversationId = this.dmInfo().conversationId;
    const currentUserId = this.authStore.user()?.uid;

    if (!currentUserId) {
      console.error('❌ No user ID available');
      return;
    }

    try {
      await this.directMessageStore.toggleReaction(
        conversationId,
        data.messageId,
        data.emoji,
        currentUserId
      );
      console.log('✅ DM Reaction toggled:', data.messageId, data.emoji);
    } catch (error) {
      console.error('❌ Failed to add reaction:', error);
    }
  }

  /**
   * Handle message edited
   */
  async onMessageEdited(data: { messageId: string; newContent: string }): Promise<void> {
    const conversationId = this.dmInfo().conversationId;
    await this.directMessageStore.updateMessage(conversationId, data.messageId, data.newContent);
  }

  /**
   * Handle thread click
   */
  onThreadClick(messageId: string): void {
    // Find the parent message
    const parentMessage = this.messages().find((m) => m.id === messageId);
    if (parentMessage) {
      this.threadRequested.emit({
        messageId,
        parentMessage,
        isDirectMessage: true, // Mark as DM thread
      });
    }
  }

  /**
   * Handle user button click (show profile)
   */
  onUserButtonClick(): void {
    const otherUserId = this.getOtherUserId();
    if (otherUserId) {
      this.selectedUserId.set(otherUserId);
      this.isProfileViewOpen.set(true);
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
    console.log('Send message to user');
    this.isProfileViewOpen.set(false);
    // Already in DM view with this user
  }

  /**
   * Handle edit profile close
   */
  onEditProfileClose(): void {
    this.isEditProfileOpen.set(false);
  }

  /**
   * Handle edit profile save
   */
  async onEditProfileSave(data: { displayName: string; isAdmin: boolean }): Promise<void> {
    console.log('Save profile:', data);
    const userId = this.selectedUserId();
    if (!userId) return;

    // TODO: Implement user profile update
    // await this.userStore.updateUser(userId, {
    //   displayName: data.displayName,
    //   isAdmin: data.isAdmin,
    // });

    this.isEditProfileOpen.set(false);
    this.selectedUserId.set(null);
  }

  /**
   * Handle leave conversation
   */
  async onLeaveConversation(): Promise<void> {
    const conversationId = this.dmInfo().conversationId;
    const currentUserId = this.authStore.user()?.uid;

    if (!currentUserId || !conversationId) {
      console.error('❌ Cannot leave conversation: Missing user ID or conversation ID');
      return;
    }

    console.log('🚪 Leaving conversation:', { conversationId, userId: currentUserId });

    try {
      await this.directMessageStore.leaveConversation(conversationId, currentUserId);
      console.log('✅ Conversation left successfully');

      // Close profile view
      this.onProfileViewClose();

      // TODO: Navigate back to main view (emit event to dashboard component)
    } catch (error) {
      console.error('❌ Failed to leave conversation:', error);
    }
  }
}
