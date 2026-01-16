/**
 * @fileoverview Chat Private Component
 * @description Private 1-on-1 chat conversations
 * @module features/dashboard/components/chat-private
 */

import { Component, signal, input, inject, computed, output } from '@angular/core';
import { DirectMessageStore, UserStore, ThreadStore, MessageStore } from '@stores/index';
import { AuthStore } from '@stores/auth';
import { UnreadService } from '@core/services/unread/unread.service';
import { UserTransformationService } from '@core/services/user-transformation/user-transformation.service';
import { MessageGroupingService } from '@core/services/message-grouping/message-grouping.service';
import { ProfileManagementService } from '@core/services/profile-management/profile-management.service';
import { DirectMessageInteractionService } from '@core/services/direct-message-interaction/direct-message-interaction.service';
import { DirectMessageStateService } from '@core/services/direct-message-state/direct-message-state.service';
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
    ProfileEditComponent,
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
  protected unreadService = inject(UnreadService);
  private userTransformation = inject(UserTransformationService);
  private messageGrouping = inject(MessageGroupingService);
  private profileManagement = inject(ProfileManagementService);
  private dmInteraction = inject(DirectMessageInteractionService);
  private dmState = inject(DirectMessageStateService);
  protected userName = computed(() => this.dmInfo().userName);
  protected userStatus = computed(() => (this.dmInfo().isOnline ? 'Online' : 'Offline'));
  private conversationId = computed(() => this.dmInfo().conversationId);
  dmInfo = input.required<DMInfo>();
  threadRequested = output<{
    messageId: string;
    parentMessage: Message;
    isDirectMessage?: boolean;
  }>();
  backRequested = output<void>(); // For mobile back navigation

  protected isProfileViewOpen = signal<boolean>(false);
  protected isEditProfileOpen = signal<boolean>(false);
  protected selectedUserId = signal<string | null>(null);

  constructor() {
    this.dmState.setupLoadMessagesEffect(this.conversationId);
    this.dmState.setupAutoMarkAsReadEffect(this.conversationId);
  }

  /**
   * Get other participant's user ID from conversation
   */
  private getOtherUserId = (): string | null => {
    const currentUserId = this.authStore.user()?.uid;
    if (!currentUserId) return null;
    return this.dmState.getOtherParticipantId(this.conversationId(), currentUserId);
  };

  /**
   * User list item data for header button
   */
  protected userListItem = computed<UserListItem>(() => {
    const otherUserId = this.getOtherUserId();
    // For self-DM (Notes), use current user ID for presence badge
    const userId = otherUserId || this.authStore.user()?.uid || '';
    return {
      id: userId,
      name: this.dmInfo().userName,
      avatar: this.dmInfo().userAvatar,
    };
  });

  /**
   * DM participant as list for message-box mention
   */
  protected dmParticipantList = computed<UserListItem[]>(() => {
    const otherUserId = this.getOtherUserId();
    if (!otherUserId) return []; // Self-DM has no other participant

    return [{
      id: otherUserId,
      name: this.dmInfo().userName,
      avatar: this.dmInfo().userAvatar,
    }];
  });

  /**
   * Messages from DirectMessageStore
   */
  protected messages = computed<Message[]>(() => {
    const conversationId = this.dmInfo().conversationId;
    const conversationMessages = this.directMessageStore.messages()[conversationId] || [];
    return this.userTransformation.directMessagesToViewMessages(conversationMessages);
  });

  /**
   * Check if there are more messages to load
   */
  protected hasMoreMessages = computed(() => {
    const conversationId = this.dmInfo().conversationId;
    return this.directMessageStore.hasMoreMessages()[conversationId] ?? false;
  });

  /**
   * Check if older messages are loading
   */
  protected loadingOlderMessages = computed(() => {
    const conversationId = this.dmInfo().conversationId;
    return this.directMessageStore.loadingOlderMessages()[conversationId] ?? false;
  });

  /**
   * Load older messages for pagination
   */
  protected loadOlderMessages = async (): Promise<void> => {
    const conversationId = this.dmInfo().conversationId;
    await this.directMessageStore.loadOlderMessages(conversationId);
  };

  /**
   * Group messages by date
   */
  protected messagesGroupedByDate = computed<MessageGroup[]>(() => {
    return this.messageGrouping.groupMessagesByDate(this.messages());
  });

  /**
   * Get the selected user's profile for profile view
   */
  protected selectedUserProfile = computed<ProfileUser | null>(() => {
    return this.userTransformation.toProfileUser(this.selectedUserId());
  });

  /**
   * Other user for edit profile
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
   * Send message to conversation
   */
  sendMessage = async (content: string): Promise<void> => {
    if (!content.trim()) return;

    const currentUserId = this.authStore.user()?.uid;
    if (!currentUserId) return;

    const conversationId = this.dmInfo().conversationId;
    await this.directMessageStore.sendMessage(conversationId, currentUserId, content.trim());
    this.unreadService.markAsRead(conversationId);
  };

  /**
   * Handle message click
   */
  onMessageClick = (messageId: string): void => {
    console.log('Message clicked:', messageId);
    // TODO: Implement message actions (edit, delete, etc.)
  };

  /**
   * Handle avatar click to show profile
   */
  onAvatarClick = (senderId: string): void => {
    this.openUserProfile(senderId);
  };

  /**
   * Handle sender name click to show profile
   */
  onSenderClick = (senderId: string): void => {
    this.openUserProfile(senderId);
  };

  /**
   * Open user profile view
   */
  private openUserProfile = (userId: string): void => {
    this.selectedUserId.set(userId);
    this.isProfileViewOpen.set(true);
  };

  /**
   * Handle reaction added to message
   */
  onReactionAdded = async (data: { messageId: string; emoji: string }): Promise<void> => {
    const currentUserId = this.getCurrentUserId();
    if (!currentUserId) return;

    const conversationId = this.dmInfo().conversationId;
    await this.dmInteraction.toggleReaction(
      conversationId,
      data.messageId,
      data.emoji,
      currentUserId
    );
  };

  /**
   * Get current user ID with validation
   */
  private getCurrentUserId = (): string | undefined => {
    const userId = this.authStore.user()?.uid;
    if (!userId) console.error('❌ No user ID available');
    return userId;
  };

  /**
   * Handle message edited
   */
  onMessageEdited = async (data: { messageId: string; newContent: string }): Promise<void> => {
    const conversationId = this.dmInfo().conversationId;
    await this.dmInteraction.editMessage(conversationId, data.messageId, data.newContent);
  };

  /**
   * Handle message deleted
   */
  onMessageDeleted = async (messageId: string): Promise<void> => {
    const conversationId = this.dmInfo().conversationId;
    await this.dmInteraction.deleteMessage(conversationId, messageId);
  };

  /**
   * Handle thread click to open thread view
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
   */
  protected onUserButtonClick = (): void => {
    const otherUserId = this.getOtherUserId();
    // For self-DM (Notes), otherUserId is null, use current user ID
    const userId = otherUserId || this.authStore.user()?.uid;
    if (userId) this.openUserProfile(userId);
  };

  /**
   * Close profile view and reset state
   */
  onProfileViewClose = (): void => {
    this.isProfileViewOpen.set(false);
    this.selectedUserId.set(null);
  };

  /**
   * Switch from profile view to edit mode
   */
  onProfileEdit = (): void => {
    this.isProfileViewOpen.set(false);
    this.isEditProfileOpen.set(true);
  };

  /**
   * Handle profile message action
   */
  onProfileMessage = (): void => {
    this.isProfileViewOpen.set(false);
  };

  /**
   * Close edit profile dialog
   */
  onEditProfileClose = (): void => {
    this.isEditProfileOpen.set(false);
  };

  /**
   * Save edited profile data
   */
  onEditProfileSave = async (data: { displayName: string; isAdmin: boolean }): Promise<void> => {
    const userId = this.selectedUserId();
    if (!userId) return;

    await this.updateProfileWithErrorHandling(userId, data);
    this.closeProfileDialogs();
  };

  /**
   * Update profile with error handling
   */
  private updateProfileWithErrorHandling = async (
    userId: string,
    data: { displayName: string; isAdmin: boolean }
  ): Promise<void> => {
    try {
      await this.profileManagement.updateUserProfile(userId, data);
      console.log('✅ User profile updated:', data);
    } catch (error) {
      console.error('❌ Failed to update user profile:', error);
    }
  };

  /**
   * Close all profile dialogs and reset state
   */
  private closeProfileDialogs = (): void => {
    this.isEditProfileOpen.set(false);
    this.selectedUserId.set(null);
  };

  /**
   * Leave current conversation
   */
  onLeaveConversation = async (): Promise<void> => {
    const currentUserId = this.authStore.user()?.uid;
    if (!currentUserId) return;

    const success = await this.dmState.leaveConversation(this.conversationId(), currentUserId);
    if (success) this.onProfileViewClose();
  };
}
