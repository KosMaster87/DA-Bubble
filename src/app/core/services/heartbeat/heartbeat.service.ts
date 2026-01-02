/**
 * @fileoverview Heartbeat Service for tracking user presence
 * @description Updates Firestore with periodic heartbeats to detect disconnections
 */

import { Injectable, inject, effect } from '@angular/core';
import { Firestore, doc, updateDoc, serverTimestamp } from '@angular/fire/firestore';
import { AuthStore } from '@stores/auth';

@Injectable({
  providedIn: 'root',
})
export class HeartbeatService {
  private firestore = inject(Firestore);
  private authStore = inject(AuthStore);
  private heartbeatInterval?: ReturnType<typeof setInterval>;
  private readonly HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds

  constructor() {
    /**
     * Start/stop heartbeat based on login status
     */
    effect(() => {
      const isLoggedIn = this.authStore.isLoggedIn();
      const user = this.authStore.user();

      if (isLoggedIn && user?.uid) {
        this.startHeartbeat(user.uid);
      } else {
        this.stopHeartbeat();
      }
    });
  }

  /**
   * Start sending periodic heartbeats to Firestore
   * @param userId - The user's UID
   */
  private startHeartbeat(userId: string): void {
    // Clear any existing interval
    this.stopHeartbeat();

    // Send initial heartbeat immediately
    this.sendHeartbeat(userId);

    // Set up periodic heartbeat
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat(userId);
    }, this.HEARTBEAT_INTERVAL_MS);
  }

  /**
   * Stop sending heartbeats
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }

  /**
   * Send a single heartbeat update to Firestore
   * @param userId - The user's UID
   */
  private async sendHeartbeat(userId: string): Promise<void> {
    try {
      const userDocRef = doc(this.firestore, 'users', userId);
      await updateDoc(userDocRef, {
        lastHeartbeat: serverTimestamp(),
        isOnline: true,
      });
    } catch (error) {
      console.error('❌ Heartbeat update failed:', error);
    }
  }

  /**
   * Cleanup on service destroy
   */
  ngOnDestroy(): void {
    this.stopHeartbeat();
  }
}
