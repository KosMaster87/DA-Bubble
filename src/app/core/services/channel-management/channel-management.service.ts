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
   * @param {Object} channelData - Channel name, description, isPrivate
   * @param {string} creatorId - Current user ID (will be the only initial member)
   * @param {Set<string>} inviteUserIds - User IDs to send invitations to
   * @returns {Promise<string>} New channel ID
   */
  createChannelWithInvitations = async (
    channelData: {
      name: string;
      description: string;
      isPrivate: boolean;
    },
    creatorId: string,
    inviteUserIds: Set<string>
  ): Promise<string> => {
    const newChannelId = await this.createChannel(channelData, creatorId);
    await this.sendInvitations(inviteUserIds, creatorId, newChannelId, channelData.name);
    return newChannelId;
  }

  /**
   * Create channel in store
   * @private
   * @param {Object} channelData - Channel data
   * @param {string} creatorId - Creator user ID
   * @returns {Promise<string>} New channel ID
   */
  private createChannel = async (
    channelData: { name: string; description: string; isPrivate: boolean },
    creatorId: string
  ): Promise<string> => {
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
   * @private
   * @param {Set<string>} inviteUserIds - User IDs to invite
   * @param {string} senderId - Sender user ID
   * @param {string} channelId - Channel ID
   * @param {string} channelName - Channel name
   * @returns {Promise<void>}
   */
  private sendInvitations = async (
    inviteUserIds: Set<string>,
    senderId: string,
    channelId: string,
    channelName: string
  ): Promise<void> => {
    if (inviteUserIds.size === 0) return;
    await this.sendInvitationPromises(inviteUserIds, senderId, channelId, channelName);
  }

  /**
   * Send invitation promises
   * @private
   * @param {Set<string>} inviteUserIds - User IDs to invite
   * @param {string} senderId - Sender ID
   * @param {string} channelId - Channel ID
   * @param {string} channelName - Channel name
   * @returns {Promise<void>}
   */
  private sendInvitationPromises = async (
    inviteUserIds: Set<string>,
    senderId: string,
    channelId: string,
    channelName: string
  ): Promise<void> => {
    const invitationPromises = this.buildInvitationPromises(
      inviteUserIds,
      senderId,
      channelId,
      channelName
    );
    await Promise.all(invitationPromises);
  }

  /**
   * Build invitation promises for all users
   * @private
   * @param {Set<string>} inviteUserIds - User IDs to invite
   * @param {string} senderId - Sender ID
   * @param {string} channelId - Channel ID
   * @param {string} channelName - Channel name
   * @returns {Promise<string>[]} Array of promises
   */
  private buildInvitationPromises = (
    inviteUserIds: Set<string>,
    senderId: string,
    channelId: string,
    channelName: string
  ): Promise<string>[] => {
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
   * @param {Object} channelData - Channel name, description, isPrivate
   * @param {CreateChannelWithMembersData} memberData - Selected users and channels for invitations
   * @param {string} currentUserId - Current user ID
   * @returns {Promise<string | null>} New channel ID or null if locked/failed
   */
  createChannelWithMembers = async (
    channelData: {
      name: string;
      description: string;
      isPrivate: boolean;
    },
    memberData: CreateChannelWithMembersData,
    currentUserId: string
  ): Promise<string | null> => {
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
   * @private
   * @returns {boolean} True if lock acquired, false if already locked
   */
  private acquireLock = (): boolean => {
    if (this._isCreating()) {
      return false;
    }
    this._isCreating.set(true);
    return true;
  }

  /**
   * Release creation lock after delay
   * @private
   * @returns {void}
   */
  private releaseLock = (): void => {
    setTimeout(() => {
      this._isCreating.set(false);
    }, 1000);
  }

  /**
   * Collect all user IDs to invite from member data
   * @private
   * @param {CreateChannelWithMembersData} memberData - Selected users and channels
   * @param {string} currentUserId - Current user ID to exclude
   * @returns {Set<string>} Set of user IDs to invite
   */
  private collectUsersToInvite = (
    memberData: CreateChannelWithMembersData,
    currentUserId: string
  ): Set<string> => {
    const usersToInvite = new Set<string>();
    this.addSelectedUsers(memberData.selectedUsers, currentUserId, usersToInvite);
    this.addChannelMembers(memberData.selectedChannels, currentUserId, usersToInvite);
    return usersToInvite;
  }

  /**
   * Add selected users to invite set
   * @private
   * @param {Array<{id: string, name: string, avatar: string}>} selectedUsers - Users selected for invitation
   * @param {string} currentUserId - Current user ID to exclude
   * @param {Set<string>} usersToInvite - Set to add user IDs to
   * @returns {void}
   */
  private addSelectedUsers = (
    selectedUsers: Array<{ id: string; name: string; avatar: string }>,
    currentUserId: string,
    usersToInvite: Set<string>
  ): void => {
    selectedUsers.forEach((user) => {
      if (user.id !== currentUserId) {
        usersToInvite.add(user.id);
      }
    });
  }

  /**
   * Add members from selected channels to invite set
   * @private
   * @param {Array<{id: string, name: string}>} selectedChannels - Channels whose members should be invited
   * @param {string} currentUserId - Current user ID to exclude
   * @param {Set<string>} usersToInvite - Set to add user IDs to
   * @returns {void}
   */
  private addChannelMembers = (
    selectedChannels: Array<{ id: string; name: string }>,
    currentUserId: string,
    usersToInvite: Set<string>
  ): void => {
    selectedChannels.forEach((selectedChannel) => {
      const channel = this.channelStore.channels().find((ch) => ch.id === selectedChannel.id);
      if (channel) {
        this.addMembersFromChannel(channel.members, currentUserId, usersToInvite);
      }
    });
  }

  /**
   * Add members from channel to invite set
   * @private
   * @param {string[]} members - Channel member IDs
   * @param {string} currentUserId - Current user ID to exclude
   * @param {Set<string>} usersToInvite - Set to add user IDs to
   * @returns {void}
   */
  private addMembersFromChannel = (
    members: string[],
    currentUserId: string,
    usersToInvite: Set<string>
  ): void => {
    members.forEach((memberId) => {
      if (memberId !== currentUserId) {
        usersToInvite.add(memberId);
      }
    });
  }

  /**
   * Create channel from pending data in WorkspaceSidebarService
   * Handles channel creation, cleanup, and navigation
   * @param {CreateChannelWithMembersData} memberData - Selected users and channels for invitations
   * @param {string} currentUserId - Current user ID
   * @returns {Promise<string | null>} New channel ID or null if failed
   */
  createChannelFromPending = async (
    memberData: CreateChannelWithMembersData,
    currentUserId: string
  ): Promise<string | null> => {
    const channelData = this.getPendingChannelData();
    const newChannelId = await this.createChannelWithMembers(
      channelData,
      memberData,
      currentUserId
    );
    if (!newChannelId) return null;
    this.finalizeChannelCreation(newChannelId);
    return newChannelId;
  }

  /**
   * Get pending channel data from workspace sidebar service
   * @private
   * @returns {Object} Channel data with name, description, and isPrivate
   */
  private getPendingChannelData = (): {
    name: string;
    description: string;
    isPrivate: boolean;
  } => {
    return {
      name: this.workspaceSidebarService.pendingChannelName(),
      description: this.workspaceSidebarService.pendingChannelDescription(),
      isPrivate: this.workspaceSidebarService.pendingChannelIsPrivate(),
    };
  }

  /**
   * Finalize channel creation with cleanup and navigation
   * @private
   * @param {string} channelId - Channel ID to navigate to
   * @returns {void}
   */
  private finalizeChannelCreation = (channelId: string): void => {
    this.workspaceSidebarService.closeAddMemberAfterChannel();
    this.navigationService.selectChannel(channelId);
  }
}
