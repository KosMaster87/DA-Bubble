/**
 * @fileoverview Channel Conversation Component
 * @description Chat interface for specific channels
 * @module features/dashboard/components/channel-conversation
 */

import { Component, signal, input, inject, computed, output, effect } from '@angular/core';
import { MessageBoxComponent } from '@shared/dashboard-components/message-box/message-box.component';
import {
  ConversationMessagesComponent,
  type Message,
  type MessageGroup,
} from '@shared/dashboard-components/conversation-messages/conversation-messages.component';
import { MembersMiniatureComponent } from '@shared/dashboard-components/members-miniatures/members-miniatures.component';
import { AddMemberButtonComponent } from '@shared/dashboard-components/add-member-button/add-member-button.component';
import { MembersOptionsMenuComponent } from '@shared/dashboard-components/members-options-menu/members-options-menu.component';
import { UserListItem } from '@shared/dashboard-components/user-list-item/user-list-item.component';
import {
  ProfileViewComponent,
  ProfileUser,
} from '@shared/dashboard-components/profile-view/profile-view.component';
import {
  EditProfileComponent,
  EditProfileUser,
} from '@shared/dashboard-components/edit-profile/edit-profile.component';
import { AddMembersComponent } from '@shared/dashboard-components/add-members/add-members.component';
import {
  ChannelInfoComponent,
  ChannelInfoData,
} from '@shared/dashboard-components/channel-info/channel-info.component';
import {
  UserStore,
  ChannelStore,
  ThreadStore,
  MessageStore,
  ChannelMessageStore,
} from '@stores/index';
import { AuthStore } from '@stores/auth';
import { MessageType, MessageReaction } from '@core/models/message.model';

export interface ChannelMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  timestamp: Date;
  isOwnMessage: boolean;
  reactions?: MessageReaction[];
  threadCount?: number;
  lastThreadTimestamp?: Date;
}

export interface ChannelInfo {
  id: string;
  name: string;
  description: string;
  isPrivate: boolean;
  memberCount: number;
}

@Component({
  selector: 'app-channel-conversation',
  imports: [
    MessageBoxComponent,
    ConversationMessagesComponent,
    MembersMiniatureComponent,
    AddMemberButtonComponent,
    MembersOptionsMenuComponent,
    ProfileViewComponent,
    EditProfileComponent,
    AddMembersComponent,
    ChannelInfoComponent,
  ],
  templateUrl: './channel-conversation.component.html',
  styleUrl: './channel-conversation.component.scss',
})
export class ChannelConversationComponent {
  protected userStore = inject(UserStore);
  protected channelStore = inject(ChannelStore);
  protected threadStore = inject(ThreadStore);
  protected messageStore = inject(MessageStore);
  protected channelMessageStore = inject(ChannelMessageStore);
  protected authStore = inject(AuthStore);
  threadRequested = output<{ messageId: string; parentMessage: Message }>();
  channelLeft = output<void>();
  directMessageRequested = output<string>(); // Emits userId to start DM with

  /**
   * Channel information
   */
  channel = input<ChannelInfo>({
    id: '1',
    name: 'Entwicklung',
    description: 'Development team channel',
    isPrivate: false,
    memberCount: 5,
  });

  protected isMembersMenuOpen = signal<boolean>(false);
  protected isProfileViewOpen = signal<boolean>(false);
  protected isEditProfileOpen = signal<boolean>(false);
  protected isChannelInfoOpen = signal<boolean>(false);
  protected selectedMemberId = signal<string | null>(null);
  protected isAddMembersOpen = signal<boolean>(false);

  /**
   * Effect: Load messages when channel changes
   */
  constructor() {
    effect(() => {
      const channelId = this.channel().id;
      if (channelId) {
        this.channelMessageStore.loadChannelMessages(channelId);
      }
    });
  }

  /**
   * Current channel data from store (reactive to Firestore changes)
   */
  protected currentChannelData = computed(() => {
    const ch = this.channel();
    return this.channelStore.getChannelById()(ch.id);
  });

  /**
   * Check if current user is admin
   * TODO: Implement admin role in User model
   */
  protected isCurrentUserAdmin = computed(() => {
    // User model doesn't have isAdmin field yet
    return false;
  });

  /**
   * Check if current user is the channel owner
   */
  protected isCurrentUserChannelOwner = computed(() => {
    const channelData = this.currentChannelData();
    const currentUserId = this.authStore.user()?.uid;
    return channelData?.createdBy === currentUserId;
  });

  /**
   * Check if selected user is the channel owner
   */
  protected isSelectedUserChannelOwner = computed(() => {
    const channelData = this.currentChannelData();
    const selectedUserId = this.selectedMemberId();
    return channelData?.createdBy === selectedUserId;
  });

  /**
   * Check if viewing own profile
   */
  protected isOwnProfile = computed(() => {
    return this.selectedMemberId() === this.authStore.user()?.uid;
  });

  /**
   * Selected member for edit profile
   */
  protected editProfileUser = computed<EditProfileUser | null>(() => {
    const memberId = this.selectedMemberId();
    if (!memberId) return null;

    const user = this.userStore.getUserById()(memberId);
    if (!user) return null;

    return {
      id: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL || '/img/profile/profile-0.svg',
      isAdmin: false, // TODO: Implement admin flag
    };
  });

  /**
   * Channel info data for channel-info component
   */
  protected channelInfo = computed<ChannelInfoData>(() => {
    const ch = this.channel();
    const channelData = this.channelStore.getChannelById()(ch.id);

    if (!channelData) {
      return {
        id: ch.id,
        name: ch.name,
        description: ch.description,
        isPrivate: false,
        createdBy: '',
        createdByName: 'Unknown',
        admins: [],
      };
    }

    // Get creator user data
    const creator = this.userStore.getUserById()(channelData.createdBy);

    // Get admin user data
    const admins = channelData.admins.map((adminUid) => {
      const adminUser = this.userStore.getUserById()(adminUid);
      return {
        uid: adminUid,
        name: adminUser?.displayName || 'Unknown User',
      };
    });

    return {
      id: channelData.id,
      name: channelData.name,
      description: channelData.description,
      isPrivate: channelData.isPrivate,
      createdBy: channelData.createdBy,
      createdByName: creator?.displayName || 'Unknown User',
      admins,
    };
  });

  /**
   * Channel members from channel's memberIds
   */
  protected members = computed<UserListItem[]>(() => {
    const channelData = this.channelStore.getChannelById()(this.channel().id);
    if (!channelData || !channelData.members) return [];

    return channelData.members
      .map((memberId) => {
        const user = this.userStore.getUserById()(memberId);
        if (!user) return null;
        return {
          id: user.uid,
          name: user.displayName,
          avatar: user.photoURL || '/img/profile/profile-0.svg',
        };
      })
      .filter((user): user is UserListItem => user !== null);
  });

  /**
   * Available users that are NOT yet members of this channel
   */
  protected availableUsers = computed<UserListItem[]>(() => {
    const channelData = this.channelStore.getChannelById()(this.channel().id);
    const currentMemberIds = channelData?.members || [];

    return this.userStore
      .users()
      .filter((user) => !currentMemberIds.includes(user.uid))
      .map((user) => ({
        id: user.uid,
        name: user.displayName,
        avatar: user.photoURL || '/img/profile/profile-0.svg',
      }));
  });

  /**
   * Total member count
   */
  protected totalMemberCount = computed(() => this.members().length);

  /**
   * Get selected member as ProfileUser
   */
  protected selectedMember = computed<ProfileUser | null>(() => {
    const memberId = this.selectedMemberId();
    if (!memberId) return null;

    const user = this.userStore.getUserById()(memberId);
    if (!user) return null;

    return {
      id: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL || '/img/profile/profile-0.svg',
      status: user.isOnline ? 'online' : 'offline',
      isAdmin: false, // TODO: Implement admin flag
    };
  });

  /**
   * Real channel messages from ChannelMessageStore
   */
  protected messages = computed<ChannelMessage[]>(() => {
    const channelId = this.channel().id;
    const rawMessages = this.channelMessageStore.getMessagesByChannel()(channelId);
    const currentUserId = this.authStore.user()?.uid;

    return rawMessages.map((msg) => {
      const author = this.userStore.getUserById()(msg.authorId);

      // Debug: Log lastThreadTimestamp
      if (msg.threadCount && msg.threadCount > 0) {
        console.log('📅 Message with thread:', {
          id: msg.id,
          threadCount: msg.threadCount,
          lastThreadTimestamp: msg.lastThreadTimestamp,
          type: typeof msg.lastThreadTimestamp,
        });
      }

      return {
        id: msg.id,
        senderId: msg.authorId,
        senderName: author?.displayName || 'Unknown User',
        senderAvatar: author?.photoURL || '/img/profile/profile-0.svg',
        content: msg.content,
        timestamp: msg.createdAt instanceof Date ? msg.createdAt : new Date(msg.createdAt),
        isOwnMessage: msg.authorId === currentUserId,
        reactions: msg.reactions,
        threadCount: msg.threadCount,
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
   * Send message to channel
   */
  async sendMessage(content: string): Promise<void> {
    if (!content.trim()) return;

    const currentUser = this.authStore.user();
    if (!currentUser) return;

    const channelId = this.channel().id;

    await this.channelMessageStore.sendMessage(channelId, content.trim(), currentUser.uid);
  }

  /**
   * Group messages by date
   */
  protected messagesGroupedByDate = computed<MessageGroup[]>(() => {
    const msgs = this.messages();
    const groups = new Map<string, Message[]>();

    msgs.forEach((msg) => {
      const dateKey = this.getDateKey(msg.timestamp);
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }

      groups.get(dateKey)!.push({
        id: msg.id,
        senderId: msg.senderId,
        senderName: msg.senderName,
        senderAvatar: msg.senderAvatar,
        content: msg.content,
        timestamp: msg.timestamp,
        isOwnMessage: msg.isOwnMessage,
        reactions: msg.reactions,
        threadCount: msg.threadCount && msg.threadCount > 0 ? msg.threadCount : undefined,
        lastThreadTimestamp: msg.lastThreadTimestamp,
      });
    });

    return Array.from(groups.entries()).map(([dateKey, messages]) => ({
      date: messages[0].timestamp,
      label: this.getDateLabel(messages[0].timestamp),
      messages,
    }));
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
   * Add reaction to message
   */
  async addReaction(messageId: string, emojiId: string): Promise<void> {
    const currentUserId = this.authStore.user()?.uid;
    const channelId = this.channel().id;
    if (!currentUserId || !channelId) return;

    try {
      await this.channelMessageStore.toggleReaction(channelId, messageId, emojiId, currentUserId);
      console.log('✅ Reaction toggled:', messageId, emojiId);
    } catch (error) {
      console.error('❌ Failed to add reaction:', error);
    }
  }

  /**
   * Handle add member click
   */
  onAddMember(): void {
    console.log('Add member clicked');
    this.isMembersMenuOpen.set(false);
    this.isAddMembersOpen.set(true);
  }

  /**
   * Handle add members close
   */
  onAddMembersClose(): void {
    this.isAddMembersOpen.set(false);
  }

  /**
   * Handle members added
   */
  async onMembersAdded(userIds: string[]): Promise<void> {
    const channelId = this.channel().id;
    // TODO: Implement addMemberToChannel in ChannelStore
    // For now, update channel members array
    const channel = this.channelStore.getChannelById()(channelId);
    if (channel) {
      const updatedMembers = [...new Set([...channel.members, ...userIds])];
      await this.channelStore.updateChannel(channelId, { members: updatedMembers });
    }
    this.isAddMembersOpen.set(false);
    console.log('Added members to channel:', userIds);
  }

  /**
   * Handle view members click
   */
  onViewMembers(): void {
    console.log('View members clicked');
    this.isMembersMenuOpen.set(true);
  }

  /**
   * Handle members menu close
   */
  onCloseMembersMenu(): void {
    this.isMembersMenuOpen.set(false);
  }

  /**
   * Handle member selection from menu
   */
  onMemberSelected(memberId: string): void {
    console.log('Member selected:', memberId);
    this.selectedMemberId.set(memberId);
    this.isMembersMenuOpen.set(false);
    this.isProfileViewOpen.set(true);
  }

  /**
   * Handle profile view close
   */
  onProfileViewClose(): void {
    this.isProfileViewOpen.set(false);
    this.selectedMemberId.set(null);
  }

  /**
   * Handle remove member from channel
   */
  async onRemoveMember(): Promise<void> {
    const memberId = this.selectedMemberId();
    if (!memberId) return;

    const channelId = this.channel().id;
    const channel = this.channelStore.getChannelById()(channelId);
    if (channel) {
      const updatedMembers = channel.members.filter((id) => id !== memberId);
      await this.channelStore.updateChannel(channelId, { members: updatedMembers });
    }
    this.isProfileViewOpen.set(false);
    this.selectedMemberId.set(null);
    console.log('Removed member from channel:', memberId);
  }

  /**
   * Handle profile edit
   */
  onProfileEdit(): void {
    this.isProfileViewOpen.set(false);
    this.isEditProfileOpen.set(true);
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
    const userId = this.selectedMemberId();
    if (!userId) return;

    await this.userStore.updateUser(userId, {
      displayName: data.displayName,
      // TODO: isAdmin not in User model yet
    });
    this.isEditProfileOpen.set(false);
  }

  /**
   * Handle message click from profile
   */
  onProfileMessage(): void {
    const memberId = this.selectedMemberId();
    if (!memberId) return;

    this.isProfileViewOpen.set(false);
    console.log('Opening DM with member:', memberId);

    // Emit event to open DM (will be handled by dashboard parent)
    this.directMessageRequested.emit(memberId);
  }

  /**
   * Handle channel title click - opens channel info
   */
  onTitleClick(): void {
    this.isChannelInfoOpen.set(true);
  }

  /**
   * Handle channel info close
   */
  onChannelInfoClose(): void {
    this.isChannelInfoOpen.set(false);
  }

  /**
   * Handle channel info updated
   */
  async onChannelUpdated(data: {
    name?: string;
    description?: string;
    isPrivate?: boolean;
  }): Promise<void> {
    const channelId = this.channel().id;

    const updates: { name?: string; description?: string; isPrivate?: boolean } = {};
    if (data.name) {
      updates.name = data.name;
    }
    if (data.description !== undefined) {
      updates.description = data.description;
    }
    if (data.isPrivate !== undefined) {
      updates.isPrivate = data.isPrivate;
    }

    if (Object.keys(updates).length > 0) {
      await this.channelStore.updateChannel(channelId, updates);
    }
  }

  /**
   * Handle leave channel clicked
   */
  async onLeaveChannel(): Promise<void> {
    const currentUserId = this.authStore.user()?.uid;
    const channelData = this.channel();

    if (!currentUserId || !channelData) return;

    const channelId = channelData.id;
    const channel = this.channelStore.getChannelById()(channelId);

    if (!channel) return;

    // Fallback check (UI button is already disabled for owners, Store also validates)
    if (channel.createdBy === currentUserId) {
      console.error('Channel owner cannot leave the channel');
      return;
    }

    try {
      await this.channelStore.leaveChannel(channelId, currentUserId);
      // Channel will be removed from sidebar automatically via real-time listener
      // Navigate back to DABubble-welcome
      this.channelLeft.emit();
    } catch (error) {
      console.error('Failed to leave channel:', error);
      // TODO: Show error message to user
    }
  }

  /**
   * Handle delete channel clicked
   */
  async onDeleteChannel(): Promise<void> {
    const currentUserId = this.authStore.user()?.uid;
    const channelData = this.channel();

    if (!currentUserId || !channelData) return;

    const channelId = channelData.id;
    const channel = this.channelStore.getChannelById()(channelId);

    if (!channel) return;

    // Only owner can delete channel
    if (channel.createdBy !== currentUserId) {
      console.error('Only channel owner can delete the channel');
      return;
    }

    // TODO: Show confirmation dialog
    const confirmed = confirm(
      `Are you sure you want to delete the channel "${channel.name}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await this.channelStore.deleteChannel(channelId);
      // Channel will be removed from sidebar automatically via real-time listener
      // Navigate back to DABubble-welcome
      this.channelLeft.emit();
    } catch (error) {
      console.error('Failed to delete channel:', error);
      // TODO: Show error message to user
    }
  }

  /**
   * Handle created by user clicked
   */
  onCreatedByClick(userId: string): void {
    this.selectedMemberId.set(userId);
    this.isChannelInfoOpen.set(false);
    this.isProfileViewOpen.set(true);
  }

  /**
   * Handle message click
   */
  onMessageClick(messageId: string): void {
    console.log('Message clicked:', messageId);
    // TODO: Implement message actions (edit, delete, reply)
  }

  /**
   * Handle avatar click
   */
  onAvatarClick(senderId: string): void {
    this.selectedMemberId.set(senderId);
    this.isProfileViewOpen.set(true);
  }

  /**
   * Handle sender name click
   */
  onSenderClick(senderId: string): void {
    this.selectedMemberId.set(senderId);
    this.isProfileViewOpen.set(true);
  }

  /**
   * Handle reaction added
   */
  onReactionAdded(data: { messageId: string; emoji: string }): void {
    console.log('Reaction added:', data);
    this.addReaction(data.messageId, data.emoji);
  }

  /**
   * Handle message edited
   */
  async onMessageEdited(data: { messageId: string; newContent: string }): Promise<void> {
    const channelId = this.channel().id;
    await this.channelMessageStore.updateMessage(channelId, data.messageId, data.newContent);
  }

  /**
   * Handle thread click
   */
  onThreadClick(messageId: string): void {
    // Find the parent message
    const parentMessage = this.messages().find((m) => m.id === messageId);
    if (parentMessage) {
      // Convert to Message type
      const message: Message = {
        id: parentMessage.id,
        senderId: parentMessage.senderId,
        senderName: parentMessage.senderName,
        senderAvatar: parentMessage.senderAvatar,
        content: parentMessage.content,
        timestamp: parentMessage.timestamp,
        isOwnMessage: parentMessage.isOwnMessage,
        reactions: parentMessage.reactions,
      };
      this.threadRequested.emit({ messageId, parentMessage: message });
    }
  }
}
