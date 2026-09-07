/**
 * @fileoverview InvitationHelper Unit Tests
 * @description Jasmine/Vitest spec covering guard checks and success/error paths for
 *   `InvitationHelper.inviteToChannel`.
 * @module shared/services/invitation-helper.spec
 */

import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Channel } from '@core/models/channel.model';
import { InvitationService } from '@core/services/invitation/invitation.service';
import { ChannelStore } from '@stores/channels/channel.store';
import { InvitationHelper } from './invitation-helper.service';

// ─── Test Data Builders ──────────────────────────────────────────────────────

const createChannel = (overrides: Partial<Channel>): Channel => ({
  id: 'channel-1',
  name: 'General',
  description: 'General channel',
  isPrivate: false,
  createdBy: 'user-1',
  members: ['user-1'],
  admins: ['user-1'],
  createdAt: new Date('2026-04-17T08:00:00Z'),
  updatedAt: new Date('2026-04-17T08:00:00Z'),
  lastMessageAt: new Date('2026-04-17T08:00:00Z'),
  messageCount: 0,
  ...overrides,
});

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('InvitationHelper.inviteToChannel', () => {
  let invitationHelper: InvitationHelper;
  const mockHasPending = vi.fn();
  const mockCreateInvitation = vi.fn();
  const mockGetChannelById = vi.fn();

  const createInvitationServiceMock = () => ({
    hasPendingChannelInvitation: mockHasPending,
    createInvitation: mockCreateInvitation,
  });

  const createChannelStoreMock = () => ({
    getChannelById: () => mockGetChannelById,
  });

  beforeEach(() => {
    mockHasPending.mockReset();
    mockCreateInvitation.mockReset();
    mockGetChannelById.mockReset();

    TestBed.configureTestingModule({
      providers: [
        { provide: InvitationService, useValue: createInvitationServiceMock() },
        { provide: ChannelStore, useValue: createChannelStoreMock() },
      ],
    });

    invitationHelper = TestBed.inject(InvitationHelper);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('returns false when no channel is found', async () => {
    mockGetChannelById.mockReturnValue(undefined);

    const result = await invitationHelper.inviteToChannel('missing-id', 'sender-1', 'recipient-1');

    expect(result).toBe(false);
    expect(mockHasPending).not.toHaveBeenCalled();
    expect(mockCreateInvitation).not.toHaveBeenCalled();
  });

  it('returns false when the recipient is already a channel member', async () => {
    mockGetChannelById.mockReturnValue(
      createChannel({ id: 'channel-1', members: ['sender-1', 'recipient-1'] }),
    );

    const result = await invitationHelper.inviteToChannel('channel-1', 'sender-1', 'recipient-1');

    expect(result).toBe(false);
    expect(mockHasPending).not.toHaveBeenCalled();
    expect(mockCreateInvitation).not.toHaveBeenCalled();
  });

  it('returns false when a pending invitation already exists', async () => {
    mockGetChannelById.mockReturnValue(createChannel({ id: 'channel-1', members: ['sender-1'] }));
    mockHasPending.mockResolvedValue(true);

    const result = await invitationHelper.inviteToChannel('channel-1', 'sender-1', 'recipient-1');

    expect(result).toBe(false);
    expect(mockHasPending).toHaveBeenCalledWith('recipient-1', 'channel-1');
    expect(mockCreateInvitation).not.toHaveBeenCalled();
  });

  it('creates invitation and returns true on success', async () => {
    mockGetChannelById.mockReturnValue(
      createChannel({ id: 'channel-1', name: 'Freunde', members: ['sender-1'] }),
    );
    mockHasPending.mockResolvedValue(false);
    mockCreateInvitation.mockResolvedValue('inv-123');

    const result = await invitationHelper.inviteToChannel(
      'channel-1',
      'sender-1',
      'recipient-1',
      'Join us!',
    );

    expect(result).toBe(true);
    expect(mockHasPending).toHaveBeenCalledWith('recipient-1', 'channel-1');
    expect(mockCreateInvitation).toHaveBeenCalledWith({
      type: 'channel',
      senderId: 'sender-1',
      recipientId: 'recipient-1',
      channelId: 'channel-1',
      channelName: 'Freunde',
      message: 'Join us!',
    });
  });

  it('returns false when invitation creation throws', async () => {
    mockGetChannelById.mockReturnValue(createChannel({ id: 'channel-1', members: ['sender-1'] }));
    mockHasPending.mockResolvedValue(false);
    mockCreateInvitation.mockRejectedValue(new Error('Firestore write failed'));

    const result = await invitationHelper.inviteToChannel('channel-1', 'sender-1', 'recipient-1');

    expect(result).toBe(false);
  });

  it('creates invitation with no message when optional message is omitted', async () => {
    mockGetChannelById.mockReturnValue(
      createChannel({ id: 'channel-1', name: 'Support', members: ['sender-1'] }),
    );
    mockHasPending.mockResolvedValue(false);
    mockCreateInvitation.mockResolvedValue('inv-456');

    const result = await invitationHelper.inviteToChannel('channel-1', 'sender-1', 'recipient-1');

    expect(result).toBe(true);
    expect(mockCreateInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'channel',
        senderId: 'sender-1',
        recipientId: 'recipient-1',
        channelId: 'channel-1',
        channelName: 'Support',
        message: undefined,
      }),
    );
  });
});
