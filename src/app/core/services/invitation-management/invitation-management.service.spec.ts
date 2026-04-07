import { TestBed } from '@angular/core/testing';
import { Invitation } from '@core/models/invitation.model';
import { NotificationService } from '@core/services/notification/notification.service';
import { describe, expect, it, vi } from 'vitest';
import { InvitationAcceptanceService } from './invitation-acceptance.service';
import { InvitationManagementService } from './invitation-management.service';
import { InvitationNavigationService } from './invitation-navigation.service';

describe('InvitationManagementService', () => {
  it('shows error toast when invitation acceptance fails', async () => {
    const notification = { error: vi.fn() };
    const acceptanceService = {
      handleChannelInvitation: vi.fn(),
      handleDirectMessageInvitation: vi.fn(),
      acceptInvitation: vi.fn(
        async (
          _invitation: Invitation,
          _currentUserId: string,
          _onChannelInvitation: (invitation: Invitation, userId: string) => Promise<void>,
          _onDmInvitation: (invitation: Invitation) => Promise<void>,
          onError: (error: unknown, invitationId: string) => void,
        ) => {
          onError(new Error('Acceptance failed'), 'inv-1');
        },
      ),
      declineInvitation: vi.fn(),
    };

    const invitation: Invitation = {
      id: 'inv-1',
      type: 'channel',
      senderId: 'sender-1',
      recipientId: 'user-1',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      channelId: 'channel-1',
      channelName: 'General',
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: InvitationAcceptanceService, useValue: acceptanceService },
        { provide: InvitationNavigationService, useValue: { cancelPendingNavigation: vi.fn() } },
        { provide: NotificationService, useValue: notification },
      ],
    });

    const service = TestBed.inject(InvitationManagementService);
    await service.acceptInvitation(invitation, 'user-1');

    expect(notification.error).toHaveBeenCalledOnce();
  });
});
