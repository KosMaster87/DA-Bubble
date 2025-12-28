/**
 * @fileoverview Channel Conversation Component
 * @description Chat interface for specific channels
 * @module features/dashboard/components/channel-conversation
 */

import { Component, signal, input, inject, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MessageBoxComponent } from '@shared/dashboard-components/message-box/message-box.component';
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
    DatePipe,
    MessageBoxComponent,
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
}
