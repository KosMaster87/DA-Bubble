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
      console.log('✅ Marked as read:', conversationId);
    } catch (error) {
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
   * Check if conversation has unread THREAD messages
   * @param conversationId Channel ID or Conversation ID
   * @param lastThreadTimestamp Last thread message timestamp (from any message in conversation)
   * @returns true if thread messages are unread
   */
  hasThreadUnread(conversationId: string, lastThreadTimestamp?: Date): boolean {
    if (!lastThreadTimestamp) return false;

    const lastRead = this.lastReadCache()[conversationId];
    if (!lastRead) return true; // Never read

    return lastThreadTimestamp > lastRead;
  }
}
