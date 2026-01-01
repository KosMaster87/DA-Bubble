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
  EditProfileComponent,
  EditProfileUser,
} from '@shared/dashboard-components/edit-profile/edit-profile.component';

@Component({
  selector: 'app-channal-welcome',
  imports: [
    MembersMiniatureComponent,
    MembersOptionsMenuComponent,
    ProfileViewComponent,
    EditProfileComponent,
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
    if (!channel || !channel.members) return [];

    return channel.members
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
   * Total member count
   */
  protected totalMemberCount = computed(() => this.members().length);

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

    // Emit event to start DM conversation
    this.directMessageRequested.emit(memberId);
  }
}
