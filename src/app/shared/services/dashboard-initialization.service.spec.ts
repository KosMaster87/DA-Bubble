import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { type Channel } from '@core/models/channel.model';
import { type DirectMessageConversation } from '@core/models/direct-message.model';
import { UnreadService } from '@core/services/unread/unread.service';
import { AuthStore } from '@stores/auth';
import { ChannelMessageStore } from '@stores/channels/channel-message.store';
import { ChannelStore } from '@stores/channels/channel.store';
import { DirectMessageStore } from '@stores/direct-messages/direct-message.store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DASHBOARD_WARMUP_CONFIG,
  DashboardInitializationService,
  type DashboardWarmupConfig,
} from './dashboard-initialization.service';

const createChannel = (overrides: Partial<Channel>): Channel => ({
  id: 'channel-1',
  name: 'General',
  description: 'General channel',
  isPrivate: false,
  createdBy: 'user-2',
  members: ['user-1'],
  admins: ['user-2'],
  createdAt: new Date('2026-04-17T08:00:00Z'),
  updatedAt: new Date('2026-04-17T08:00:00Z'),
  lastMessageAt: new Date('2026-04-18T08:30:00Z'),
  messageCount: 10,
  ...overrides,
});

const createConversation = (
  overrides: Partial<DirectMessageConversation>,
): DirectMessageConversation => ({
  id: 'user-1_user-2',
  participants: ['user-1', 'user-2'],
  createdAt: new Date('2026-04-17T09:00:00Z'),
  lastMessageAt: new Date('2026-04-18T08:45:00Z'),
  lastMessageContent: 'Hello',
  lastMessageBy: 'user-2',
  unreadCount: { 'user-1': 0, 'user-2': 0 },
  ...overrides,
});

describe('DashboardInitializationService', () => {
  const defaultWarmupConfig: DashboardWarmupConfig = {
    maxChannelWarmupCandidates: 5,
    maxDmWarmupCandidates: 5,
  };

  const channelsSignal = signal<Channel[]>([]);
  const conversationsSignal = signal<DirectMessageConversation[]>([]);
  const loadChannelMessagesMock = vi.fn();
  const loadConversationsMock = vi.fn();
  const loadMessagesMock = vi.fn();
  const hasUnreadMock = vi.fn<(conversationId: string, timestamp?: Date) => boolean>();
  const hasPotentialThreadUnreadActivityMock =
    vi.fn<(conversationId: string, timestamp?: Date) => boolean>();

  beforeEach(() => {
    channelsSignal.set([]);
    conversationsSignal.set([]);
    loadChannelMessagesMock.mockClear();
    loadConversationsMock.mockClear();
    loadMessagesMock.mockClear();
    hasUnreadMock.mockReset();
    hasUnreadMock.mockReturnValue(false);
    hasPotentialThreadUnreadActivityMock.mockReset();
    hasPotentialThreadUnreadActivityMock.mockReturnValue(false);

    TestBed.configureTestingModule({
      providers: [
        DashboardInitializationService,
        {
          provide: AuthStore,
          useValue: {
            user: signal({ uid: 'user-1', directMessages: ['user-1_user-2', 'user-1_user-3'] }),
          },
        },
        {
          provide: ChannelStore,
          useValue: {
            channels: channelsSignal,
          },
        },
        {
          provide: ChannelMessageStore,
          useValue: {
            loadChannelMessages: loadChannelMessagesMock,
          },
        },
        {
          provide: DirectMessageStore,
          useValue: {
            conversations: conversationsSignal,
            loadConversations: loadConversationsMock,
            loadMessages: loadMessagesMock,
          },
        },
        {
          provide: UnreadService,
          useValue: {
            hasUnread: hasUnreadMock,
            hasPotentialThreadUnreadActivity: hasPotentialThreadUnreadActivityMock,
          },
        },
        {
          provide: DASHBOARD_WARMUP_CONFIG,
          useValue: defaultWarmupConfig,
        },
      ],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('preloads messages only for unread member channels and unread direct messages', () => {
    hasUnreadMock.mockImplementation((conversationId: string) => {
      return conversationId === 'channel-1' || conversationId === 'user-1_user-2';
    });

    channelsSignal.set([
      createChannel({ id: 'channel-1', members: ['user-1'] }),
      createChannel({
        id: 'channel-2',
        members: ['user-1'],
        lastMessageAt: new Date('2026-04-17T07:00:00Z'),
      }),
      createChannel({ id: 'channel-3', members: ['user-3'] }),
    ]);
    conversationsSignal.set([
      createConversation({ id: 'user-1_user-2' }),
      createConversation({ id: 'user-1_user-3', lastMessageAt: new Date('2026-04-17T07:00:00Z') }),
    ]);

    const service = TestBed.inject(DashboardInitializationService);
    service.initializeEffects();
    TestBed.flushEffects();

    expect(loadConversationsMock).toHaveBeenCalledWith(['user-1_user-2', 'user-1_user-3']);
    expect(loadChannelMessagesMock).toHaveBeenCalledWith('channel-1', { once: true });
    expect(loadChannelMessagesMock).not.toHaveBeenCalledWith('channel-2');
    expect(loadChannelMessagesMock).not.toHaveBeenCalledWith('channel-3');
    expect(loadMessagesMock).toHaveBeenCalledWith('user-1_user-2', { once: true });
    expect(loadMessagesMock).not.toHaveBeenCalledWith('user-1_user-3');
  });

  it('does not preload the same unread conversation twice across effect reruns', () => {
    hasUnreadMock.mockReturnValue(true);
    channelsSignal.set([createChannel({ id: 'channel-1', members: ['user-1'] })]);
    conversationsSignal.set([createConversation({ id: 'user-1_user-2' })]);

    const service = TestBed.inject(DashboardInitializationService);
    service.initializeEffects();
    TestBed.flushEffects();

    channelsSignal.set([createChannel({ id: 'channel-1', members: ['user-1'] })]);
    conversationsSignal.set([createConversation({ id: 'user-1_user-2' })]);
    TestBed.flushEffects();

    expect(loadChannelMessagesMock).toHaveBeenCalledTimes(1);
    expect(loadMessagesMock).toHaveBeenCalledTimes(1);
  });

  it('preloads DM messages when only tracked thread activity suggests unread threads', () => {
    hasUnreadMock.mockReturnValue(false);
    hasPotentialThreadUnreadActivityMock.mockImplementation(
      (conversationId: string) => conversationId === 'user-1_user-2',
    );

    conversationsSignal.set([
      createConversation({ id: 'user-1_user-2' }),
      createConversation({ id: 'user-1_user-3' }),
    ]);

    const service = TestBed.inject(DashboardInitializationService);
    service.initializeEffects();
    TestBed.flushEffects();

    expect(loadMessagesMock).toHaveBeenCalledWith('user-1_user-2', { once: true });
    expect(loadMessagesMock).not.toHaveBeenCalledWith('user-1_user-3');
  });

  it('limits channel warmup to top 5 newest unread channels', () => {
    hasUnreadMock.mockReturnValue(true);

    channelsSignal.set([
      createChannel({
        id: 'channel-1',
        members: ['user-1'],
        lastMessageAt: new Date('2026-04-18T08:01:00Z'),
      }),
      createChannel({
        id: 'channel-2',
        members: ['user-1'],
        lastMessageAt: new Date('2026-04-18T08:02:00Z'),
      }),
      createChannel({
        id: 'channel-3',
        members: ['user-1'],
        lastMessageAt: new Date('2026-04-18T08:03:00Z'),
      }),
      createChannel({
        id: 'channel-4',
        members: ['user-1'],
        lastMessageAt: new Date('2026-04-18T08:04:00Z'),
      }),
      createChannel({
        id: 'channel-5',
        members: ['user-1'],
        lastMessageAt: new Date('2026-04-18T08:05:00Z'),
      }),
      createChannel({
        id: 'channel-6',
        members: ['user-1'],
        lastMessageAt: new Date('2026-04-18T08:06:00Z'),
      }),
    ]);

    const service = TestBed.inject(DashboardInitializationService);
    service.initializeEffects();
    TestBed.flushEffects();

    expect(loadChannelMessagesMock).toHaveBeenCalledTimes(5);
    expect(loadChannelMessagesMock).toHaveBeenCalledWith('channel-6', { once: true });
    expect(loadChannelMessagesMock).toHaveBeenCalledWith('channel-5', { once: true });
    expect(loadChannelMessagesMock).toHaveBeenCalledWith('channel-4', { once: true });
    expect(loadChannelMessagesMock).toHaveBeenCalledWith('channel-3', { once: true });
    expect(loadChannelMessagesMock).toHaveBeenCalledWith('channel-2', { once: true });
    expect(loadChannelMessagesMock).not.toHaveBeenCalledWith('channel-1', { once: true });
  });

  it('limits DM warmup to top 5 newest unread conversations', () => {
    hasUnreadMock.mockReturnValue(true);

    conversationsSignal.set([
      createConversation({ id: 'user-1_user-2', lastMessageAt: new Date('2026-04-18T08:01:00Z') }),
      createConversation({ id: 'user-1_user-3', lastMessageAt: new Date('2026-04-18T08:02:00Z') }),
      createConversation({ id: 'user-1_user-4', lastMessageAt: new Date('2026-04-18T08:03:00Z') }),
      createConversation({ id: 'user-1_user-5', lastMessageAt: new Date('2026-04-18T08:04:00Z') }),
      createConversation({ id: 'user-1_user-6', lastMessageAt: new Date('2026-04-18T08:05:00Z') }),
      createConversation({ id: 'user-1_user-7', lastMessageAt: new Date('2026-04-18T08:06:00Z') }),
    ]);

    const service = TestBed.inject(DashboardInitializationService);
    service.initializeEffects();
    TestBed.flushEffects();

    expect(loadMessagesMock).toHaveBeenCalledTimes(5);
    expect(loadMessagesMock).toHaveBeenCalledWith('user-1_user-7', { once: true });
    expect(loadMessagesMock).toHaveBeenCalledWith('user-1_user-6', { once: true });
    expect(loadMessagesMock).toHaveBeenCalledWith('user-1_user-5', { once: true });
    expect(loadMessagesMock).toHaveBeenCalledWith('user-1_user-4', { once: true });
    expect(loadMessagesMock).toHaveBeenCalledWith('user-1_user-3', { once: true });
    expect(loadMessagesMock).not.toHaveBeenCalledWith('user-1_user-2', { once: true });
  });

  it('applies custom warmup config when provided', () => {
    TestBed.overrideProvider(DASHBOARD_WARMUP_CONFIG, {
      useValue: {
        maxChannelWarmupCandidates: 2,
        maxDmWarmupCandidates: 2,
      } satisfies DashboardWarmupConfig,
    });

    hasUnreadMock.mockReturnValue(true);

    channelsSignal.set([
      createChannel({
        id: 'channel-1',
        members: ['user-1'],
        lastMessageAt: new Date('2026-04-18T08:01:00Z'),
      }),
      createChannel({
        id: 'channel-2',
        members: ['user-1'],
        lastMessageAt: new Date('2026-04-18T08:02:00Z'),
      }),
      createChannel({
        id: 'channel-3',
        members: ['user-1'],
        lastMessageAt: new Date('2026-04-18T08:03:00Z'),
      }),
    ]);

    conversationsSignal.set([
      createConversation({ id: 'user-1_user-2', lastMessageAt: new Date('2026-04-18T08:01:00Z') }),
      createConversation({ id: 'user-1_user-3', lastMessageAt: new Date('2026-04-18T08:02:00Z') }),
      createConversation({ id: 'user-1_user-4', lastMessageAt: new Date('2026-04-18T08:03:00Z') }),
    ]);

    const service = TestBed.inject(DashboardInitializationService);
    service.initializeEffects();
    TestBed.flushEffects();

    expect(loadChannelMessagesMock).toHaveBeenCalledTimes(2);
    expect(loadChannelMessagesMock).toHaveBeenCalledWith('channel-3', { once: true });
    expect(loadChannelMessagesMock).toHaveBeenCalledWith('channel-2', { once: true });
    expect(loadChannelMessagesMock).not.toHaveBeenCalledWith('channel-1', { once: true });

    expect(loadMessagesMock).toHaveBeenCalledTimes(2);
    expect(loadMessagesMock).toHaveBeenCalledWith('user-1_user-4', { once: true });
    expect(loadMessagesMock).toHaveBeenCalledWith('user-1_user-3', { once: true });
    expect(loadMessagesMock).not.toHaveBeenCalledWith('user-1_user-2', { once: true });
  });
});
