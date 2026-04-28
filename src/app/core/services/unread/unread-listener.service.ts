/**
 * @fileoverview Unread Listener Service
 * @description Synchronizes per-user lastRead snapshots from Firestore so unread calculations always use current backend state.
 * @module core/services/unread
 */

import { Injectable, effect, inject, signal } from '@angular/core';
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
   * @description Uses an effect to react to auth state changes: starts a Firestore listener on login and cleans up on logout.
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
   * @description Exposes the cache as readonly so consumers can derive unread state reactively without writing to the cache.
   */
  getLastReadCache() {
    return this.lastReadCache.asReadonly();
  }

  /**
   * Setup real-time listener for lastRead field in user document
   * @description Cancels any existing listener before creating a new one so switching accounts doesn’t leave orphaned subscriptions.
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
   * @description Converts all Firestore Timestamp values to JS Dates before writing to the signal so comparison logic doesn’t need to handle heterogeneous types.
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
   * @description Cancels the Firestore listener and empties the cache to prevent stale unread indicators after logout.
   */
  private cleanup(): void {
    if (this.listenerUnsubscribe) {
      this.listenerUnsubscribe();
      this.listenerUnsubscribe = null;
    }
    this.lastReadCache.set({});
  }
}
