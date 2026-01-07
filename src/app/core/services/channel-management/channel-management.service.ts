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
    // Create channel with only creator as member
    const newChannelId = await this.channelStore.createChannel(
      {
        name: channelData.name,
        description: channelData.description,
        isPrivate: channelData.isPrivate,
        members: [creatorId],
      },
      creatorId
    );

    // Send invitations to all selected users
    if (inviteUserIds.size > 0) {
      console.log(
        `📨 Sending invitations to ${inviteUserIds.size} users for channel:`,
        channelData.name
      );

      const invitationPromises = Array.from(inviteUserIds).map((userId) =>
        this.invitationService.createInvitation({
          type: 'channel',
          senderId: creatorId,
          recipientId: userId,
          channelId: newChannelId,
          channelName: channelData.name,
        })
      );

      try {
        await Promise.all(invitationPromises);
        console.log(`✅ Sent ${inviteUserIds.size} invitations successfully`);
      } catch (error) {
        console.error('❌ Error sending invitations:', error);
      }
    }

    return newChannelId;
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
    // Check lock
    if (this._isCreating()) {
      console.log('⏸️  Channel creation already in progress');
      return null;
    }

    this._isCreating.set(true);

    try {
      // Collect all user IDs to invite (excluding current user)
      const usersToInvite = new Set<string>();

      // Users from "selectedUsers"
      memberData.selectedUsers.forEach((user) => {
        if (user.id !== currentUserId) {
          usersToInvite.add(user.id);
        }
      });

      // Members from selected channels
      memberData.selectedChannels.forEach((selectedChannel) => {
        const channel = this.channelStore.channels().find((ch) => ch.id === selectedChannel.id);
        if (channel) {
          channel.members.forEach((memberId) => {
            if (memberId !== currentUserId) {
              usersToInvite.add(memberId);
            }
          });
        }
      });

      // Create channel with invitations
      const newChannelId = await this.createChannelWithInvitations(
        channelData,
        currentUserId,
        usersToInvite
      );

      return newChannelId;
    } finally {
      // Re-enable after a short delay
      setTimeout(() => {
        this._isCreating.set(false);
      }, 1000);
    }
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
    // Get pending channel data from WorkspaceSidebarService
    const channelData = {
      name: this.workspaceSidebarService.pendingChannelName(),
      description: this.workspaceSidebarService.pendingChannelDescription(),
      isPrivate: this.workspaceSidebarService.pendingChannelIsPrivate(),
    };

    // Create channel with members (includes lock)
    const newChannelId = await this.createChannelWithMembers(
      channelData,
      memberData,
      currentUserId
    );

    if (!newChannelId) return null;

    // Clean up pending data and close popup
    this.workspaceSidebarService.closeAddMemberAfterChannel();

    // Auto-select the newly created channel
    this.navigationService.selectChannelById(newChannelId);

    return newChannelId;
  }
}
