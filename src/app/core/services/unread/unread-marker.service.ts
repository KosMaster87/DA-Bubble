/**
 * @fileoverview Unread Marker Service
 * @description Marks conversations and threads as read in Firestore
 * @module core/services/unread
 */

import { Injectable, InjectionToken, inject } from '@angular/core';
import { Firestore, doc, serverTimestamp, updateDoc } from '@angular/fire/firestore';
import { AuthStore } from '@stores/auth';

export interface UnreadMarkerFirestoreOps {
  doc: typeof doc;
  serverTimestamp: typeof serverTimestamp;
  updateDoc: typeof updateDoc;
}

/**
 * Injectable Firestore operation boundary for read-marker writes.
 *
 * Why this token exists:
 * It keeps write orchestration testable without monkey-patching AngularFire globals.
 */
export const UNREAD_MARKER_FIRESTORE_OPS = new InjectionToken<UnreadMarkerFirestoreOps>(
  'UNREAD_MARKER_FIRESTORE_OPS',
  {
    providedIn: 'root',
    factory: (): UnreadMarkerFirestoreOps => ({
      doc,
      serverTimestamp,
      updateDoc,
    }),
  },
);

/**
 * Service for marking messages as read
 *
 * Why a dedicated marker service exists:
 * It centralizes all write-side unread semantics so read-side trackers can remain pure.
 */
@Injectable({
  providedIn: 'root',
})
export class UnreadMarkerService {
  private firestore = inject(Firestore);
  private authStore = inject(AuthStore);
  private firestoreOps = inject(UNREAD_MARKER_FIRESTORE_OPS);

  /**
   * Mark a channel or conversation as read
   * @description Writes the lastRead timestamp for the conversation key; also resets the persisted DM unread counter for surfaces that read explicit counts.
   * @param conversationId Channel ID or Conversation ID
   * @param isDirectMessage Whether the conversation is a direct message
   */
  async markAsRead(conversationId: string, isDirectMessage: boolean = false): Promise<void> {
    const userId = this.authStore.user()?.uid;
    if (!userId) return;

    try {
      await this.updateUserLastRead(userId, {
        [`lastRead.${conversationId}`]: this.firestoreOps.serverTimestamp(),
      });

      if (isDirectMessage) {
        await this.resetDirectMessageUnreadCount(conversationId, userId);
      }
    } catch (error: unknown) {
      this.handleError(error, 'mark as read');
    }
  }

  /**
   * Mark a specific thread as read
   * @description Writes only the thread-level lastRead key so the parent conversation’s read marker is left untouched.
   * @param conversationId Channel ID or Conversation ID
   * @param messageId Parent message ID of the thread
   * @param isDirectMessage Whether the conversation is a direct message
   */
  async markThreadAsRead(
    conversationId: string,
    messageId: string,
    isDirectMessage: boolean = false,
  ): Promise<void> {
    const userId = this.authStore.user()?.uid;
    if (!userId) return;

    try {
      const threadKey = this.buildThreadKey(conversationId, messageId);
      await this.updateUserLastRead(userId, {
        [`lastRead.${threadKey}`]: this.firestoreOps.serverTimestamp(),
      });

      if (isDirectMessage) {
        await this.resetDirectMessageUnreadCount(conversationId, userId);
      }
    } catch (error: unknown) {
      this.handleError(error, 'mark thread as read');
    }
  }

  /**
   * Mark both thread and parent message/conversation as read
   * Convenience method to prevent own messages from showing as unread
   * @description Batches all three lastRead keys in a single Firestore write to avoid partial-update races after send/reply flows.
   * @param conversationId Channel ID or Conversation ID
   * @param parentMessageId Parent message ID of the thread
   * @param isDirectMessage Whether the conversation is a direct message
   */
  async markThreadAndParentAsRead(
    conversationId: string,
    parentMessageId: string,
    isDirectMessage: boolean = false,
  ): Promise<void> {
    const userId = this.authStore.user()?.uid;
    if (!userId) return;

    try {
      const threadKey = this.buildThreadKey(conversationId, parentMessageId);
      await this.updateUserLastRead(userId, {
        [`lastRead.${parentMessageId}`]: this.firestoreOps.serverTimestamp(),
        [`lastRead.${conversationId}`]: this.firestoreOps.serverTimestamp(),
        [`lastRead.${threadKey}`]: this.firestoreOps.serverTimestamp(),
      });

      if (isDirectMessage) {
        await this.resetDirectMessageUnreadCount(conversationId, userId);
      }
    } catch (error: unknown) {
      this.handleError(error, 'mark thread and parent as read');
    }
  }

  /**
   * Build thread key for lastRead tracking
   * @description Produces the composite thread key used for consistent read-marker lookups.
   * @param conversationId Channel ID or Conversation ID
   * @param messageId Parent message ID
   * @returns Thread key in format: conversationId_thread_messageId
   */
  private buildThreadKey(conversationId: string, messageId: string): string {
    return `${conversationId}_thread_${messageId}`;
  }

  /**
   * Update user lastRead map.
   * @description Shared helper that keeps the timestamp write shape consistent across all mark-as-read variants so new variants can’t accidentally use a different field path.
   * @param userId Current user ID
   * @param payload Firestore update payload
   */
  private async updateUserLastRead(
    userId: string,
    payload: Record<string, ReturnType<typeof serverTimestamp>>,
  ): Promise<void> {
    const userRef = this.firestoreOps.doc(this.firestore, 'users', userId);
    await this.firestoreOps.updateDoc(userRef, payload);
  }

  /**
   * Reset persisted unread counter for a DM participant.
   * @description DM-only operation because channel unread badges are derived from timestamps while DM list items may display explicit numeric counts.
   * @param conversationId DM conversation ID
   * @param userId Current user ID
   */
  private async resetDirectMessageUnreadCount(
    conversationId: string,
    userId: string,
  ): Promise<void> {
    const conversationRef = this.firestoreOps.doc(
      this.firestore,
      'direct-messages',
      conversationId,
    );
    await this.firestoreOps.updateDoc(conversationRef, {
      [`unreadCount.${userId}`]: 0,
    });
  }

  /**
   * Handle Firestore errors
   * @description Silently swallows internal Firestore assertion errors (known transient issue) and logs all other failures.
   * @param error Error object
   * @param operation Operation description
   */
  private handleError(error: unknown, operation: string): void {
    // Ignore transient Firestore state errors
    if (error instanceof Error && error.message.includes('INTERNAL ASSERTION FAILED')) {
      return;
    }
    console.error(`❌ Failed to ${operation}:`, error);
  }
}
