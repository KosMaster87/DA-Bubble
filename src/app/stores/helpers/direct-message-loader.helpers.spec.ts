import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadConversations, loadMessages } from './direct-message-loader.helpers';

describe('direct-message-loader.helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loadConversations patches empty state when no ids are provided', () => {
    const patchState = vi.fn();

    loadConversations({
      firestore: {} as never,
      userConversationIds: [],
      getConversationsDebounceTimer: () => null,
      setConversationsDebounceTimer: vi.fn(),
      patchState,
      getConversationsUnsubscribe: () => null,
      setConversationsUnsubscribe: vi.fn(),
      getConversationsRetryCount: () => 0,
      setConversationsRetryCount: vi.fn(),
      maxRetries: 3,
      debounceMs: 10,
      snapshotDebounceMs: 5,
      initialState: { conversations: [], isLoading: false },
    });

    expect(patchState).toHaveBeenCalledWith({ conversations: [], isLoading: false });
  });

  it('loadConversations schedules debounce timer for non-empty ids', () => {
    const setConversationsDebounceTimer = vi.fn();

    loadConversations({
      firestore: {} as never,
      userConversationIds: ['dm_1'],
      getConversationsDebounceTimer: () => null,
      setConversationsDebounceTimer,
      patchState: vi.fn(),
      getConversationsUnsubscribe: () => null,
      setConversationsUnsubscribe: vi.fn(),
      getConversationsRetryCount: () => 0,
      setConversationsRetryCount: vi.fn(),
      maxRetries: 3,
      debounceMs: 10,
      snapshotDebounceMs: 5,
      initialState: { conversations: [], isLoading: false },
    });

    expect(setConversationsDebounceTimer).toHaveBeenCalledTimes(1);
  });

  it('loadMessages stores a debounce timer for the conversation', () => {
    const timers = new Map<string, ReturnType<typeof setTimeout>>();

    loadMessages({
      firestore: {} as never,
      conversationId: 'conv-1',
      messagesDebounceTimers: timers,
      messagesSnapshots: new Map(),
      messagesUnsubscribers: new Map(),
      messagesRetryCounters: new Map(),
      patchState: vi.fn(),
      getMessages: () => ({}),
      getUpdateCounter: () => 0,
      getHasMoreMessages: () => ({}),
      threadStore: {},
      maxRetries: 3,
      debounceMs: 10,
      snapshotDebounceMs: 5,
    });

    expect(timers.has('conv-1')).toBe(true);
  });

  it('loadMessages replaces an existing timer for the same conversation', () => {
    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    const oldTimer = setTimeout(() => undefined, 500);
    timers.set('conv-1', oldTimer);

    loadMessages({
      firestore: {} as never,
      conversationId: 'conv-1',
      messagesDebounceTimers: timers,
      messagesSnapshots: new Map(),
      messagesUnsubscribers: new Map(),
      messagesRetryCounters: new Map(),
      patchState: vi.fn(),
      getMessages: () => ({}),
      getUpdateCounter: () => 0,
      getHasMoreMessages: () => ({}),
      threadStore: {},
      maxRetries: 3,
      debounceMs: 10,
      snapshotDebounceMs: 5,
    });

    const newTimer = timers.get('conv-1');
    expect(newTimer).toBeDefined();
    expect(newTimer).not.toBe(oldTimer);
  });
});
