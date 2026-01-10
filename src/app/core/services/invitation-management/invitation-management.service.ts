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

  // Track last accepted invitation to prevent duplicate navigation
  private lastAcceptedInvitation: { id: string; timestamp: number } | null = null;
  private lastNavigatedChannel: { id: string; timestamp: number } | null = null;
  private pendingNavigation: { channelId: string; timeoutId: any } | null = null;
  private readonly DEBOUNCE_MS = 5000; // 5 seconds debounce

  /**
   * Accept invitation and handle channel/DM logic
   * @param invitation Invitation to accept
   * @param currentUserId Current user's ID
   */
  acceptInvitation = async (invitation: Invitation, currentUserId: string): Promise<void> => {
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

    // Prevent duplicate navigation to same channel within debounce window
    const now = Date.now();
    if (
      this.lastNavigatedChannel &&
      this.lastNavigatedChannel.id === invitation.channelId &&
      now - this.lastNavigatedChannel.timestamp < this.DEBOUNCE_MS
    ) {
      return;
    }

    // Track this navigation
    this.lastNavigatedChannel = { id: invitation.channelId, timestamp: now };

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
  };

  /**
   * Navigate to channel after delay
   * Cancellable to prevent race conditions with manual navigation
   * @param channelId Channel ID to navigate to
   */
  private navigateToChannel = async (channelId: string): Promise<void> => {
    // Cancel any pending navigation
    if (this.pendingNavigation) {
      clearTimeout(this.pendingNavigation.timeoutId);
      this.pendingNavigation = null;
    }

    // Schedule new navigation with minimal delay
    return new Promise((resolve) => {
      const timeoutId = setTimeout(async () => {
        // Check if navigation is still pending AND user hasn't navigated away
        if (this.pendingNavigation?.channelId === channelId) {
          const currentUrl = this.router.url;

          // Only navigate if user is still on the same page (hasn't manually navigated)
          if (currentUrl === '/dashboard' || currentUrl.includes('/dashboard/mailbox')) {
            console.log('✅ Executing navigation to:', channelId);
            // CRITICAL: Use array with separate segments, NOT concatenated string
            // Correct: ['/dashboard', 'channel', channelId]
            // Wrong: ['/dashboard/channel/' + channelId] → causes 404!
            await this.router.navigate(['/dashboard', 'channel', channelId]);
          } else {
            console.log('🚫 User already navigated to:', currentUrl, '- skipping invitation navigation');
          }

          this.pendingNavigation = null;
        }
        resolve();
      }, 100); // Reduced from 500ms to 100ms

      this.pendingNavigation = { channelId, timeoutId };
    });
  };

  /**
   * Cancel any pending invitation-triggered navigation
   * Call this when user manually navigates to prevent override
   */
  cancelPendingNavigation(): void {
    if (this.pendingNavigation) {
      clearTimeout(this.pendingNavigation.timeoutId);
      console.log('🚫 User navigation - cancelled pending invitation navigation to:', this.pendingNavigation.channelId);
      this.pendingNavigation = null;
    }
  }

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
