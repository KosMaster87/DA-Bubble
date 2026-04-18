/**
 * @fileoverview Thread Store Helpers
 * @description Helper functions for thread store orchestration methods
 * @module stores/thread-store-helpers
 */

import { type ThreadMessage } from './../threads/thread.store';

export interface ThreadListenerContext {
  channelId: string;
  messageId: string;
  isDirectMessage?: boolean;
  once?: boolean;
}

export interface ThreadRetryController {
  isPermissionError: (error: unknown) => boolean;
  scheduleRetry: (listenerKey: string, retryFn: () => void) => void;
}

/**
 * Build Firestore path segments for a thread message document.
 */
export const buildThreadDocumentPath = (
  channelId: string,
  parentMessageId: string,
  threadId: string,
  isDirectMessage: boolean,
): string[] => {
  if (isDirectMessage) {
    return ['direct-messages', channelId, 'messages', parentMessageId, 'threads', threadId];
  }

  return ['channels', channelId, 'messages', parentMessageId, 'threads', threadId];
};

/**
 * Merge updated message threads into thread state record.
 */
export const mergeMessageThreads = (
  currentThreads: Record<string, ThreadMessage[]>,
  messageId: string,
  messageThreads: ThreadMessage[],
): Record<string, ThreadMessage[]> => ({
  ...currentThreads,
  [messageId]: messageThreads,
});

/**
 * Retry listener registration for transient permission errors.
 */
export const retryThreadListenerOnPermissionError = (
  retryController: ThreadRetryController,
  error: unknown,
  listenerKey: string,
  retryFn: () => void,
): boolean => {
  if (!retryController.isPermissionError(error)) {
    return false;
  }

  retryController.scheduleRetry(listenerKey, retryFn);
  return true;
};
