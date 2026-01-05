/**
 * @fileoverview Channal Welcome Component
 * @description Main welcome channel view
 * @module features/dashboard/components/channal-welcome
 */

import { Component, signal, computed, inject, output } from '@angular/core';
import { UserStore, ChannelStore } from '@stores/index';
import { AuthStore } from '@stores/auth';
import {
  MembersMiniatureComponent,
  type MemberMiniature,
} from '@shared/dashboard-components/members-miniatures/members-miniatures.component';
import { MembersOptionsMenuComponent } from '@shared/dashboard-components/members-options-menu/members-options-menu.component';
import { UserListItem } from '@shared/dashboard-components/user-list-item/user-list-item.component';
import {
  ProfileViewComponent,
  ProfileUser,
} from '@shared/dashboard-components/profile-view/profile-view.component';
import {
  ProfileEditComponent,
  EditProfileUser,
} from '@shared/dashboard-components/profile-edit/profile-edit.component';

@Component({
  selector: 'app-channal-welcome',
  imports: [
    MembersMiniatureComponent,
    MembersOptionsMenuComponent,
    ProfileViewComponent,
    ProfileEditComponent,
  ],
  templateUrl: './channal-welcome.component.html',
  styleUrl: './channal-welcome.component.scss',
})
export class ChannalWelcomeComponent {
  protected userStore = inject(UserStore);
  protected channelStore = inject(ChannelStore);
  protected authStore = inject(AuthStore);

  directMessageRequested = output<string>(); // Emits userId to start DM with

  protected isMembersMenuOpen = signal<boolean>(false);
  protected isProfileViewOpen = signal<boolean>(false);
  protected isEditProfileOpen = signal<boolean>(false);
  protected selectedMemberId = signal<string | null>(null);

  /**
   * Check if current user is admin
   * TODO: Implement admin role in User model
   */
  protected isCurrentUserAdmin = computed(() => {
    return false;
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
   * Channel name from ChannelStore
   */
  protected channelName = computed(() => {
    const channel = this.channelStore.channels().find((ch) => ch.name === 'DABubble-welcome');
    return channel?.name || 'DABubble-welcome';
  });

  /**
   * Channel description from ChannelStore
   */
  protected channelDescription = computed(() => {
    const channel = this.channelStore.channels().find((ch) => ch.name === 'DABubble-welcome');
    return channel?.description || 'Welcome to DABubble! General announcements and introductions.';
  });

  /**
   * Channel members from channel's members array
   */
  protected members = computed<UserListItem[]>(() => {
    const channel = this.channelStore.channels().find((ch) => ch.name === 'DABubble-welcome');
    if (!channel || !channel.members) {
      console.log('🔍 DABubble-welcome: No channel or no members', {
        channelFound: !!channel,
        members: channel?.members,
        allChannels: this.channelStore.channels().map((ch) => ch.name),
      });
      return [];
    }

    const membersList = channel.members
      .map((memberId) => {
        const user = this.userStore.getUserById()(memberId);
        if (!user) {
          console.log('⚠️ User not found in UserStore:', {
            memberId,
            totalUsersInStore: this.userStore.users().length,
          });
          return null;
        }
        return {
          id: user.uid,
          name: user.displayName,
          avatar: user.photoURL || '/img/profile/profile-0.svg',
        };
      })
      .filter((user): user is UserListItem => user !== null);

    return membersList;
  });

  /**
   * Total member count
   */
  protected totalMemberCount = computed(() => this.members().length);

  /**
   * Count of active public channels
   */
  protected publicChannelCount = computed(() => {
    return this.channelStore.channels().filter((ch) => !ch.isPrivate).length;
  });

  /**
   * Channel owner (first member who created the channel)
   */
  protected channelOwner = computed<{
    name: string;
    avatar: string;
    isOnline: boolean;
  } | null>(() => {
    const channel = this.channelStore.channels().find((ch) => ch.name === 'DABubble-welcome');
    if (!channel || !channel.members || channel.members.length === 0) return null;

    // First member is the owner (channel creator)
    const ownerId = channel.members[0];
    const owner = this.userStore.getUserById()(ownerId);
    if (!owner) return null;

    return {
      name: owner.displayName,
      avatar: owner.photoURL || '/img/profile/profile-1.png',
      isOnline: owner.isOnline || false,
    };
  });

  /**
   * Get selected member as ProfileUser from UserStore
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
   * Handle view members click
   */
  onViewMembers(): void {
    console.log('View members clicked');
    this.isMembersMenuOpen.set(true);
  }

  /**
   * Handle channel owner profile view click
   */
  onViewOwnerProfile(): void {
    const channel = this.channelStore.channels().find((ch) => ch.name === 'DABubble-welcome');
    if (!channel || !channel.members || channel.members.length === 0) return;

    const ownerId = channel.members[0];
    this.selectedMemberId.set(ownerId);
    this.isProfileViewOpen.set(true);
    this.isMembersMenuOpen.set(false);
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

    const channel = this.channelStore.channels().find((ch) => ch.name === 'DABubble-welcome');
    if (!channel) return;

    const updatedMembers = channel.members.filter((id) => id !== memberId);
    await this.channelStore.updateChannel(channel.id, { members: updatedMembers });

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
      this.isEditProfileOpen.set(false);
    } catch (error) {
      console.error('❌ Failed to update user profile:', error);
    }
  }

  /**
   * Handle message click from profile
   */
  onProfileMessage(): void {
    const memberId = this.selectedMemberId();
    if (!memberId) return;

    this.isProfileViewOpen.set(false);
    console.log('Opening DM with member:', memberId);

    // Emit event to start DM conversation
    this.directMessageRequested.emit(memberId);
  }
}
