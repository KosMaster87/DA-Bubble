/**
 * @fileoverview Channal Welcome Component
 * @description Main welcome channel view
 * @module features/dashboard/components/channal-welcome
 */

import { Component, signal, computed, inject } from '@angular/core';
import { MessageBoxComponent } from '@shared/dashboard-components/message-box/message-box.component';
import { DummyUsersService } from '../../services/dummy-users.service';
import { DummyChannelsService } from '../../services/dummy-channels.service';
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
import { AddMembersComponent } from '@shared/dashboard-components/add-members/add-members.component';

@Component({
  selector: 'app-channal-welcome',
  imports: [
    MessageBoxComponent,
    MembersMiniatureComponent,
    AddMemberButtonComponent,
    MembersOptionsMenuComponent,
    ProfileViewComponent,
    AddMembersComponent,
  ],
  templateUrl: './channal-welcome.component.html',
  styleUrl: './channal-welcome.component.scss',
})
export class ChannalWelcomeComponent {
  protected usersService = inject(DummyUsersService);
  protected channelsService = inject(DummyChannelsService);

  protected isMembersMenuOpen = signal<boolean>(false);
  protected isProfileViewOpen = signal<boolean>(false);
  protected selectedMemberId = signal<string | null>(null);
  protected isAddMembersOpen = signal<boolean>(false);
  protected channelName = signal<string>('DABubble-welcome');

  /**
   * Channel members from DummyUsersService
   */
  protected members = computed<UserListItem[]>(() =>
    this.usersService.users().map((user) => ({
      id: user.id,
      name: user.name,
      avatar: user.avatar,
    }))
  );

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
   * Handle add member submit
   */
  onAddMemberSubmit(name: string): void {
    console.log('Add member:', name);
    this.isAddMembersOpen.set(false);
    // TODO: Implement add member logic
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
   * Handle profile edit
   */
  onProfileEdit(): void {
    this.isProfileViewOpen.set(false);
    console.log('Edit profile for member:', this.selectedMemberId());
    // TODO: Open edit profile for selected member
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
