/**
 * @fileoverview Invitation Management Service
 * @description Handles invitation acceptance logic with channel membership
 * @module core/services/invitation-management
 */

import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ChannelStore } from '@stores/channel.store';
import { InvitationService } from '@core/services/invitation/invitation.service';
import { Invitation } from '@core/models/invitation.model';

/**
 * Service for managing invitation acceptance workflow
 */
@Injectable({
  providedIn: 'root',
})
export class InvitationManagementService {
  private channelStore = inject(ChannelStore);
  private invitationService = inject(InvitationService);
  private router = inject(Router);

  /**
   * Accept invitation and handle channel/DM logic
   * @param invitation Invitation to accept
   * @param currentUserId Current user's ID
   */
  acceptInvitation = async (invitation: Invitation, currentUserId: string): Promise<void> => {
    if (!currentUserId) {
      console.error('❌ No current user');
      return;
    }

    try {
      await this.invitationService.acceptInvitation(invitation.id);
      console.log('✅ Invitation accepted:', invitation.id);

      if (invitation.type === 'channel') {
        await this.handleChannelInvitation(invitation, currentUserId);
      } else if (invitation.type === 'direct-message') {
        await this.handleDirectMessageInvitation(invitation);
      }
    } catch (error: any) {
      this.handleInvitationError(error, invitation.id);
    }
  };

  /**
   * Handle channel invitation acceptance
   * Navigate to channel without adding as member - user must accept rules first
   * @param invitation Channel invitation
   * @param userId User ID (unused - kept for API compatibility)
   */
  /**
   * Handle channel invitation acceptance
   * Navigate to channel without adding as member - user must accept rules first
   * DON'T select channel in store - the router navigation will trigger the component
   * which will load the channel and handle subscriptions properly
   * @param invitation Channel invitation
   * @param userId User ID (unused - kept for API compatibility)
   */
  private handleChannelInvitation = async (
    invitation: Invitation,
    userId: string
  ): Promise<void> => {
    if (!invitation.channelId) return;

    console.log('📬 Navigating to channel from invitation:', invitation.channelId);

    // Only navigate - let the component/router handle channel selection
    // to avoid triggering multiple subscriptions
    await this.navigateToChannel(invitation.channelId);
  };

  /**
   * Get channel by ID from store or fetch
   * @param channelId Channel ID
   * @returns Channel or undefined
   */
  private getChannel = async (channelId: string) => {
    const channelDoc = await this.channelStore.getChannelById()(channelId);
    if (channelDoc) return channelDoc;

    const channels = this.channelStore.channels();
    return channels.find((ch) => ch.id === channelId);
  };

  /**
   * Add user to channel members
   * @param channelId Channel ID
   * @param currentMembers Current member array
   * @param userId User ID to add
   */
  private addUserToChannel = async (
    channelId: string,
    currentMembers: string[],
    userId: string
  ): Promise<void> => {
    const updatedMembers = [...new Set([...currentMembers, userId])];
    await this.channelStore.updateChannel(channelId, { members: updatedMembers });
    console.log('✅ User joined channel:', channelId);
  };

  /**
   * Navigate to channel with delay for Firestore sync
   * @param channelId Channel ID to navigate to
   */
  private navigateToChannel = async (channelId: string): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await this.router.navigate(['/dashboard/channel/' + channelId]);
  };

  /**
   * Handle direct message invitation acceptance
   * @param invitation DM invitation
   */
  private handleDirectMessageInvitation = async (invitation: Invitation): Promise<void> => {
    console.log('✅ DM invitation accepted from:', invitation.senderId);
    // TODO: Create/open DM conversation with sender
  };

  /**
   * Handle invitation acceptance errors
   * @param error Error object containing error details, message, and code
   * @param invitationId Invitation ID that failed to be accepted
   */
  private handleInvitationError = (error: any, invitationId: string): void => {
    console.error('❌ Error accepting invitation:', {
      error: error?.message || error,
      code: error?.code,
      invitationId,
    });
    alert(`Error accepting invitation: ${error?.message || 'Unknown error'}`);
  };

  /**
   * Decline invitation
   * @param invitationId Invitation ID to decline
   */
  declineInvitation = async (invitationId: string): Promise<void> => {
    try {
      await this.invitationService.declineInvitation(invitationId);
      console.log('❌ Invitation declined:', invitationId);
    } catch (error) {
      console.error('❌ Error declining invitation:', error);
    }
  };
}
