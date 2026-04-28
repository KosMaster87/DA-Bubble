/**
 * @fileoverview Thread State Helper Service
 * @description Helper functions for thread state updates
 * @module stores/thread-state-helper
 */

import { type ThreadMessage } from './../threads/thread.store';

export class ThreadStateHelper {
  /**
   * Update threads in state with new snapshot data
   * @description Replaces the full thread array for a message ID so stale entries are not retained after a Firestore snapshot update.
   */
  static updateThreadsFromSnapshot(
    currentState: Record<string, ThreadMessage[]>,
    messageId: string,
    threads: ThreadMessage[],
  ): Record<string, ThreadMessage[]> {
    return {
      ...currentState,
      [messageId]: threads,
    };
  }

  /**
   * Update single thread in local state
   * @description Applies an optimistic edit by mapping over the thread array and stamping updatedAt and isEdited on the matched entry.
   */
  static updateThreadInState(
    currentThreads: ThreadMessage[],
    threadId: string,
    updates: Partial<ThreadMessage>,
  ): ThreadMessage[] {
    return currentThreads.map((thread) =>
      thread.id === threadId
        ? { ...thread, ...updates, updatedAt: new Date(), isEdited: true }
        : thread,
    );
  }

  /**
   * Remove thread from state
   * @description Filters out a thread by ID for optimistic deletion so the UI reflects the removal immediately without waiting for a snapshot.
   */
  static removeThreadFromState(currentThreads: ThreadMessage[], threadId: string): ThreadMessage[] {
    return currentThreads.filter((thread) => thread.id !== threadId);
  }
}
