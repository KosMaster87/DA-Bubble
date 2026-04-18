import { TestBed } from '@angular/core/testing';
import { type DocumentData, type QuerySnapshot } from '@angular/fire/firestore';
import { type Message, MessageType } from '@core/models/message.model';
import { ChannelMessageListenerService } from '@core/services/channel-message-listener/channel-message-listener.service';
import { ChannelMessageOperationsService } from '@core/services/channel-message-operations/channel-message-operations.service';
import { ReactionService } from '@core/services/reaction/reaction.service';
import { ThreadStore } from '@stores/threads/thread.store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChannelMessageStore } from './channel-message.store';

describe('ChannelMessageStore', () => {
  let handleMessagesLoaded:
    | ((messages: Message[], snapshot: QuerySnapshot<DocumentData>) => void)
    | null = null;

  const loadThreadsMock = vi.fn();

  beforeEach(() => {
    handleMessagesLoaded = null;
    loadThreadsMock.mockClear();

    TestBed.configureTestingModule({
      providers: [
        ChannelMessageStore,
        {
          provide: ChannelMessageListenerService,
          useValue: {
            setupListener: vi.fn(
              (
                _channelId: string,
                onSuccess: (messages: Message[], snapshot: QuerySnapshot<DocumentData>) => void,
              ) => {
                handleMessagesLoaded = onSuccess;
              },
            ),
            clearAllListeners: vi.fn(),
          },
        },
        {
          provide: ChannelMessageOperationsService,
          useValue: {
            sendMessage: vi.fn(),
            updateMessage: vi.fn(),
            deleteMessage: vi.fn(),
            loadOlderMessages: vi.fn(),
          },
        },
        {
          provide: ReactionService,
          useValue: {
            getMessageRef: vi.fn(),
            toggleReaction: vi.fn(),
          },
        },
        {
          provide: ThreadStore,
          useValue: {
            loadThreads: loadThreadsMock,
          },
        },
      ],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('loads thread listeners automatically for channel messages with thread activity', () => {
    const store = TestBed.inject(ChannelMessageStore);

    store.loadChannelMessages('channel-1');

    handleMessagesLoaded?.(
      [
        {
          id: 'm-1',
          content: 'Plain message',
          authorId: 'user-1',
          channelId: 'channel-1',
          type: MessageType.TEXT,
          attachments: [],
          reactions: [],
          isEdited: false,
          createdAt: new Date('2026-04-18T08:00:00Z'),
          updatedAt: new Date('2026-04-18T08:00:00Z'),
        },
        {
          id: 'm-2',
          content: 'Thread parent',
          authorId: 'user-2',
          channelId: 'channel-1',
          type: MessageType.TEXT,
          attachments: [],
          reactions: [],
          isEdited: false,
          createdAt: new Date('2026-04-18T08:05:00Z'),
          updatedAt: new Date('2026-04-18T08:05:00Z'),
          lastThreadTimestamp: new Date('2026-04-18T08:10:00Z'),
          threadCount: 2,
        },
      ],
      { docs: [] } as unknown as QuerySnapshot<DocumentData>,
    );

    expect(loadThreadsMock).toHaveBeenCalledTimes(1);
    expect(loadThreadsMock).toHaveBeenCalledWith('channel-1', 'm-2', false, undefined);
  });
});
