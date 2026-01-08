/**
 * @fileoverview Channel Message Listener Service
 * @description Manages Firestore real-time listeners and retry logic for channel messages
 * @module core/services/channel-message-listener
 */

import { Injectable, inject } from '@angular/core';
import { Firestore, query, orderBy, onSnapshot, Unsubscribe } from '@angular/fire/firestore';
import { Message } from '@core/models/message.model';
import { ChannelMessageOperationsService } from '../channel-message-operations/channel-message-operations.service';

export interface SnapshotResult {
  messages: Message[];
  error?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ChannelMessageListenerService {
  private firestore = inject(Firestore);
  private operations = inject(ChannelMessageOperationsService);
  private messageListeners = new Map<string, Unsubscribe>();
  private pendingRetries = new Set<string>();
  private debounceTimers = new Map<string, any>();
  private retryCounters = new Map<string, number>();
  private readonly MAX_RETRIES = 3;
  private readonly DEBOUNCE_MS = 100;

  /**
   * Setup real-time listener for channel messages
   * @param channelId - Channel ID
   * @param onSuccess - Success callback with messages
   * @param onError - Error callback
   */
  setupListener(
    channelId: string,
    onSuccess: (messages: Message[]) => void,
    onError: (error: string) => void
  ): void {
    const existingTimer = this.debounceTimers.get(channelId);
    if (existingTimer) clearTimeout(existingTimer);

    const timer = setTimeout(() => {
      this.clearExistingListener(channelId);
      this.retryCounters.set(channelId, 0);
      const unsubscribe = this.createListener(channelId, onSuccess, onError);
      this.messageListeners.set(channelId, unsubscribe);
      this.debounceTimers.delete(channelId);
    }, this.DEBOUNCE_MS);

    this.debounceTimers.set(channelId, timer);
  }

  /**
   * Clear existing listener for channel
   * @param channelId - Channel ID
   */
  private clearExistingListener = (channelId: string): void => {
    const existingListener = this.messageListeners.get(channelId);
    if (existingListener) {
      existingListener();
      this.messageListeners.delete(channelId);
    }
  };

  /**
   * Create Firestore snapshot listener
   * @param channelId - Channel ID
   * @param onSuccess - Success callback
   * @param onError - Error callback
   * @returns Unsubscribe function
   */
  private createListener = (
    channelId: string,
    onSuccess: (messages: Message[]) => void,
    onError: (error: string) => void
  ): Unsubscribe => {
    const messagesRef = this.operations.getMessagesCollectionRef(channelId);
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const existingTimer = this.debounceTimers.get(`snapshot-${channelId}`);
        if (existingTimer) clearTimeout(existingTimer);

        const timer = setTimeout(() => {
          const messages = this.mapSnapshot(snapshot);
          onSuccess(messages);
          this.retryCounters.set(channelId, 0);
          this.debounceTimers.delete(`snapshot-${channelId}`);
        }, 50);

        this.debounceTimers.set(`snapshot-${channelId}`, timer);
      },
      (error: any) => this.handleListenerError(error, channelId, onError, onSuccess)
    );
  };

  /**
   * Map Firestore snapshot to messages array
   * @param snapshot - Firestore query snapshot
   * @returns Array of messages
   */
  private mapSnapshot = (snapshot: any): Message[] => {
    return snapshot.docs.map((doc: any) => {
      return this.operations.mapMessageDocument(doc.id, doc.data());
    });
  };

  /**
   * Handle Firestore listener errors
   * @param error - Error object
   * @param channelId - Channel ID
   * @param onError - Error callback
   * @param onSuccess - Success callback for retry
   */
  private handleListenerError = (
    error: any,
    channelId: string,
    onError: (msg: string) => void,
    onSuccess: (messages: Message[]) => void
  ): void => {
    if (this.isFirestoreStateError(error)) {
      this.handleFirestoreStateError(error, channelId, onSuccess, onError);
      return;
    }

    if (this.isPermissionError(error)) {
      this.handlePermissionError(channelId);
      return;
    }

    onError(error.message || 'Failed to load channel messages');
  };

  /**
   * Handle Firestore internal state errors
   * @param error - Error object
   * @param channelId - Channel ID
   * @param onSuccess - Success callback for retry
   * @param onError - Error callback
   */
  private handleFirestoreStateError = (
    error: any,
    channelId: string,
    onSuccess: (messages: Message[]) => void,
    onError: (msg: string) => void
  ): void => {
    const retryCount = this.retryCounters.get(channelId) || 0;

    if (retryCount < this.MAX_RETRIES) {
      this.retryCounters.set(channelId, retryCount + 1);
      console.warn(
        `⚠️ Firestore state error for channel ${channelId} (${retryCount + 1}/${this.MAX_RETRIES}) - retrying...`
      );

      setTimeout(() => {
        this.clearExistingListener(channelId);
        const unsubscribe = this.createListener(channelId, onSuccess, onError);
        this.messageListeners.set(channelId, unsubscribe);
      }, 500 * (retryCount + 1));
    } else {
      console.warn(`⚠️ Max retries reached for channel ${channelId}, ignoring error`);
      this.retryCounters.delete(channelId);
    }
  };

  /**
   * Check if error is permission-related
   * @param error - Error object
   * @returns True if permission error
   */
  private isPermissionError = (error: any): boolean => {
    return error.code === 'permission-denied' || error.message?.includes('permissions');
  };

  /**
   * Check if error is Firestore internal state error
   * @param error - Error object
   * @returns True if state error
   */
  private isFirestoreStateError = (error: any): boolean => {
    const message = error?.message || '';
    return (
      message.includes('INTERNAL ASSERTION FAILED') ||
      message.includes('Unexpected state') ||
      message.includes('ID: ca9') ||
      message.includes('ID: b815') ||
      message.includes('BloomFilter')
    );
  };

  /**
   * Handle permission-denied errors
   * @param channelId - Channel ID
   */
  private handlePermissionError = (channelId: string): void => {
    this.clearExistingListener(channelId);
    this.scheduleRetry(channelId);
  };

  /**
   * Schedule retry for channel subscription
   * @param channelId - Channel ID
   */
  private scheduleRetry = (channelId: string): void => {
    if (this.pendingRetries.has(channelId)) {
      return;
    }
    this.pendingRetries.add(channelId);
    // Retry disabled - uncomment if needed
    // setTimeout(() => {
    //   this.pendingRetries.delete(channelId);
    //   this.setupListener(channelId, onSuccess, onError);
    // }, 3000);
  };

  /**
   * Clear all active listeners
   */
  clearAllListeners = (): void => {
    this.messageListeners.forEach((unsubscribe) => unsubscribe());
    this.messageListeners.clear();
    this.pendingRetries.clear();
  };
}
