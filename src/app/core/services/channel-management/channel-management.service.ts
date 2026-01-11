/**
 * @fileoverview Channel Management Service
 * @description Handles channel creation, updates, and invitation management
 * @module core/services/channel-management
 */

import { Injectable, inject, signal } from '@angular/core';
import { ChannelStore } from '@stores/channel.store';
import { InvitationService } from '@core/services/invitation/invitation.service';
import { NavigationService } from '@core/services/navigation/navigation.service';
import { WorkspaceSidebarService } from '@shared/services/workspace-sidebar.service';

/**
 * Data for creating channel with member selection
 */
export interface CreateChannelWithMembersData {
  type: 'all' | 'specific';
  searchValue?: string;
  selectedChannels: Array<{ id: string; name: string }>;
  selectedUsers: Array<{ id: string; name: string; avatar: string }>;
}

@Injectable({
  providedIn: 'root',
})
export class ChannelManagementService {
  private channelStore = inject(ChannelStore);
  private invitationService = inject(InvitationService);
  private navigationService = inject(NavigationService);
  private workspaceSidebarService = inject(WorkspaceSidebarService);

  /**
   * Lock to prevent multiple simultaneous channel creations
   */
  private _isCreating = signal(false);
  readonly isCreating = this._isCreating.asReadonly();

  /**
   * Create a new channel and send invitations to selected users
   * @param channelData Channel name, description, isPrivate
   * @param creatorId Current user ID (will be the only initial member)
   * @param inviteUserIds User IDs to send invitations to
   * @returns New channel ID
   */
  async createChannelWithInvitations(
    channelData: {
      name: string;
      description: string;
      isPrivate: boolean;
    },
    creatorId: string,
    inviteUserIds: Set<string>
  ): Promise<string> {
    const newChannelId = await this.createChannel(channelData, creatorId);
    await this.sendInvitations(inviteUserIds, creatorId, newChannelId, channelData.name);
    return newChannelId;
  }

  /**
   * Create channel in store
   * @param channelData Channel data
   * @param creatorId Creator user ID
   * @returns New channel ID
   */
  private async createChannel(
    channelData: { name: string; description: string; isPrivate: boolean },
    creatorId: string
  ): Promise<string> {
    return await this.channelStore.createChannel(
      {
        name: channelData.name,
        description: channelData.description,
        isPrivate: channelData.isPrivate,
        members: [creatorId],
      },
      creatorId
    );
  }

  /**
   * Send invitations to users
   * @param inviteUserIds User IDs to invite
   * @param senderId Sender user ID
   * @param channelId Channel ID
   * @param channelName Channel name
   */
  private async sendInvitations(
    inviteUserIds: Set<string>,
    senderId: string,
    channelId: string,
    channelName: string
  ): Promise<void> {
    if (inviteUserIds.size === 0) return;

    this.logInvitationStart(inviteUserIds.size, channelName);
    await this.sendInvitationPromises(inviteUserIds, senderId, channelId, channelName);
  }

  /**
   * Log invitation sending start
   * @param count Number of invitations
   * @param channelName Channel name
   */
  private logInvitationStart(count: number, channelName: string): void {
    console.log(`📨 Sending invitations to ${count} users for channel:`, channelName);
  }

  /**
   * Send invitation promises
   * @param inviteUserIds User IDs to invite
   * @param senderId Sender ID
   * @param channelId Channel ID
   * @param channelName Channel name
   */
  private async sendInvitationPromises(
    inviteUserIds: Set<string>,
    senderId: string,
    channelId: string,
    channelName: string
  ): Promise<void> {
    const invitationPromises = this.buildInvitationPromises(
      inviteUserIds,
      senderId,
      channelId,
      channelName
    );

    try {
      await Promise.all(invitationPromises);
      console.log(`✅ Sent ${inviteUserIds.size} invitations successfully`);
    } catch (error) {
      console.error('❌ Error sending invitations:', error);
    }
  }

  /**
   * Build invitation promises for all users
   * @param inviteUserIds User IDs to invite
   * @param senderId Sender ID
   * @param channelId Channel ID
   * @param channelName Channel name
   * @returns Array of promises
   */
  private buildInvitationPromises(
    inviteUserIds: Set<string>,
    senderId: string,
    channelId: string,
    channelName: string
  ): Promise<string>[] {
    return Array.from(inviteUserIds).map((userId) =>
      this.invitationService.createInvitation({
        type: 'channel',
        senderId: senderId,
        recipientId: userId,
        channelId: channelId,
        channelName: channelName,
      })
    );
  }

  /**
   * Create channel with member selection and invitations
   * Includes lock mechanism to prevent duplicate creations
   * @param channelData Channel name, description, isPrivate
   * @param memberData Selected users and channels for invitations
   * @param currentUserId Current user ID
   * @returns New channel ID or null if locked/failed
   */
  async createChannelWithMembers(
    channelData: {
      name: string;
      description: string;
      isPrivate: boolean;
    },
    memberData: CreateChannelWithMembersData,
    currentUserId: string
  ): Promise<string | null> {
    if (!this.acquireLock()) return null;

    try {
      const usersToInvite = this.collectUsersToInvite(memberData, currentUserId);
      return await this.createChannelWithInvitations(channelData, currentUserId, usersToInvite);
    } finally {
      this.releaseLock();
    }
  }

  /**
   * Acquire creation lock
   * @returns True if lock acquired, false if already locked
   */
  private acquireLock(): boolean {
    if (this._isCreating()) {
      console.log('⏸️  Channel creation already in progress');
      return false;
    }
    this._isCreating.set(true);
    return true;
  }

  /**
   * Release creation lock after delay
   */
  private releaseLock(): void {
    setTimeout(() => {
      this._isCreating.set(false);
    }, 1000);
  }

  /**
   * Collect all user IDs to invite from member data
   * @param memberData Selected users and channels
   * @param currentUserId Current user ID to exclude
   * @returns Set of user IDs to invite
   */
  private collectUsersToInvite(
    memberData: CreateChannelWithMembersData,
    currentUserId: string
  ): Set<string> {
    const usersToInvite = new Set<string>();

    this.addSelectedUsers(memberData.selectedUsers, currentUserId, usersToInvite);
    this.addChannelMembers(memberData.selectedChannels, currentUserId, usersToInvite);

    return usersToInvite;
  }

  /**
   * Add selected users to invite set
   * @param selectedUsers Users selected for invitation
   * @param currentUserId Current user ID to exclude
   * @param usersToInvite Set to add user IDs to
   */
  private addSelectedUsers(
    selectedUsers: Array<{ id: string; name: string; avatar: string }>,
    currentUserId: string,
    usersToInvite: Set<string>
  ): void {
    selectedUsers.forEach((user) => {
      if (user.id !== currentUserId) {
        usersToInvite.add(user.id);
      }
    });
  }

  /**
   * Add members from selected channels to invite set
   * @param selectedChannels Channels whose members should be invited
   * @param currentUserId Current user ID to exclude
   * @param usersToInvite Set to add user IDs to
   */
  private addChannelMembers(
    selectedChannels: Array<{ id: string; name: string }>,
    currentUserId: string,
    usersToInvite: Set<string>
  ): void {
    selectedChannels.forEach((selectedChannel) => {
      const channel = this.channelStore.channels().find((ch) => ch.id === selectedChannel.id);
      if (channel) {
        channel.members.forEach((memberId) => {
          if (memberId !== currentUserId) {
            usersToInvite.add(memberId);
          }
        });
      }
    });
  }

  /**
   * Create channel from pending data in WorkspaceSidebarService
   * Handles channel creation, cleanup, and navigation
   * @param memberData Selected users and channels for invitations
   * @param currentUserId Current user ID
   * @returns New channel ID or null if failed
   */
  async createChannelFromPending(
    memberData: CreateChannelWithMembersData,
    currentUserId: string
  ): Promise<string | null> {
    const channelData = {
      name: this.workspaceSidebarService.pendingChannelName(),
      description: this.workspaceSidebarService.pendingChannelDescription(),
      isPrivate: this.workspaceSidebarService.pendingChannelIsPrivate(),
    };

    const newChannelId = await this.createChannelWithMembers(
      channelData,
      memberData,
      currentUserId
    );

    if (!newChannelId) return null;

    this.workspaceSidebarService.closeAddMemberAfterChannel();
    this.navigationService.selectChannel(newChannelId);

    return newChannelId;
  }
}
