import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { type Message } from '@core/models/message.model';
import { UnreadService } from '@core/services/unread/unread.service';
import { ChannelMessageStore, DirectMessageStore, ThreadStore } from '@stores/index';
import { type ThreadMessage } from '@stores/threads/thread.store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThreadUnreadPopupComponent } from './thread-unread-popup.component';

type PopupParentMessage = Pick<Message, 'id' | 'content' | 'authorId' | 'lastThreadTimestamp'>;
type PopupReply = Pick<ThreadMessage, 'id' | 'authorId' | 'createdAt'>;

describe('ThreadUnreadPopupComponent', () => {
  const currentUserId = 'user-1';
  const cutoff = new Date('2026-04-18T08:00:00Z').getTime();
  const loadThreadsMock = vi.fn();

  const channelMessagesById: Record<string, PopupParentMessage[]> = {
    'channel-1': [
      {
        id: 'parent-1',
        content: 'Parent message content for unread popup',
        authorId: currentUserId,
        lastThreadTimestamp: new Date('2026-04-18T08:30:00Z'),
      },
    ],
  };

  const loadedThreadMessagesByParentId: Record<string, PopupReply[]> = {
    'parent-1': [
      {
        id: 'reply-1',
        authorId: 'user-2',
        createdAt: new Date('2026-04-18T07:30:00Z'),
      },
      {
        id: 'reply-2',
        authorId: 'user-2',
        createdAt: new Date('2026-04-18T08:10:00Z'),
      },
      {
        id: 'reply-3',
        authorId: 'user-3',
        createdAt: new Date('2026-04-18T08:20:00Z'),
      },
    ],
  };

  const threadMessagesByParentId = signal<Record<string, PopupReply[]>>(
    loadedThreadMessagesByParentId,
  );

  const hasThreadUnreadMock = vi.fn(
    (_conversationId: string, _messageId: string, timestamp?: Date) => {
      if (!timestamp) return false;
      return timestamp.getTime() >= cutoff;
    },
  );

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  beforeEach(async () => {
    hasThreadUnreadMock.mockClear();
    loadThreadsMock.mockClear();
    threadMessagesByParentId.set(loadedThreadMessagesByParentId);

    await TestBed.configureTestingModule({
      imports: [ThreadUnreadPopupComponent],
      providers: [
        {
          provide: ThreadStore,
          useValue: {
            getThreadsByMessageId: () => (messageId: string) =>
              threadMessagesByParentId()[messageId] || [],
            loadThreads: loadThreadsMock,
          },
        },
        {
          provide: ChannelMessageStore,
          useValue: {
            getMessagesByChannel: () => (conversationId: string) =>
              channelMessagesById[conversationId] || [],
          },
        },
        {
          provide: DirectMessageStore,
          useValue: {
            messages: signal({}),
          },
        },
        {
          provide: UnreadService,
          useValue: {
            hasThreadUnread: hasThreadUnreadMock,
          },
        },
      ],
    }).compileComponents();
  });

  it('shows unread reply count instead of total thread size in popup badge', () => {
    const fixture = TestBed.createComponent(ThreadUnreadPopupComponent);
    fixture.componentRef.setInput('conversationId', 'channel-1');
    fixture.componentRef.setInput('currentUserId', currentUserId);
    fixture.componentRef.setInput('isDirectMessage', false);
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector(
      '.thread-unread-popup__count-badge',
    ) as HTMLElement;

    expect(badge.textContent?.replace(/\s+/g, ' ').trim()).toContain('2 Ungelesen');
  });

  it('loads unread thread snapshots on popup open and updates the badge once replies arrive', () => {
    threadMessagesByParentId.set({});

    const fixture = TestBed.createComponent(ThreadUnreadPopupComponent);
    fixture.componentRef.setInput('conversationId', 'channel-1');
    fixture.componentRef.setInput('currentUserId', currentUserId);
    fixture.componentRef.setInput('isDirectMessage', false);
    fixture.detectChanges();

    expect(loadThreadsMock).toHaveBeenCalledWith('channel-1', 'parent-1', false);

    let badge = fixture.nativeElement.querySelector(
      '.thread-unread-popup__count-badge',
    ) as HTMLElement;

    expect(badge.textContent?.replace(/\s+/g, ' ').trim()).toContain('1 Ungelesen');

    threadMessagesByParentId.set(loadedThreadMessagesByParentId);
    fixture.detectChanges();

    badge = fixture.nativeElement.querySelector('.thread-unread-popup__count-badge') as HTMLElement;

    expect(badge.textContent?.replace(/\s+/g, ' ').trim()).toContain('2 Ungelesen');
  });
});
