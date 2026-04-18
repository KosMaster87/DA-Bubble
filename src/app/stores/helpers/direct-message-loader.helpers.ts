/**
 * @fileoverview DirectMessage loader helpers
 * @description Complex loader functions for conversations and messages
 * @module DirectMessageLoaderHelpers
 */

import { DocumentData, Firestore, QuerySnapshot, Unsubscribe } from '@angular/fire/firestore';
import { DirectMessage, DirectMessageConversation } from '@core/models/direct-message.model';
import {
  handleConversationsError,
  handleConversationsSnapshot,
  handleMessagesError,
  handleMessagesSnapshot,
  setupConversationsListener as setupConvListener,
  setupMessagesListener as setupMsgListener,
} from './direct-message-snapshot.helpers';
import { logError } from './shared-error.helpers';

type TimerHandle = ReturnType<typeof setTimeout>;
type StatePatch = object;
type PatchState = (state: StatePatch) => void;

interface LoadConversationsOptions {
  firestore: Firestore;
  userConversationIds: string[];
  getConversationsDebounceTimer: () => TimerHandle | null;
  setConversationsDebounceTimer: (timer: TimerHandle | null) => void;
  patchState: PatchState;
  getConversationsUnsubscribe: () => Unsubscribe | null;
  setConversationsUnsubscribe: (unsub: Unsubscribe | null) => void;
  getConversationsRetryCount: () => number;
  setConversationsRetryCount: (count: number) => void;
  maxRetries: number;
  debounceMs: number;
  snapshotDebounceMs: number;
  initialState: StatePatch;
}

interface LoadMessagesOptions {
  firestore: Firestore;
  conversationId: string;
  once?: boolean;
  messagesDebounceTimers: Map<string, TimerHandle>;
  messagesSnapshots: Map<string, QuerySnapshot<DocumentData>>;
  messagesUnsubscribers: Map<string, Unsubscribe>;
  messagesRetryCounters: Map<string, number>;
  patchState: PatchState;
  getMessages: () => { [conversationId: string]: DirectMessage[] };
  getUpdateCounter: () => number;
  getHasMoreMessages: () => { [conversationId: string]: boolean };
  threadStore: unknown;
  maxRetries: number;
  debounceMs: number;
  snapshotDebounceMs: number;
}

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Unknown direct message loader error';

const applyConversationsState = (
  patchState: PatchState,
  conversations: DirectMessageConversation[],
): void => {
  patchState({ conversations, isLoading: false });
};

const resetConversationListener = (options: LoadConversationsOptions): void => {
  const unsubscribe = options.getConversationsUnsubscribe();
  if (unsubscribe) {
    unsubscribe();
  }
  options.setConversationsUnsubscribe(null);
  options.patchState(options.initialState);
};

const retryConversationsLoad = (options: LoadConversationsOptions, ids: string[]): void => {
  const nextRetry = options.getConversationsRetryCount() + 1;
  options.setConversationsRetryCount(nextRetry);
  loadConversations({
    ...options,
    userConversationIds: ids,
  });
};

const createConversationSnapshotHandler = (
  options: LoadConversationsOptions,
): ((snapshot: QuerySnapshot<DocumentData>) => void) => {
  return (snapshot: QuerySnapshot<DocumentData>): void => {
    const timer = options.getConversationsDebounceTimer();
    if (timer) {
      clearTimeout(timer);
    }
    const snapshotTimer = setTimeout(() => {
      handleConversationsSnapshot(snapshot, (conversations: DirectMessageConversation[]) => {
        applyConversationsState(options.patchState, conversations);
      });
    }, options.snapshotDebounceMs);
    options.setConversationsDebounceTimer(snapshotTimer);
  };
};

const createConversationErrorHandler = (
  options: LoadConversationsOptions,
): ((error: unknown) => void) => {
  return (error: unknown): void => {
    handleConversationsError(
      error,
      options.userConversationIds,
      () => {
        resetConversationListener(options);
      },
      (ids: string[]) => {
        retryConversationsLoad(options, ids);
      },
      (errorMsg: string) => options.patchState({ error: errorMsg, isLoading: false }),
      options.getConversationsRetryCount(),
      options.maxRetries,
    );
  };
};

const setupConversationSubscription = (options: LoadConversationsOptions): void => {
  const handleSnapshot = createConversationSnapshotHandler(options);
  const handleError = createConversationErrorHandler(options);
  const unsub = setupConvListener(
    options.firestore,
    options.userConversationIds,
    options.getConversationsUnsubscribe(),
    handleSnapshot,
    handleError,
  );
  options.setConversationsUnsubscribe(unsub);
};

/**
 * Load conversations with debounce and error handling
 * @param {LoadConversationsOptions} options - Conversations load options
 * @returns {void}
 * @description
 * Debounce and centralized retry handling prevent rapid listener churn when auth/user
 * state changes quickly during app bootstrap.
 */
export const loadConversations = (options: LoadConversationsOptions): void => {
  const {
    userConversationIds,
    getConversationsDebounceTimer,
    setConversationsDebounceTimer,
    patchState,
    setConversationsRetryCount,
    debounceMs,
  } = options;

  if (userConversationIds.length === 0) {
    patchState({ conversations: [], isLoading: false });
    return;
  }

  const existingTimer = getConversationsDebounceTimer();
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const timer = setTimeout(() => {
    patchState({ isLoading: true, error: null });
    setConversationsRetryCount(0);
    try {
      setupConversationSubscription(options);
    } catch (error: unknown) {
      logError('setupConversationsListener', error);
      patchState({ error: getErrorMessage(error), isLoading: false });
    }
  }, debounceMs);

  setConversationsDebounceTimer(timer);
};

const clearMessageTimer = (
  messagesDebounceTimers: Map<string, TimerHandle>,
  conversationId: string,
): void => {
  if (messagesDebounceTimers.has(conversationId)) {
    clearTimeout(messagesDebounceTimers.get(conversationId));
  }
};

const createMessagesSnapshotHandler = (
  options: LoadMessagesOptions,
): ((snapshot: QuerySnapshot<DocumentData>) => void) => {
  return (snapshot: QuerySnapshot<DocumentData>): void => {
    options.messagesSnapshots.set(options.conversationId, snapshot);
    clearMessageTimer(options.messagesDebounceTimers, options.conversationId);
    const snapshotTimer = setTimeout(() => {
      handleMessagesSnapshot(
        options.conversationId,
        snapshot,
        (convId: string, messages: DirectMessage[]) => {
          options.patchState({
            messages: { ...options.getMessages(), [convId]: messages },
            updateCounter: options.getUpdateCounter() + 1,
            hasMoreMessages: { ...options.getHasMoreMessages(), [convId]: messages.length >= 100 },
          });
        },
        options.threadStore,
        { once: options.once },
      );
    }, options.snapshotDebounceMs);
    options.messagesDebounceTimers.set(options.conversationId, snapshotTimer);
  };
};

const createMessagesErrorHandler = (options: LoadMessagesOptions): ((error: unknown) => void) => {
  return (error: unknown): void => {
    const retryCount = options.messagesRetryCounters.get(options.conversationId) || 0;
    handleMessagesError(
      options.conversationId,
      error,
      () => {
        const unsubscribe = options.messagesUnsubscribers.get(options.conversationId);
        if (unsubscribe) {
          unsubscribe();
        }
        options.messagesUnsubscribers.delete(options.conversationId);
      },
      (convId: string) => {
        const currentRetry = options.messagesRetryCounters.get(convId) || 0;
        options.messagesRetryCounters.set(convId, currentRetry + 1);
        loadMessages({
          ...options,
          conversationId: convId,
        });
      },
      (errorMsg: string) => options.patchState({ error: errorMsg }),
      retryCount,
      options.maxRetries,
    );
  };
};

const setupMessageSubscription = (options: LoadMessagesOptions): void => {
  const handleSnapshot = createMessagesSnapshotHandler(options);
  const handleError = createMessagesErrorHandler(options);
  const unsub = setupMsgListener(
    options.firestore,
    options.conversationId,
    options.messagesUnsubscribers,
    handleSnapshot,
    handleError,
    { once: options.once },
  );
  options.messagesUnsubscribers.set(options.conversationId, unsub);
};

/**
 * Load messages with debounce and error handling
 * @param {LoadMessagesOptions} options - Messages load options
 * @returns {void}
 * @description
 * Forwards `once` through the full loader chain so warmup flows and interactive flows
 * share the same snapshot pipeline with different listener lifetimes.
 */
export const loadMessages = (options: LoadMessagesOptions): void => {
  const { conversationId, messagesDebounceTimers, messagesRetryCounters, patchState, debounceMs } =
    options;

  clearMessageTimer(messagesDebounceTimers, conversationId);

  const timer = setTimeout(() => {
    messagesRetryCounters.set(conversationId, 0);
    try {
      setupMessageSubscription(options);
    } catch (error: unknown) {
      logError('setupMessagesListener', error);
      patchState({ error: getErrorMessage(error) });
    }
  }, debounceMs);

  messagesDebounceTimers.set(conversationId, timer);
};
