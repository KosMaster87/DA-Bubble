/**
 * @fileoverview Invitation Management Service
 * @description Facade that composes invitation acceptance, navigation cancellation, and user-facing error reporting behind one entry point.
 * @module core/services/invitation-management
 */

import { Injectable, inject } from '@angular/core';
import { Invitation } from '@core/models/invitation.model';
import { getInvitationAcceptErrorNotificationMessage } from '@core/services/notification/notification-copy';
import { NotificationService } from '@core/services/notification/notification.service';
import { InvitationAcceptanceService } from './invitation-acceptance.service';
import { InvitationNavigationService } from './invitation-navigation.service';

/**
 * Facade service for managing invitation acceptance workflow
 * Delegates to specialized services for navigation, acceptance, and channel operations
 */
@Injectable({
  providedIn: 'root',
})
export class InvitationManagementService {
  private acceptanceService = inject(InvitationAcceptanceService);
  private navigationService = inject(InvitationNavigationService);
  private notificationService = inject(NotificationService);

  /**
   * Accept invitation and handle channel/DM logic
    * @description Orchestrates the acceptance flow through delegated handlers so channel and DM invitation paths share one guarded execution contract.
   * @param invitation Invitation to accept
   * @param currentUserId Current user's ID
   */
  acceptInvitation = async (invitation: Invitation, currentUserId: string): Promise<void> => {
    await this.acceptanceService.acceptInvitation(
      invitation,
      currentUserId,
      this.acceptanceService.handleChannelInvitation,
      this.acceptanceService.handleDirectMessageInvitation,
      this.handleInvitationError,
    );
  };

  /**
   * Cancel any pending invitation-triggered navigation
   * Call this when user manually navigates to prevent override
   * @description Delegates to the navigation service to abort any in-flight invitation redirect so the user’s own navigation isn’t overridden.
   */
  cancelPendingNavigation(): void {
    this.navigationService.cancelPendingNavigation();
  }

  /**
   * Decline invitation
    * @description Routes decline through the acceptance service so status transitions use the same state-management boundary as acceptance.
   * @param invitationId Invitation ID to decline
   */
  declineInvitation = async (invitationId: string): Promise<void> => {
    await this.acceptanceService.declineInvitation(invitationId);
  };

  /**
   * Handle invitation acceptance errors
   * @description Logs structured error details and shows a user-facing notification so acceptance failures are visible without crashing the flow.
   * @param error Error object containing error details, message, and code
   * @param invitationId Invitation ID that failed to be accepted
   */
  private handleInvitationError = (error: any, invitationId: string): void => {
    console.error('❌ Error accepting invitation:', {
      error: error?.message || error,
      code: error?.code,
      invitationId,
    });
    this.notificationService.error(getInvitationAcceptErrorNotificationMessage(error));
  };
}
