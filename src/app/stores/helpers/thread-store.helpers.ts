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
 * @description Returns path segments as an array so ReactionService.getMessageRef can spread them, avoiding string concatenation at each call site.
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
 * @description Immutably merges a single message's thread array into the record so only that message's computed signals re-evaluate.
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
 * @description Centralises the permission-error retry decision so both channel and DM thread listeners use the same backoff strategy.
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
