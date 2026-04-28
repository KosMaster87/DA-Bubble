/**
 * @fileoverview Invitation Acceptance Service
 * @description Executes invitation status transitions with debounce guards to prevent duplicate processing from rapid repeated actions.
 * @module core/services/invitation-management
 */

import { Injectable, inject } from '@angular/core';
import { Invitation } from '@core/models/invitation.model';
import { InvitationService } from '@core/services/invitation/invitation.service';
import { InvitationNavigationService } from './invitation-navigation.service';

/**
 * Service for processing invitation acceptance and decline
 */
@Injectable({
  providedIn: 'root',
})
export class InvitationAcceptanceService {
  private invitationService = inject(InvitationService);
  private invitationNavigationService = inject(InvitationNavigationService);

  // Track last accepted invitation to prevent duplicate acceptance
  private lastAcceptedInvitation: { id: string; timestamp: number } | null = null;
  private readonly DEBOUNCE_MS = 5000; // 5 seconds debounce

  /**
   * Accept invitation and trigger appropriate handler
    * @description Provides the single acceptance pipeline so validation, duplicate prevention, status updates, and type-specific handling stay synchronized.
   * @param invitation Invitation to accept
   * @param currentUserId Current user's ID
   * @param onChannelInvitation Callback for channel invitation handling
   * @param onDmInvitation Callback for DM invitation handling
   * @param onError Error handler callback
   */
  acceptInvitation = async (
    invitation: Invitation,
    currentUserId: string,
    onChannelInvitation: (invitation: Invitation, userId: string) => Promise<void>,
    onDmInvitation: (invitation: Invitation) => Promise<void>,
    onError: (error: any, invitationId: string) => void,
  ): Promise<void> => {
    if (!currentUserId) {
      return;
    }

    // Prevent duplicate acceptance within debounce window
    const now = Date.now();
    if (
      this.lastAcceptedInvitation &&
      this.lastAcceptedInvitation.id === invitation.id &&
      now - this.lastAcceptedInvitation.timestamp < this.DEBOUNCE_MS
    ) {
      return;
    }

    // Track this acceptance
    this.lastAcceptedInvitation = { id: invitation.id, timestamp: now };

    try {
      await this.invitationService.acceptInvitation(invitation.id);

      if (invitation.type === 'channel') {
        await onChannelInvitation(invitation, currentUserId);
      } else if (invitation.type === 'direct-message') {
        await onDmInvitation(invitation);
      }
    } catch (error: any) {
      onError(error, invitation.id);
    }
  };

  /**
   * Handle channel invitation acceptance
   * Navigate to channel without adding as member - user must accept rules first
   * DON'T select channel in store - the router navigation will trigger the component
   * which will load the channel and handle subscriptions properly
   * @description Navigates to the channel route only; member addition is intentionally deferred until the user explicitly accepts the channel rules.
   * @param invitation Channel invitation
   * @param userId User ID (unused - kept for API compatibility)
   */
  handleChannelInvitation = async (invitation: Invitation, userId: string): Promise<void> => {
    if (!invitation.channelId) return;

    await this.invitationNavigationService.navigateToChannel(invitation.channelId);
  };

  /**
   * Handle direct message invitation acceptance
    * @description Acknowledges DM invitation acceptance now while preserving a dedicated extension point for future auto-open DM routing.
   * @param invitation DM invitation
   */
  handleDirectMessageInvitation = async (invitation: Invitation): Promise<void> => {
    console.log('✅ DM invitation accepted from:', invitation.senderId);
    // TODO: Create/open DM conversation with sender
  };

  /**
   * Decline invitation
    * @description Applies decline status through the invitation service and captures outcome logs so failure diagnosis remains straightforward.
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
