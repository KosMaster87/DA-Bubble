/**
 * @fileoverview Unread Messages Service
 * @description Tracks unread messages for channels and direct messages
 * @module UnreadService
 */

import { Injectable, inject, signal, effect } from '@angular/core';
import { Firestore, doc, updateDoc, serverTimestamp, onSnapshot } from '@angular/fire/firestore';
import { AuthStore } from '@stores/auth';

@Injectable({
  providedIn: 'root',
})
export class UnreadService {
  private firestore = inject(Firestore);
  private authStore = inject(AuthStore);

  // Local cache of lastRead timestamps to avoid infinite loops
  private lastReadCache = signal<Record<string, Date>>({});
  private listenerUnsubscribe: (() => void) | null = null;

  constructor() {
    // Setup real-time listener for lastRead updates when user becomes available
    effect(() => {
      const userId = this.authStore.user()?.uid;
      if (userId) {
        this.setupLastReadListener(userId);
      } else {
        // Cleanup listener when user logs out
        if (this.listenerUnsubscribe) {
          this.listenerUnsubscribe();
          this.listenerUnsubscribe = null;
        }
        this.lastReadCache.set({});
      }
    });
  }

  /**
   * Setup real-time listener for lastRead field in user document
   */
  private setupLastReadListener(userId: string): void {
    if (this.listenerUnsubscribe) {
      this.listenerUnsubscribe();
    }

    const userRef = doc(this.firestore, 'users', userId);
    this.listenerUnsubscribe = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const lastRead = data['lastRead'];
        if (lastRead) {
          // Convert Firestore timestamps to Dates
          const converted: Record<string, Date> = {};
          for (const key in lastRead) {
            if (lastRead[key]?.toDate) {
              converted[key] = lastRead[key].toDate();
            }
          }
          this.lastReadCache.set(converted);
        }
      }
    });
  }

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
      // Ignore transient Firestore state errors
      if (error?.message?.includes('INTERNAL ASSERTION FAILED')) {
        console.log('⏭️  Skipping mark-as-read due to temporary Firestore state');
        return;
      }
      console.error('❌ Failed to mark as read:', error);
    }
  }

  /**
   * Check if conversation has unread messages
   * @param conversationId Channel ID or Conversation ID
   * @param lastMessageAt Last message timestamp in conversation
   * @returns true if unread
   */
  hasUnread(conversationId: string, lastMessageAt?: Date): boolean {
    if (!lastMessageAt) return false;

    const lastRead = this.lastReadCache()[conversationId];
    if (!lastRead) return true; // Never read

    return lastMessageAt > lastRead;
  }

  /**
   * Check if a specific thread has unread messages
   * Uses per-thread tracking: conversationId_thread_messageId
   * @param conversationId Channel ID or Conversation ID
   * @param messageId Parent message ID of the thread
   * @param lastThreadTimestamp Last thread activity timestamp
   * @returns true if this specific thread has unread messages
   */
  hasThreadUnread(conversationId: string, messageId: string, lastThreadTimestamp?: Date): boolean {
    if (!lastThreadTimestamp) return false;

    const threadKey = `${conversationId}_thread_${messageId}`;
    const lastRead = this.lastReadCache()[threadKey];
    if (!lastRead) return true; // Never read

    return lastThreadTimestamp > lastRead;
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
      const userRef = doc(this.firestore, 'users', userId);
      await updateDoc(userRef, {
        [`lastRead.${conversationId}_thread_${messageId}`]: serverTimestamp(),
      });
      console.log(`✅ Marked thread as read: ${conversationId}/${messageId}`);
    } catch (error) {
      console.error('❌ Failed to mark thread as read:', error);
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
      const userRef = doc(this.firestore, 'users', userId);
      await updateDoc(userRef, {
        [`lastRead.${parentMessageId}`]: serverTimestamp(),
        [`lastRead.${conversationId}`]: serverTimestamp(),
        [`lastRead.${conversationId}_thread_${parentMessageId}`]: serverTimestamp(),
      });
      console.log(`✅ Marked thread and parent as read: ${conversationId}/${parentMessageId}`);
    } catch (error: any) {
      // Ignore transient Firestore state errors
      if (error?.message?.includes('INTERNAL ASSERTION FAILED')) {
        console.log('⏭️  Skipping mark-as-read due to temporary Firestore state');
        return;
      }
      console.error('❌ Failed to mark thread and parent as read:', error);
    }
  }
}
