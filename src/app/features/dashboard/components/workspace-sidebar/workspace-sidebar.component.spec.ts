import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { type DirectMessage } from '@core/models/direct-message.model';
import { type User } from '@core/models/user.model';
import { ChannelListService } from '@core/services/channel-list/channel-list.service';
import { ChannelManagementService } from '@core/services/channel-management/channel-management.service';
import {
  DirectMessageListService,
  type DirectMessageListItem,
} from '@core/services/direct-message-list/direct-message-list.service';
import { MailboxBadgeService } from '@core/services/mailbox-badge/mailbox-badge.service';
import { NavigationService, type RouteParams } from '@core/services/navigation/navigation.service';
import { UnreadService } from '@core/services/unread/unread.service';
import { UserTransformationService } from '@core/services/user-transformation/user-transformation.service';
import { WorkspaceInitializationService } from '@core/services/workspace-initialization/workspace-initialization.service';
import { WorkspaceSidebarService } from '@shared/services/workspace-sidebar.service';
import { AuthStore } from '@stores/auth';
import { ChannelMessageStore, DirectMessageStore, UserPresenceStore } from '@stores/index';
import { ThreadStore } from '@stores/threads/thread.store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkspaceSidebarComponent } from './workspace-sidebar.component';

describe('WorkspaceSidebarComponent', () => {
  const currentUser: Pick<User, 'uid' | 'displayName' | 'photoURL'> = {
    uid: 'user-1',
    displayName: 'Alice',
    photoURL: '/img/profile/profile-1.svg',
  };

  const directMessagesSignal = signal<DirectMessageListItem[]>([]);
  const directMessageMessagesSignal = signal<Record<string, DirectMessage[]>>({});
  const selectedChannelIdSignal = signal<string | null>(null);
  const selectedDirectMessageIdSignal = signal<string | null>(null);
  const hoveredThreadUnreadIdSignal = signal<string | null>(null);
  const routeParamsSignal = signal<RouteParams>({
    path: undefined,
    id: undefined,
    threadId: undefined,
  });
  const loadThreadsMock = vi.fn();
  const hasThreadUnreadMock = vi.fn<
    (conversationId: string, messageId: string, timestamp?: Date) => boolean
  >((_conversationId: string, _messageId: string, timestamp?: Date) => {
    if (!timestamp) return false;
    return timestamp.getTime() >= new Date('2026-04-18T08:00:00Z').getTime();
  });

  let resolveConversationSelection: ((conversationId: string | null) => void) | null = null;

  beforeEach(async () => {
    directMessagesSignal.set([]);
    directMessageMessagesSignal.set({});
    selectedChannelIdSignal.set(null);
    selectedDirectMessageIdSignal.set(null);
    hoveredThreadUnreadIdSignal.set(null);
    routeParamsSignal.set({ path: undefined, id: undefined, threadId: undefined });
    resolveConversationSelection = null;
    loadThreadsMock.mockClear();
    hasThreadUnreadMock.mockClear();

    const directMessageListServiceMock = {
      getConversationsWithSelfDM: () => directMessagesSignal,
      selectConversation: vi.fn(
        () =>
          new Promise<string | null>((resolve) => {
            resolveConversationSelection = resolve;
          }),
      ),
      startAndSelectConversation: vi.fn(),
    };

    const navigationServiceMock = {
      getSelectedChannelId: () => selectedChannelIdSignal.asReadonly(),
      getSelectedDirectMessageId: () => selectedDirectMessageIdSignal.asReadonly(),
      getRouteParams: () => routeParamsSignal.asReadonly(),
      selectDirectMessage: vi.fn((conversationId: string) => {
        selectedDirectMessageIdSignal.set(conversationId);
        routeParamsSignal.set({ path: 'dm', id: conversationId, threadId: undefined });
      }),
      selectDirectMessageById: vi.fn(),
      deselectDirectMessage: vi.fn(),
      selectChannel: vi.fn(),
      selectChannelById: vi.fn(),
      selectNewMessage: vi.fn(),
      navigateToLegal: vi.fn(),
      navigateToSettings: vi.fn(),
      handleThreadClick: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [WorkspaceSidebarComponent],
      providers: [
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: AuthStore, useValue: { user: signal(currentUser) } },
        {
          provide: UserPresenceStore,
          useValue: {
            isUserOnline: vi.fn(() => (_userId: string) => false),
          },
        },
        { provide: ChannelListService, useValue: { getVisibleChannels: () => signal([]) } },
        {
          provide: ChannelMessageStore,
          useValue: {
            getMessagesByChannel: vi.fn(() => (_channelId: string) => []),
          },
        },
        {
          provide: DirectMessageStore,
          useValue: {
            messages: directMessageMessagesSignal,
          },
        },
        {
          provide: ThreadStore,
          useValue: {
            getThreadsByMessageId: vi.fn(() => (messageId: string) => {
              if (messageId !== 'parent-1') return [];

              return [
                {
                  id: 'reply-1',
                  authorId: 'user-2',
                  createdAt: new Date('2026-04-18T08:10:00Z'),
                },
                {
                  id: 'reply-2',
                  authorId: 'user-3',
                  createdAt: new Date('2026-04-18T08:20:00Z'),
                },
              ];
            }),
            loadThreads: loadThreadsMock,
          },
        },
        {
          provide: UnreadService,
          useValue: {
            hasThreadUnread: hasThreadUnreadMock,
          },
        },
        { provide: DirectMessageListService, useValue: directMessageListServiceMock },
        { provide: ChannelManagementService, useValue: { createChannelFromPending: vi.fn() } },
        { provide: NavigationService, useValue: navigationServiceMock },
        { provide: UserTransformationService, useValue: { getUserList: () => signal([]) } },
        {
          provide: WorkspaceSidebarService,
          useValue: {
            isDirectMessagesOpen: () => true,
            hoveredThreadUnreadId: hoveredThreadUnreadIdSignal,
            toggleChannels: vi.fn(),
            toggleDirectMessages: vi.fn(),
            toggleSystemControl: vi.fn(),
            startAddChannel: vi.fn(),
            closeCreateChannel: vi.fn(),
            closeAddMemberAfterChannel: vi.fn(),
            setPendingChannelData: vi.fn(),
            openAddMemberAfterChannel: vi.fn(),
            onThreadUnreadMouseEnter: vi.fn(),
            onThreadUnreadMouseLeave: vi.fn(),
            onPopupMouseEnter: vi.fn(),
            isChannelsOpen: () => false,
            isSystemControlOpen: () => false,
            isCreateChannelOpen: () => false,
            isAddMemberAfterChannelOpen: () => false,
            pendingChannelName: signal(''),
          },
        },
        {
          provide: MailboxBadgeService,
          useValue: { hasUnread: () => false, unreadCount: signal(0) },
        },
        {
          provide: WorkspaceInitializationService,
          useValue: {
            initialize: vi.fn(),
            resetAutoSelectSuppression: vi.fn(),
          },
        },
      ],
    })
      .overrideComponent(WorkspaceSidebarComponent, {
        set: {
          template: `
            @for (dm of visibleDirectMessages(); track dm.id) {
              <div class="dm-item-wrapper">
                <button
                  class="dm-item"
                  [class.dm-item--active]="dm.isActive"
                  [class.dm-item--unread]="dm.visibleUnreadMessageCount > 0"
                  [class.dm-item--thread-unread]="dm.visibleUnreadThreadCount > 0"
                  (click)="selectDirectMessage(dm.id)"
                >
                  <span class="dm-item__message-count">{{ dm.visibleUnreadMessageCount }}</span>
                  <span class="dm-item__thread-count">{{ dm.visibleUnreadThreadCount }}</span>
                </button>

                @if (
                  dm.visibleUnreadThreadCount > 0 &&
                  workspaceSidebarService.hoveredThreadUnreadId() === dm.id &&
                  authStore.user()?.uid
                ) {
                  <app-thread-unread-popup
                    [conversationId]="dm.id"
                    [currentUserId]="authStore.user()!.uid"
                    [isDirectMessage]="true"
                    (threadClicked)="onThreadClick($event, true)"
                    (mouseenter)="onPopupMouseEnter()"
                    (mouseleave)="onThreadUnreadMouseLeave()"
                  />
                }
              </div>
            }
          `,
        },
      })
      .compileComponents();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('hides the DM unread count immediately when the user clicks the direct message', async () => {
    directMessagesSignal.set([
      {
        id: 'user-1_user-2',
        userId: 'user-2',
        name: 'Bob',
        avatar: '/img/profile/profile-2.svg',
        isOnline: false,
        hasUnread: true,
        hasThreadUnread: false,
        unreadMessageCount: 4,
        unreadThreadCount: 0,
      },
    ]);

    const fixture = TestBed.createComponent(WorkspaceSidebarComponent);
    fixture.detectChanges();

    let button = fixture.nativeElement.querySelector('.dm-item') as HTMLButtonElement;
    let messageCount = fixture.nativeElement.querySelector(
      '.dm-item__message-count',
    ) as HTMLSpanElement;
    let threadCount = fixture.nativeElement.querySelector(
      '.dm-item__thread-count',
    ) as HTMLSpanElement;

    expect(button.classList.contains('dm-item--unread')).toBe(true);
    expect(button.classList.contains('dm-item--active')).toBe(false);
    expect(button.classList.contains('dm-item--thread-unread')).toBe(false);
    expect(messageCount.textContent?.trim()).toBe('4');
    expect(threadCount.textContent?.trim()).toBe('0');

    button.click();
    fixture.detectChanges();

    button = fixture.nativeElement.querySelector('.dm-item') as HTMLButtonElement;
    messageCount = fixture.nativeElement.querySelector(
      '.dm-item__message-count',
    ) as HTMLSpanElement;
    threadCount = fixture.nativeElement.querySelector('.dm-item__thread-count') as HTMLSpanElement;

    expect(button.classList.contains('dm-item--active')).toBe(true);
    expect(button.classList.contains('dm-item--unread')).toBe(false);
    expect(button.classList.contains('dm-item--thread-unread')).toBe(false);
    expect(messageCount.textContent?.trim()).toBe('0');
    expect(threadCount.textContent?.trim()).toBe('0');

    resolveConversationSelection?.('user-1_user-2');
    await fixture.whenStable();
    fixture.detectChanges();

    button = fixture.nativeElement.querySelector('.dm-item') as HTMLButtonElement;
    messageCount = fixture.nativeElement.querySelector(
      '.dm-item__message-count',
    ) as HTMLSpanElement;
    threadCount = fixture.nativeElement.querySelector('.dm-item__thread-count') as HTMLSpanElement;

    expect(button.classList.contains('dm-item--active')).toBe(true);
    expect(button.classList.contains('dm-item--unread')).toBe(false);
    expect(button.classList.contains('dm-item--thread-unread')).toBe(false);
    expect(messageCount.textContent?.trim()).toBe('0');
    expect(threadCount.textContent?.trim()).toBe('0');
  });

  it('keeps the DM thread unread badge visible when the DM is active but the thread is unopened', async () => {
    directMessagesSignal.set([
      {
        id: 'user-1_user-2',
        userId: 'user-2',
        name: 'Bob',
        avatar: '/img/profile/profile-2.svg',
        isOnline: false,
        hasUnread: true,
        hasThreadUnread: true,
        unreadMessageCount: 4,
        unreadThreadCount: 2,
      },
    ]);

    const fixture = TestBed.createComponent(WorkspaceSidebarComponent);
    fixture.detectChanges();

    let button = fixture.nativeElement.querySelector('.dm-item') as HTMLButtonElement;
    let messageCount = fixture.nativeElement.querySelector(
      '.dm-item__message-count',
    ) as HTMLSpanElement;
    let threadCount = fixture.nativeElement.querySelector(
      '.dm-item__thread-count',
    ) as HTMLSpanElement;

    expect(button.classList.contains('dm-item--unread')).toBe(true);
    expect(button.classList.contains('dm-item--thread-unread')).toBe(true);
    expect(messageCount.textContent?.trim()).toBe('4');
    expect(threadCount.textContent?.trim()).toBe('2');

    button.click();
    fixture.detectChanges();

    button = fixture.nativeElement.querySelector('.dm-item') as HTMLButtonElement;
    messageCount = fixture.nativeElement.querySelector(
      '.dm-item__message-count',
    ) as HTMLSpanElement;
    threadCount = fixture.nativeElement.querySelector('.dm-item__thread-count') as HTMLSpanElement;

    expect(button.classList.contains('dm-item--active')).toBe(true);
    expect(button.classList.contains('dm-item--unread')).toBe(false);
    expect(button.classList.contains('dm-item--thread-unread')).toBe(true);
    expect(messageCount.textContent?.trim()).toBe('0');
    expect(threadCount.textContent?.trim()).toBe('2');

    resolveConversationSelection?.('user-1_user-2');
    await fixture.whenStable();
    fixture.detectChanges();

    button = fixture.nativeElement.querySelector('.dm-item') as HTMLButtonElement;
    messageCount = fixture.nativeElement.querySelector(
      '.dm-item__message-count',
    ) as HTMLSpanElement;
    threadCount = fixture.nativeElement.querySelector('.dm-item__thread-count') as HTMLSpanElement;

    expect(button.classList.contains('dm-item--active')).toBe(true);
    expect(button.classList.contains('dm-item--unread')).toBe(false);
    expect(button.classList.contains('dm-item--thread-unread')).toBe(true);
    expect(messageCount.textContent?.trim()).toBe('0');
    expect(threadCount.textContent?.trim()).toBe('2');
  });

  it('keeps channel thread unread counter independent from active channel selection', () => {
    selectedChannelIdSignal.set('channel-1');

    const fixture = TestBed.createComponent(WorkspaceSidebarComponent);
    const component = fixture.componentInstance as unknown as {
      getVisibleChannelUnreadMessageCount: (
        channelId: string,
        unreadMessageCount: number,
      ) => number;
      getVisibleChannelUnreadThreadCount: (channelId: string, unreadThreadCount: number) => number;
    };

    const visibleMessageCount = component.getVisibleChannelUnreadMessageCount('channel-1', 4);
    const visibleThreadCount = component.getVisibleChannelUnreadThreadCount('channel-1', 2);

    expect(visibleMessageCount).toBe(0);
    expect(visibleThreadCount).toBe(2);
  });

  it('renders the thread unread popup inside the sidebar with the current unread reply count', () => {
    directMessagesSignal.set([
      {
        id: 'user-1_user-2',
        userId: 'user-2',
        name: 'Bob',
        avatar: '/img/profile/profile-2.svg',
        isOnline: false,
        hasUnread: false,
        hasThreadUnread: true,
        unreadMessageCount: 0,
        unreadThreadCount: 2,
      },
    ]);
    directMessageMessagesSignal.set({
      'user-1_user-2': [
        {
          id: 'parent-1',
          authorId: currentUser.uid,
          content: 'Unread thread parent message',
          createdAt: new Date('2026-04-18T07:00:00Z'),
          updatedAt: new Date('2026-04-18T07:00:00Z'),
          isEdited: false,
          reactions: [],
          attachments: [],
          lastThreadTimestamp: new Date('2026-04-18T08:30:00Z'),
        },
      ],
    });
    hoveredThreadUnreadIdSignal.set('user-1_user-2');

    const fixture = TestBed.createComponent(WorkspaceSidebarComponent);
    fixture.detectChanges();

    const popup = fixture.nativeElement.querySelector('.thread-unread-popup') as HTMLElement | null;
    const badge = fixture.nativeElement.querySelector(
      '.thread-unread-popup__count-badge',
    ) as HTMLElement | null;

    expect(popup).not.toBeNull();
    expect(badge?.textContent?.replace(/\s+/g, ' ').trim()).toContain('2 Ungelesen');
    expect(loadThreadsMock).toHaveBeenCalledWith('user-1_user-2', 'parent-1', true);
  });
});
