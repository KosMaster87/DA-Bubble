/**
 * @fileoverview Channal Welcome Component
 * @description Main welcome channel view
 * @module features/dashboard/components/channal-welcome
 */

import { Component, signal, computed, inject } from '@angular/core';
import { MessageBoxComponent } from '@shared/dashboard-components/message-box/message-box.component';
import { DummyUsersService } from '../../services/dummy-users.service';
import { DummyChannelsService } from '../../services/dummy-channels.service';
import { CurrentUserService } from '../../services/current-user.service';
import {
  MembersMiniatureComponent,
  type MemberMiniature,
} from '@shared/dashboard-components/members-miniatures/members-miniatures.component';
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

@Component({
  selector: 'app-channal-welcome',
  imports: [
    MessageBoxComponent,
    MembersMiniatureComponent,
    AddMemberButtonComponent,
    MembersOptionsMenuComponent,
    ProfileViewComponent,
    EditProfileComponent,
    AddMembersComponent,
  ],
  templateUrl: './channal-welcome.component.html',
  styleUrl: './channal-welcome.component.scss',
})
export class ChannalWelcomeComponent {
  protected usersService = inject(DummyUsersService);
  protected channelsService = inject(DummyChannelsService);
  protected currentUserService = inject(CurrentUserService);

  protected isMembersMenuOpen = signal<boolean>(false);
  protected isProfileViewOpen = signal<boolean>(false);
  protected isEditProfileOpen = signal<boolean>(false);
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
   * Channel name from service
   */
  protected channelName = computed(() => {
    const channel = this.channelsService.getChannelByName('DABubble-welcome');
    return channel?.name || 'DABubble-welcome';
  });

  /**
   * Channel description from service
   */
  protected channelDescription = computed(() => {
    const channel = this.channelsService.getChannelByName('DABubble-welcome');
    return channel?.description || 'Welcome to DABubble! General announcements and introductions.';
  });

  /**
   * Channel members from channel's memberIds
   */
  protected members = computed<UserListItem[]>(() => {
    const channel = this.channelsService.getChannelByName('DABubble-welcome');
    if (!channel || !channel.memberIds) return [];

    return channel.memberIds
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
    const channel = this.channelsService.getChannelByName('DABubble-welcome');
    const currentMemberIds = channel?.memberIds || [];

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
   * Get selected member as ProfileUser from DummyUsersService
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
   * Handle message sent event
   */
  onMessageSent(message: string): void {
    console.log('Message sent in welcome channel:', message);
    // TODO: Implement message sending logic
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
    const channel = this.channelsService.getChannelByName('DABubble-welcome');
    if (!channel) return;

    userIds.forEach((userId) => {
      this.channelsService.addMemberToChannel(channel.id, userId);
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

    const channel = this.channelsService.getChannelByName('DABubble-welcome');
    if (!channel) return;

    this.channelsService.removeMemberFromChannel(channel.id, memberId);
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
}
