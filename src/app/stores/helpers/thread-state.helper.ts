/**
 * @fileoverview Thread State Helper Service
 * @description Helper functions for thread state updates
 * @module stores/thread-state-helper
 */

import { type ThreadMessage } from './../threads/thread.store';

export class ThreadStateHelper {
  /**
   * Update threads in state with new snapshot data
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
   */
  static removeThreadFromState(currentThreads: ThreadMessage[], threadId: string): ThreadMessage[] {
    return currentThreads.filter((thread) => thread.id !== threadId);
  }
}
