/**
 * @fileoverview Invitation Acceptance Service Test
 * @description Tests invitation acceptance with debounce guards and navigation flows.
 * @module core/services/invitation-management
 */

import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Invitation } from '@core/models/invitation.model';
import { InvitationService } from '@core/services/invitation/invitation.service';
import { DirectMessageStore } from '@stores/direct-messages/direct-message.store';
import { InvitationAcceptanceService } from './invitation-acceptance.service';
import { InvitationNavigationService } from './invitation-navigation.service';

function createInvitation(partial: Partial<Invitation>): Invitation {
  return {
    id: 'inv-1',
    type: 'channel',
    senderId: 'sender-1',
    recipientId: 'recipient-1',
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...partial,
  };
}

describe('InvitationAcceptanceService', () => {
  let service: InvitationAcceptanceService;
  let invitationServiceMock: {
    acceptInvitation: ReturnType<typeof vi.fn>;
    declineInvitation: ReturnType<typeof vi.fn>;
  };
  let navigationServiceMock: {
    navigateToChannel: ReturnType<typeof vi.fn>;
    navigateToDM: ReturnType<typeof vi.fn>;
    cancelPendingNavigation: ReturnType<typeof vi.fn>;
  };
  let directMessageStoreMock: {
    startConversation: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.useFakeTimers();

    invitationServiceMock = {
      acceptInvitation: vi.fn().mockResolvedValue(undefined),
      declineInvitation: vi.fn().mockResolvedValue(undefined),
    };

    navigationServiceMock = {
      navigateToChannel: vi.fn().mockResolvedValue(undefined),
      navigateToDM: vi.fn().mockResolvedValue(undefined),
      cancelPendingNavigation: vi.fn(),
    };

    directMessageStoreMock = {
      startConversation: vi.fn().mockResolvedValue({ id: 'dm-conv-1' }),
    };

    TestBed.configureTestingModule({
      providers: [
        InvitationAcceptanceService,
        { provide: InvitationService, useValue: invitationServiceMock },
        { provide: InvitationNavigationService, useValue: navigationServiceMock },
        { provide: DirectMessageStore, useValue: directMessageStoreMock },
      ],
    });

    service = TestBed.inject(InvitationAcceptanceService);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('handleChannelInvitation', () => {
    it('navigates to channel when channelId is present', async () => {
      const invitation = createInvitation({
        type: 'channel',
        channelId: 'channel-1',
        channelName: 'General',
      });

      await service.handleChannelInvitation(invitation, 'user-1');

      expect(navigationServiceMock.navigateToChannel).toHaveBeenCalledTimes(1);
      expect(navigationServiceMock.navigateToChannel).toHaveBeenCalledWith('channel-1');
    });

    it('does nothing when channelId is missing', async () => {
      const invitation = createInvitation({
        type: 'channel',
        channelId: undefined,
      });

      await service.handleChannelInvitation(invitation, 'user-1');

      expect(navigationServiceMock.navigateToChannel).not.toHaveBeenCalled();
    });
  });

  describe('handleDirectMessageInvitation', () => {
    it('starts conversation and navigates to DM', async () => {
      const invitation = createInvitation({
        type: 'direct-message',
        senderId: 'sender-42',
      });

      await service.handleDirectMessageInvitation(invitation, 'user-1');

      expect(directMessageStoreMock.startConversation).toHaveBeenCalledTimes(1);
      expect(directMessageStoreMock.startConversation).toHaveBeenCalledWith('user-1', 'sender-42');
      expect(navigationServiceMock.navigateToDM).toHaveBeenCalledTimes(1);
      expect(navigationServiceMock.navigateToDM).toHaveBeenCalledWith('dm-conv-1');
    });
  });

  describe('acceptInvitation', () => {
    it('calls channel handler for channel invitation', async () => {
      const invitation = createInvitation({
        type: 'channel',
        id: 'inv-channel-1',
        channelId: 'channel-1',
      });
      const onChannelInvitation = vi.fn().mockResolvedValue(undefined);
      const onDmInvitation = vi.fn().mockResolvedValue(undefined);
      const onError = vi.fn();

      await service.acceptInvitation(
        invitation,
        'user-1',
        onChannelInvitation,
        onDmInvitation,
        onError,
      );

      expect(invitationServiceMock.acceptInvitation).toHaveBeenCalledTimes(1);
      expect(invitationServiceMock.acceptInvitation).toHaveBeenCalledWith('inv-channel-1');
      expect(onChannelInvitation).toHaveBeenCalledTimes(1);
      expect(onChannelInvitation).toHaveBeenCalledWith(invitation, 'user-1');
      expect(onDmInvitation).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });

    it('calls DM handler for direct-message invitation', async () => {
      const invitation = createInvitation({
        type: 'direct-message',
        id: 'inv-dm-1',
        senderId: 'sender-2',
      });
      const onChannelInvitation = vi.fn().mockResolvedValue(undefined);
      const onDmInvitation = vi.fn().mockResolvedValue(undefined);
      const onError = vi.fn();

      await service.acceptInvitation(
        invitation,
        'user-1',
        onChannelInvitation,
        onDmInvitation,
        onError,
      );

      expect(invitationServiceMock.acceptInvitation).toHaveBeenCalledTimes(1);
      expect(invitationServiceMock.acceptInvitation).toHaveBeenCalledWith('inv-dm-1');
      expect(onDmInvitation).toHaveBeenCalledTimes(1);
      expect(onDmInvitation).toHaveBeenCalledWith(invitation, 'user-1');
      expect(onChannelInvitation).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });

    it('debounces duplicate acceptance within 5 seconds', async () => {
      const invitation = createInvitation({
        type: 'channel',
        id: 'inv-debounce-1',
      });
      const onChannelInvitation = vi.fn().mockResolvedValue(undefined);
      const onDmInvitation = vi.fn().mockResolvedValue(undefined);
      const onError = vi.fn();

      await service.acceptInvitation(
        invitation,
        'user-1',
        onChannelInvitation,
        onDmInvitation,
        onError,
      );
      expect(invitationServiceMock.acceptInvitation).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(4000); // Still within 5-second window

      await service.acceptInvitation(
        invitation,
        'user-1',
        onChannelInvitation,
        onDmInvitation,
        onError,
      );
      expect(invitationServiceMock.acceptInvitation).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(2000); // Now 6 seconds total since first call

      await service.acceptInvitation(
        invitation,
        'user-1',
        onChannelInvitation,
        onDmInvitation,
        onError,
      );
      expect(invitationServiceMock.acceptInvitation).toHaveBeenCalledTimes(2);
    });

    it('calls error handler when acceptance fails', async () => {
      const error = new Error('Acceptance failed');
      invitationServiceMock.acceptInvitation.mockRejectedValue(error);

      const invitation = createInvitation({
        type: 'channel',
        id: 'inv-error-1',
      });
      const onChannelInvitation = vi.fn().mockResolvedValue(undefined);
      const onDmInvitation = vi.fn().mockResolvedValue(undefined);
      const onError = vi.fn();

      await service.acceptInvitation(
        invitation,
        'user-1',
        onChannelInvitation,
        onDmInvitation,
        onError,
      );

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(error, 'inv-error-1');
      expect(onChannelInvitation).not.toHaveBeenCalled();
      expect(onDmInvitation).not.toHaveBeenCalled();
    });
  });
});
