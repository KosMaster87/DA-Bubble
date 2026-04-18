import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UnreadService } from '@core/services/unread/unread.service';
import { AuthStore } from '@stores/auth';
import { ChannelMessageStore } from '@stores/channels/channel-message.store';
import { ChannelStore } from '@stores/channels/channel.store';
import { ThreadStore } from '@stores/threads/thread.store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChannelListService } from './channel-list.service';

describe('ChannelListService', () => {
  const currentUserId = 'user-1';

  const channelsSignal = signal<any[]>([]);
  const getMessagesByChannelMock = vi.fn<() => (channelId: string) => any[]>();
  const getThreadsByMessageIdMock = vi.fn<() => (messageId: string) => any[]>();
  const hasUnreadMock = vi.fn<(conversationId: string, timestamp?: Date) => boolean>();
  const hasThreadUnreadMock = vi.fn<
    (conversationId: string, messageId: string, timestamp?: Date) => boolean
  >((_conversationId: string, _messageId: string, _timestamp?: Date) => false);

  beforeEach(() => {
    channelsSignal.set([]);
    getMessagesByChannelMock.mockReturnValue((_channelId: string) => []);
    getThreadsByMessageIdMock.mockReturnValue((_messageId: string) => []);
    hasUnreadMock.mockReturnValue(false);
    hasThreadUnreadMock.mockReturnValue(false);

    TestBed.configureTestingModule({
      providers: [
        ChannelListService,
        {
          provide: ChannelStore,
          useValue: {
            channels: channelsSignal,
          },
        },
        {
          provide: ChannelMessageStore,
          useValue: {
            updateCounter: vi.fn(),
            getMessagesByChannel: getMessagesByChannelMock,
          },
        },
        {
          provide: ThreadStore,
          useValue: {
            getThreadsByMessageId: getThreadsByMessageIdMock,
          },
        },
        {
          provide: AuthStore,
          useValue: {
            user: signal({ uid: currentUserId }),
          },
        },
        {
          provide: UnreadService,
          useValue: {
            hasUnread: hasUnreadMock,
            hasThreadUnread: hasThreadUnreadMock,
          },
        },
      ],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('computes unread message and thread badge counts for a channel', () => {
    channelsSignal.set([
      {
        id: 'channel-1',
        name: 'General',
        isPrivate: false,
        members: [currentUserId],
        lastMessageAt: new Date('2026-04-17T10:00:00Z'),
      },
    ]);

    const messages = [
      {
        id: 'm-1',
        channelId: 'channel-1',
        authorId: 'user-2',
        createdAt: new Date('2026-04-17T09:00:00Z'),
      },
      {
        id: 'm-2',
        channelId: 'channel-1',
        authorId: currentUserId,
        createdAt: new Date('2026-04-17T09:10:00Z'),
      },
      {
        id: 'm-3',
        channelId: 'channel-1',
        authorId: 'user-3',
        createdAt: new Date('2026-04-17T09:20:00Z'),
        lastThreadTimestamp: new Date('2026-04-17T09:25:00Z'),
      },
    ];

    getMessagesByChannelMock.mockReturnValue((channelId: string) =>
      channelId === 'channel-1' ? messages : [],
    );

    getThreadsByMessageIdMock.mockReturnValue((messageId: string) =>
      messageId === 'm-3' ? [{ id: 't-1', authorId: currentUserId }] : [],
    );

    hasUnreadMock.mockImplementation(
      (conversationId: string, timestamp?: Date) =>
        conversationId === 'channel-1' && timestamp?.getTime() === messages[0].createdAt.getTime(),
    );

    hasThreadUnreadMock.mockImplementation(
      (conversationId: string, messageId: string) =>
        conversationId === 'channel-1' && messageId === 'm-3',
    );

    const service = TestBed.inject(ChannelListService);
    const result = service.getVisibleChannels()();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'channel-1',
      hasUnread: true,
      hasThreadUnread: true,
      unreadMessageCount: 1,
      unreadThreadCount: 1,
    });
  });

  it('falls back to badge count 1 when no messages are loaded but channel is unread', () => {
    channelsSignal.set([
      {
        id: 'channel-2',
        name: 'Announcements',
        isPrivate: false,
        members: [currentUserId],
        lastMessageAt: new Date('2026-04-17T12:00:00Z'),
      },
    ]);

    getMessagesByChannelMock.mockReturnValue((_channelId: string) => []);
    hasUnreadMock.mockReturnValue(true);

    const service = TestBed.inject(ChannelListService);
    const result = service.getVisibleChannels()();

    expect(result).toHaveLength(1);
    expect(result[0].unreadMessageCount).toBe(1);
    expect(result[0].hasUnread).toBe(true);
  });
});
