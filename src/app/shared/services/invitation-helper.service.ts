/**
 * @fileoverview Invitation Helper Service
 * @description Helper functions for sending invitations in channels and DMs
 * @module shared/services/invitation-helper
 */

import { inject } from '@angular/core';
import { InvitationService } from '@core/services/invitation/invitation.service';
import { ChannelStore } from '@stores/channels/channel.store';
import { UserStore } from '@stores/users/user.store';

/**
 * Helper class for invitation workflows
 */
export class InvitationHelper {
  static invitationService = inject(InvitationService);
  static channelStore = inject(ChannelStore);
  static userStore = inject(UserStore);

  /**
   * Invite a user to a channel
   */
  static async inviteToChannel(
    channelId: string,
    senderId: string,
    recipientId: string,
    message?: string
  ): Promise<boolean> {
    try {
      // Get channel info
      const channel = this.channelStore.getChannelById()(channelId);
      if (!channel) {
        return false;
      }

      // Check if user is already a member
      // TODO: Check channel members

      // Check if there's already a pending invitation
      const hasPending = await this.invitationService.hasPendingChannelInvitation(
        recipientId,
        channelId
      );
      if (hasPending) {
        return false;
      }

      // Create invitation
      await this.invitationService.createInvitation({
        type: 'channel',
        senderId,
        recipientId,
        channelId,
        channelName: channel.name,
        message,
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Invite a user to a direct message
   */
  static async inviteToDM(
    senderId: string,
    recipientId: string,
    message?: string
  ): Promise<boolean> {
    try {
      // Create invitation
      await this.invitationService.createInvitation({
        type: 'direct-message',
        senderId,
        recipientId,
        message,
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get invitation count for current user
   */
  static async getPendingCount(userId: string): Promise<number> {
    try {
      const invitations = await this.invitationService.getPendingInvitations(userId);
      return invitations.length;
    } catch (error) {
      return 0;
    }
  }
}
