import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  type DirectMessage,
  type DirectMessageConversation,
} from '@core/models/direct-message.model';
import { type User } from '@core/models/user.model';
import { NavigationService } from '@core/services/navigation/navigation.service';
import { UnreadService } from '@core/services/unread/unread.service';
import { AuthStore } from '@stores/auth';
import { DirectMessageStore } from '@stores/direct-messages/direct-message.store';
import { ThreadStore, type ThreadMessage } from '@stores/threads/thread.store';
import { UserStore } from '@stores/users/user.store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DirectMessageListService } from './direct-message-list.service';

type UserLookupResult = Pick<User, 'uid' | 'displayName' | 'photoURL' | 'isOnline'>;

const createConversation = (
  overrides: Partial<DirectMessageConversation>,
): DirectMessageConversation => ({
  id: 'user-1_user-2',
  participants: ['user-1', 'user-2'],
  createdAt: new Date('2026-04-17T09:00:00Z'),
  lastMessageAt: new Date('2026-04-17T10:00:00Z'),
  lastMessageContent: 'Hello',
  lastMessageBy: 'user-2',
  unreadCount: { 'user-1': 0, 'user-2': 0 },
  ...overrides,
});

const createDirectMessage = (overrides: Partial<DirectMessage>): DirectMessage => ({
  id: 'm-1',
  authorId: 'user-2',
  content: 'Hello',
  createdAt: new Date('2026-04-17T10:30:00Z'),
  updatedAt: new Date('2026-04-17T10:30:00Z'),
  isEdited: false,
  reactions: [],
  attachments: [],
  ...overrides,
});

const createThreadMessage = (overrides: Partial<ThreadMessage>): ThreadMessage => ({
  id: 't-1',
  content: 'Reply',
  authorId: 'user-1',
  parentMessageId: 'm-1',
  channelId: 'user-1_user-2',
  reactions: [],
  attachments: [],
  isEdited: false,
  createdAt: new Date('2026-04-17T10:35:00Z'),
  updatedAt: new Date('2026-04-17T10:35:00Z'),
  ...overrides,
});

describe('DirectMessageListService', () => {
  const currentUserId = 'user-1';
  const currentUser: Pick<User, 'uid' | 'displayName' | 'photoURL'> = {
    uid: currentUserId,
    displayName: 'Alice',
    photoURL: '/img/profile/profile-1.svg',
  };

  const conversationsSignal = signal<DirectMessageConversation[]>([]);
  const messagesSignal = signal<Record<string, DirectMessage[]>>({});

  const getUserByIdMock = vi.fn<() => (id: string) => UserLookupResult | undefined>();
  const getThreadsByMessageIdMock = vi.fn<() => (messageId: string) => ThreadMessage[]>();
  const hasUnreadMock = vi.fn<(conversationId: string, timestamp?: Date) => boolean>();
  const hasThreadUnreadMock = vi.fn<
    (conversationId: string, messageId: string, timestamp?: Date) => boolean
  >((_conversationId: string, _messageId: string, _timestamp?: Date) => false);

  beforeEach(() => {
    conversationsSignal.set([]);
    messagesSignal.set({});
    getUserByIdMock.mockReturnValue((id: string) => ({
      uid: id,
      displayName: id === 'user-2' ? 'Bob' : 'Unknown User',
      photoURL: '/img/profile/profile-2.svg',
      isOnline: false,
    }));
    getThreadsByMessageIdMock.mockReturnValue((_messageId: string) => []);
    hasUnreadMock.mockReturnValue(false);
    hasThreadUnreadMock.mockReturnValue(false);

    TestBed.configureTestingModule({
      providers: [
        DirectMessageListService,
        {
          provide: DirectMessageStore,
          useValue: {
            updateCounter: vi.fn(),
            sortedConversations: conversationsSignal,
            messages: messagesSignal,
            startConversation: vi.fn(),
            loadMessages: vi.fn(),
          },
        },
        {
          provide: UserStore,
          useValue: {
            getUserById: getUserByIdMock,
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
            user: signal(currentUser),
          },
        },
        {
          provide: UnreadService,
          useValue: {
            hasUnread: hasUnreadMock,
            hasThreadUnread: hasThreadUnreadMock,
            markAsRead: vi.fn(),
          },
        },
        {
          provide: NavigationService,
          useValue: {
            selectDirectMessageById: vi.fn(),
          },
        },
      ],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('uses conversation unreadCount metadata for DM unread badge count', () => {
    conversationsSignal.set([
      createConversation({
        unreadCount: { 'user-1': 5 },
        lastMessageAt: new Date('2026-04-17T10:00:00Z'),
      }),
    ]);

    const service = TestBed.inject(DirectMessageListService);
    const result = service.getSortedConversations()();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'user-1_user-2',
      hasUnread: true,
      unreadMessageCount: 5,
    });
  });

  it('computes thread unread badge count from unread thread activity', () => {
    conversationsSignal.set([
      createConversation({
        unreadCount: { 'user-1': 0 },
        lastMessageAt: new Date('2026-04-17T11:00:00Z'),
      }),
    ]);

    messagesSignal.set({
      'user-1_user-2': [
        createDirectMessage({
          lastThreadTimestamp: new Date('2026-04-17T10:40:00Z'),
        }),
      ],
    });

    getThreadsByMessageIdMock.mockReturnValue((messageId: string) =>
      messageId === 'm-1' ? [createThreadMessage({ parentMessageId: messageId })] : [],
    );

    hasThreadUnreadMock.mockImplementation(
      (conversationId: string, messageId: string) =>
        conversationId === 'user-1_user-2' && messageId === 'm-1',
    );

    const service = TestBed.inject(DirectMessageListService);
    const result = service.getSortedConversations()();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      hasThreadUnread: true,
      unreadThreadCount: 1,
    });
  });

  it('keeps self DM pinned at top with zero unread badges by default', () => {
    conversationsSignal.set([]);

    const service = TestBed.inject(DirectMessageListService);
    const result = service.getConversationsWithSelfDM()();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: `self-${currentUserId}`,
      unreadMessageCount: 0,
      unreadThreadCount: 0,
      hasUnread: false,
      hasThreadUnread: false,
    });
  });
});
