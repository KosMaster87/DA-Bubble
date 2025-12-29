/**
 * @fileoverview Channel Conversation Component
 * @description Chat interface for specific channels
 * @module features/dashboard/components/channel-conversation
 */

import { Component, signal, input, inject, computed, output } from '@angular/core';
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
import { DummyUsersService } from '../../services/dummy-users.service';
import { DummyChannelsService } from '../../services/dummy-channels.service';
import { DummyThreadService } from '../../services/dummy-thread.service';
import { CurrentUserService } from '../../services/current-user.service';

export interface ChannelMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  timestamp: Date;
  isOwnMessage: boolean;
  reactions?: { emoji: string; count: number }[];
}

export interface ChannelInfo {
  id: string;
  name: string;
  description: string;
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
  protected usersService = inject(DummyUsersService);
  protected channelsService = inject(DummyChannelsService);
  protected currentUserService = inject(CurrentUserService);
  protected threadService = inject(DummyThreadService);
  threadRequested = output<{ messageId: string; parentMessage: Message }>();

  /**
   * Channel information
   */
  channel = input<ChannelInfo>({
    id: '1',
    name: 'Entwicklung',
    description: 'Development team channel',
    memberCount: 5,
  });

  protected isMembersMenuOpen = signal<boolean>(false);
  protected isProfileViewOpen = signal<boolean>(false);
  protected isEditProfileOpen = signal<boolean>(false);
  protected isChannelInfoOpen = signal<boolean>(false);
  protected selectedMemberId = signal<string | null>(null);
  protected isAddMembersOpen = signal<boolean>(false);

  /**
   * Check if current user is admin
   */
  protected isCurrentUserAdmin = computed(() => {
    const currentUser = this.usersService.getUserById(this.currentUserService.currentUserId());
    return currentUser?.isAdmin || false;
  });

  /**
   * Check if viewing own profile
   */
  protected isOwnProfile = computed(() => {
    return this.selectedMemberId() === this.currentUserService.currentUserId();
  });

  /**
   * Selected member for edit profile
   */
  protected editProfileUser = computed<EditProfileUser | null>(() => {
    const memberId = this.selectedMemberId();
    if (!memberId) return null;

    const user = this.usersService.getUserById(memberId);
    if (!user) return null;

    return {
      id: user.id,
      displayName: user.name,
      email: user.email,
      photoURL: user.avatar,
      isAdmin: user.isAdmin,
    };
  });

  /**
   * Channel info data for channel-info component
   */
  protected channelInfo = computed<ChannelInfoData>(() => {
    const ch = this.channel();
    return {
      id: ch.id,
      name: ch.name,
      description: ch.description,
      createdBy: '1', // TODO: Get from channel data
      createdByName: 'Sofia Müller', // TODO: Get from user service
    };
  });

  /**
   * Channel members from channel's memberIds
   */
  protected members = computed<UserListItem[]>(() => {
    const channelData = this.channelsService.getChannelById(this.channel().id);
    if (!channelData || !channelData.memberIds) return [];

    return channelData.memberIds
      .map((memberId) => {
        const user = this.usersService.getUserById(memberId);
        if (!user) return null;
        return {
          id: user.id,
          name: user.name,
          avatar: user.avatar,
        };
      })
      .filter((user): user is UserListItem => user !== null);
  });

  /**
   * Available users that are NOT yet members of this channel
   */
  protected availableUsers = computed<UserListItem[]>(() => {
    const channelData = this.channelsService.getChannelById(this.channel().id);
    const currentMemberIds = channelData?.memberIds || [];

    return this.usersService
      .users()
      .filter((user) => !currentMemberIds.includes(user.id))
      .map((user) => ({
        id: user.id,
        name: user.name,
        avatar: user.avatar,
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

    const user = this.usersService.getUserById(memberId);
    if (!user) return null;

    return {
      id: user.id,
      displayName: user.name,
      email: user.email,
      photoURL: user.avatar,
      status: user.isOnline ? 'online' : 'offline',
      isAdmin: user.isAdmin,
    };
  });

  /**
   * Dummy channel messages
   */
  protected messages = signal<ChannelMessage[]>([
    {
      id: '1',
      senderId: '1',
      senderName: 'Sofia Müller',
      senderAvatar: '/img/profile/profile-1.png',
      content: 'Welcome to the #Entwicklung channel!',
      timestamp: new Date('2024-12-27T08:00:00'),
      isOwnMessage: false,
      reactions: [
        { emoji: '👍', count: 3 },
        { emoji: '🎉', count: 2 },
      ],
    },
    {
      id: '2',
      senderId: '2',
      senderName: 'You',
      senderAvatar: '/img/profile/profile-2.png',
      content: 'Thanks! Happy to be here.',
      timestamp: new Date('2024-12-27T08:05:00'),
      isOwnMessage: true,
    },
    {
      id: '3',
      senderId: '3',
      senderName: 'Noah Braun',
      senderAvatar: '/img/profile/profile-3.png',
      content: "Let's discuss the new feature requirements for the project.",
      timestamp: new Date('2024-12-27T08:15:00'),
      isOwnMessage: false,
    },
  ]);

  /**
   * Send message to channel
   */
  sendMessage(content: string): void {
    if (!content.trim()) return;

    const newMessage: ChannelMessage = {
      id: Date.now().toString(),
      senderId: '2',
      senderName: 'You',
      senderAvatar: '/img/profile/profile-2.png',
      content: content.trim(),
      timestamp: new Date(),
      isOwnMessage: true,
    };

    this.messages.update((msgs) => [...msgs, newMessage]);
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

      // Add thread info to message
      const threadCount = this.threadService.getThreadCount(msg.id);
      const lastThreadTimestamp = this.threadService.getLastReplyTimestamp(msg.id);

      groups.get(dateKey)!.push({
        id: msg.id,
        senderId: msg.senderId,
        senderName: msg.senderName,
        senderAvatar: msg.senderAvatar,
        content: msg.content,
        timestamp: msg.timestamp,
        isOwnMessage: msg.isOwnMessage,
        reactions: msg.reactions,
        threadCount: threadCount > 0 ? threadCount : undefined,
        lastThreadTimestamp: lastThreadTimestamp || undefined,
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
  addReaction(messageId: string, emoji: string): void {
    console.log('Add reaction:', messageId, emoji);
    // TODO: Implement reaction functionality
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
  onMembersAdded(userIds: string[]): void {
    const channelId = this.channel().id;
    userIds.forEach((userId) => {
      this.channelsService.addMemberToChannel(channelId, userId);
    });
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
  onRemoveMember(): void {
    const memberId = this.selectedMemberId();
    if (!memberId) return;

    const channelId = this.channel().id;
    this.channelsService.removeMemberFromChannel(channelId, memberId);
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
  onEditProfileSave(data: { displayName: string; isAdmin: boolean }): void {
    const userId = this.selectedMemberId();
    if (!userId) return;

    this.usersService.updateUser(userId, {
      name: data.displayName,
      isAdmin: data.isAdmin,
    });
    this.isEditProfileOpen.set(false);
  }

  /**
   * Handle message click from profile
   */
  onProfileMessage(): void {
    this.isProfileViewOpen.set(false);
    console.log('Message member:', this.selectedMemberId());
    // TODO: Open direct message with selected member
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
  onChannelUpdated(data: { name?: string; description?: string }): void {
    const channelId = this.channel().id;

    if (data.name) {
      this.channelsService.updateChannel(channelId, { name: data.name });
    }
    if (data.description !== undefined) {
      this.channelsService.updateChannel(channelId, { description: data.description });
    }
  }

  /**
   * Handle leave channel clicked
   */
  onLeaveChannel(): void {
    console.log('Leave channel clicked');
    // TODO: Implement leave channel logic
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
   * Handle reaction added
   */
  onReactionAdded(data: { messageId: string; emoji: string }): void {
    console.log('Reaction added:', data);
    this.addReaction(data.messageId, data.emoji);
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
