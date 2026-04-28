/**
 * @fileoverview Channal Welcome Component
 * @description Main welcome channel view
 * @module features/dashboard/components/channal-welcome
 */

import { Component, computed, inject, output, signal } from '@angular/core';
import {
  MembersMiniatureComponent
} from '@shared/dashboard-components/members-miniatures/members-miniatures.component';
import { MembersOptionsMenuComponent } from '@shared/dashboard-components/members-options-menu/members-options-menu.component';
import {
  EditProfileUser,
  ProfileEditComponent,
} from '@shared/dashboard-components/profile-edit/profile-edit.component';
import {
  ProfileUser,
  ProfileViewComponent,
} from '@shared/dashboard-components/profile-view/profile-view.component';
import { UserListItem } from '@shared/dashboard-components/user-list-item/user-list-item.component';
import { AuthStore } from '@stores/auth';
import { ChannelStore, UserStore } from '@stores/index';

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
  backRequested = output<void>(); // For mobile back navigation

  protected isMembersMenuOpen = signal<boolean>(false);
  protected isProfileViewOpen = signal<boolean>(false);
  protected isEditProfileOpen = signal<boolean>(false);
  protected selectedMemberId = signal<string | null>(null);

  /**
   * Check if current user is admin
    * @description Keeps an explicit capability signal in place so admin-only UI can be introduced without refactoring template contracts.
   * TODO: Implement admin role in User model
   */
  protected isCurrentUserAdmin = computed(() => {
    return false;
  });

  /**
   * Check if viewing own profile
    * @description Differentiates self-profile vs member-profile flows so edit permissions and actions render correctly.
   */
  protected isOwnProfile = computed(() => {
    return this.selectedMemberId() === this.authStore.user()?.uid;
  });

  /**
   * Selected member for edit profile
    * @description Builds the edit-modal payload from canonical user data so profile forms stay decoupled from store entity shape.
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
    * @description Resolves welcome-channel title from store data to avoid duplicating channel labels in template literals.
   */
  protected channelName = computed(() => {
    const channel = this.channelStore.channels().find((ch) => ch.name === 'DABubble-welcome');
    return channel?.name || 'DABubble-welcome';
  });

  /**
   * Channel description from ChannelStore
    * @description Uses channel metadata as source of truth so welcome copy stays synchronized with channel configuration.
   */
  protected channelDescription = computed(() => {
    const channel = this.channelStore.channels().find((ch) => ch.name === 'DABubble-welcome');
    return channel?.description || 'Welcome to DABubble! General announcements and introductions.';
  });

  /**
   * Channel members from channel's members array
    * @description Transforms member IDs into render-ready user rows and safely drops unresolved users to protect menu integrity.
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
          // console.log('⚠️ User not found in UserStore:', {
          //   memberId,
          //   totalUsersInStore: this.userStore.users().length,
          // });
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
    * @description Provides a derived count signal so header stats react to membership changes without extra computations in markup.
   */
  protected totalMemberCount = computed(() => this.members().length);

  /**
   * Count of active public channels
    * @description Exposes a lightweight workspace health metric for onboarding context in the welcome surface.
   */
  protected publicChannelCount = computed(() => {
    return this.channelStore.channels().filter((ch) => !ch.isPrivate).length;
  });

  /**
   * Channel owner (first member who created the channel)
    * @description Extracts owner presentation data once so owner-card rendering stays independent from raw channel/member shape.
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
    * @description Adapts selected member data to profile-view contract so profile modal remains reusable across dashboard contexts.
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
    * @description Opens the member menu from welcome context while keeping menu-state ownership in this component.
   */
  protected onViewMembers = (): void => {
    console.log('View members clicked');
    this.isMembersMenuOpen.set(true);
  };

  /**
   * Handle channel owner profile view click
    * @description Provides a shortcut from owner card to profile modal to reduce interaction steps for common welcome-view actions.
   */
  protected onViewOwnerProfile = (): void => {
    const channel = this.channelStore.channels().find((ch) => ch.name === 'DABubble-welcome');
    if (!channel || !channel.members || channel.members.length === 0) return;

    const ownerId = channel.members[0];
    this.selectedMemberId.set(ownerId);
    this.isProfileViewOpen.set(true);
    this.isMembersMenuOpen.set(false);
  };

  /**
   * Handle members menu close
    * @description Centralizes menu dismissal so every close trigger yields identical member-menu state.
   */
  protected onCloseMembersMenu = (): void => {
    this.isMembersMenuOpen.set(false);
  };

  /**
   * Handle member selection from menu
    * @description Transfers member selection into profile context while atomically closing the menu to avoid overlapping overlays.
   */
  protected onMemberSelected = (memberId: string): void => {
    console.log('Member selected:', memberId);
    this.selectedMemberId.set(memberId);
    this.isMembersMenuOpen.set(false);
    this.isProfileViewOpen.set(true);
  };

  /**
   * Handle profile view close
    * @description Resets profile visibility and selected member together so stale selections cannot leak between profile sessions.
   */
  protected onProfileViewClose = (): void => {
    this.isProfileViewOpen.set(false);
    this.selectedMemberId.set(null);
  };

  /**
   * Handle remove member from channel
   * @description Consolidates teardown cleanup in one method so subscriptions and transient UI state are reliably cleared.
   */
  protected onRemoveMember = async (): Promise<void> => {
    const memberId = this.selectedMemberId();
    if (!memberId) return;

    const channel = this.channelStore.channels().find((ch) => ch.name === 'DABubble-welcome');
    if (!channel) return;

    const updatedMembers = channel.members.filter((id) => id !== memberId);
    await this.channelStore.updateChannel(channel.id, { members: updatedMembers });

    this.isProfileViewOpen.set(false);
    this.selectedMemberId.set(null);
    console.log('Removed member from channel:', memberId);
  };

  /**
   * Handle profile edit
    * @description Switches from view to edit mode through one transition path so profile modal flow remains predictable.
   */
  protected onProfileEdit = (): void => {
    this.isProfileViewOpen.set(false);
    this.isEditProfileOpen.set(true);
  };

  /**
   * Handle edit profile close
    * @description Isolates edit teardown to guarantee consistent close behavior for cancel and completion paths.
   */
  protected onEditProfileClose = (): void => {
    this.isEditProfileOpen.set(false);
  };

  /**
   * Handle edit profile save
    * @description Persists edited profile data via a single handler to keep success/error handling and modal closure aligned.
   */
  protected onEditProfileSave = async (data: {
    displayName: string;
    isAdmin: boolean;
  }): Promise<void> => {
    const userId = this.selectedMemberId();
    if (!userId) return;

    try {
      await this.updateUserProfile(userId, data);
      console.log('✅ User profile updated:', data);
      this.isEditProfileOpen.set(false);
    } catch (error) {
      console.error('❌ Failed to update user profile:', error);
    }
  };

  /**
   * Update user profile based on whether it's own profile or other user
    * @description Encapsulates self vs other-user update rules so permission-aware profile writes stay centralized.
   */
  private updateUserProfile = async (
    userId: string,
    data: { displayName: string; isAdmin: boolean }
  ): Promise<void> => {
    const currentUserId = this.authStore.user()?.uid;
    if (userId === currentUserId) {
      await this.authStore.updateUserProfile({ displayName: data.displayName });
    } else {
      await this.userStore.updateUserData(userId, { displayName: data.displayName });
    }
  };

  /**
   * Handle message click from profile
    * @description Bridges profile context to DM navigation intent so welcome interactions can start conversations without routing logic here.
   */
  protected onProfileMessage = (): void => {
    const memberId = this.selectedMemberId();
    if (!memberId) return;

    this.isProfileViewOpen.set(false);
    console.log('Opening DM with member:', memberId);

    // Emit event to start DM conversation
    this.directMessageRequested.emit(memberId);
  };
}
