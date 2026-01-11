/**
 * @fileoverview Unread Marker Service
 * @description Marks conversations and threads as read in Firestore
 * @module core/services/unread
 */

import { Injectable, inject } from '@angular/core';
import { Firestore, doc, updateDoc, serverTimestamp } from '@angular/fire/firestore';
import { AuthStore } from '@stores/auth';

/**
 * Service for marking messages as read
 */
@Injectable({
  providedIn: 'root',
})
export class UnreadMarkerService {
  private firestore = inject(Firestore);
  private authStore = inject(AuthStore);

  /**
   * Mark a channel or conversation as read
   * @param conversationId Channel ID or Conversation ID
   */
  async markAsRead(conversationId: string): Promise<void> {
    const userId = this.authStore.user()?.uid;
    if (!userId) return;

    try {
      const userRef = doc(this.firestore, 'users', userId);
      await updateDoc(userRef, {
        [`lastRead.${conversationId}`]: serverTimestamp(),
      });
    } catch (error: any) {
      this.handleError(error, 'mark as read');
    }
  }

  /**
   * Mark a specific thread as read
   * @param conversationId Channel ID or Conversation ID
   * @param messageId Parent message ID of the thread
   */
  async markThreadAsRead(conversationId: string, messageId: string): Promise<void> {
    const userId = this.authStore.user()?.uid;
    if (!userId) return;

    try {
      const threadKey = this.buildThreadKey(conversationId, messageId);
      const userRef = doc(this.firestore, 'users', userId);
      await updateDoc(userRef, {
        [`lastRead.${threadKey}`]: serverTimestamp(),
      });
    } catch (error: any) {
      this.handleError(error, 'mark thread as read');
    }
  }

  /**
   * Mark both thread and parent message/conversation as read
   * Convenience method to prevent own messages from showing as unread
   * @param conversationId Channel ID or Conversation ID
   * @param parentMessageId Parent message ID of the thread
   */
  async markThreadAndParentAsRead(conversationId: string, parentMessageId: string): Promise<void> {
    const userId = this.authStore.user()?.uid;
    if (!userId) return;

    try {
      const threadKey = this.buildThreadKey(conversationId, parentMessageId);
      const userRef = doc(this.firestore, 'users', userId);
      await updateDoc(userRef, {
        [`lastRead.${parentMessageId}`]: serverTimestamp(),
        [`lastRead.${conversationId}`]: serverTimestamp(),
        [`lastRead.${threadKey}`]: serverTimestamp(),
      });
    } catch (error: any) {
      this.handleError(error, 'mark thread and parent as read');
    }
  }

  /**
   * Build thread key for lastRead tracking
   * @param conversationId Channel ID or Conversation ID
   * @param messageId Parent message ID
   * @returns Thread key in format: conversationId_thread_messageId
   */
  private buildThreadKey(conversationId: string, messageId: string): string {
    return `${conversationId}_thread_${messageId}`;
  }

  /**
   * Handle Firestore errors
   * @param error Error object
   * @param operation Operation description
   */
  private handleError(error: any, operation: string): void {
    // Ignore transient Firestore state errors
    if (error?.message?.includes('INTERNAL ASSERTION FAILED')) {
      return;
    }
    console.error(`❌ Failed to ${operation}:`, error);
  }
}
