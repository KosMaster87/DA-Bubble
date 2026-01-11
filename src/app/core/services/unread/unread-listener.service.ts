/**
 * @fileoverview Unread Listener Service
 * @description Manages real-time listener for lastRead updates from Firestore
 * @module core/services/unread
 */

import { Injectable, inject, signal, effect } from '@angular/core';
import { Firestore, doc, onSnapshot } from '@angular/fire/firestore';
import { AuthStore } from '@stores/auth';

/**
 * Service for managing real-time lastRead updates
 */
@Injectable({
  providedIn: 'root',
})
export class UnreadListenerService {
  private firestore = inject(Firestore);
  private authStore = inject(AuthStore);

  // Local cache of lastRead timestamps
  private lastReadCache = signal<Record<string, Date>>({});
  private listenerUnsubscribe: (() => void) | null = null;

  /**
   * Initialize listener - sets up real-time sync when user becomes available
   * Should be called once during app initialization
   */
  initialize(): void {
    effect(() => {
      const userId = this.authStore.user()?.uid;
      if (userId) {
        this.setupListener(userId);
      } else {
        this.cleanup();
      }
    });
  }

  /**
   * Get lastRead cache signal (read-only)
   */
  getLastReadCache() {
    return this.lastReadCache.asReadonly();
  }

  /**
   * Setup real-time listener for lastRead field in user document
   */
  private setupListener(userId: string): void {
    if (this.listenerUnsubscribe) {
      this.listenerUnsubscribe();
    }

    const userRef = doc(this.firestore, 'users', userId);
    this.listenerUnsubscribe = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const lastRead = data['lastRead'];
        if (lastRead) {
          this.updateCache(lastRead);
        }
      }
    });
  }

  /**
   * Update cache with new lastRead data
   * Convert Firestore timestamps to Dates
   */
  private updateCache(lastRead: any): void {
    const converted: Record<string, Date> = {};
    for (const key in lastRead) {
      if (lastRead[key]?.toDate) {
        converted[key] = lastRead[key].toDate();
      }
    }
    this.lastReadCache.set(converted);
  }

  /**
   * Cleanup listener and cache
   */
  private cleanup(): void {
    if (this.listenerUnsubscribe) {
      this.listenerUnsubscribe();
      this.listenerUnsubscribe = null;
    }
    this.lastReadCache.set({});
  }
}
