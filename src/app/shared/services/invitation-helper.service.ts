/**
 * @fileoverview Invitation Helper Service
 * @description Helper functions for sending invitations in channels and DMs
 * @module shared/services/invitation-helper
 */

import { inject, Injectable } from '@angular/core';
import { InvitationService } from '@core/services/invitation/invitation.service';
import { ChannelStore } from '@stores/channels/channel.store';

/**
 * Helper class for invitation workflows
 * @description Provides static invitation helpers for channel and DM flows with lightweight guard checks.
 */
@Injectable({
  providedIn: 'root',
})
export class InvitationHelper {
  private invitationService = inject(InvitationService);
  private channelStore = inject(ChannelStore);

  /**
   * Invite a user to a channel
   * @description Validates channel context and pending state before creating a new channel invitation.
   */
  async inviteToChannel(
    channelId: string,
    senderId: string,
    recipientId: string,
    message?: string,
  ): Promise<boolean> {
    try {
      // Get channel info
      const channel = this.channelStore.getChannelById()(channelId);
      if (!channel) {
        return false;
      }

      // Check if user is already a member
      if (channel.members?.includes(recipientId)) {
        return false;
      }

      // Check if there's already a pending invitation
      const hasPending = await this.invitationService.hasPendingChannelInvitation(
        recipientId,
        channelId,
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
   * @description Creates a direct-message invitation payload for recipient onboarding into DM conversations.
   */
  async inviteToDM(senderId: string, recipientId: string, message?: string): Promise<boolean> {
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
   * @description Retrieves pending invitations and returns a safe numeric fallback when loading fails.
   */
  async getPendingCount(userId: string): Promise<number> {
    try {
      const invitations = await this.invitationService.getPendingInvitations(userId);
      return invitations.length;
    } catch (error) {
      return 0;
    }
  }
}
