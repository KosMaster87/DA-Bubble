/**
 * @fileoverview Channel Message Listener Service
 * @description Manages Firestore real-time listeners and retry logic for channel messages
 * @module core/services/channel-message-listener
 */

import { Injectable, inject } from '@angular/core';
import { Firestore, query, orderBy, limit, onSnapshot, Unsubscribe, QuerySnapshot, DocumentData } from '@angular/fire/firestore';
import { Message } from '@core/models/message.model';
import { ChannelMessageOperationsService } from '../channel-message-operations/channel-message-operations.service';

export interface SnapshotResult {
  messages: Message[];
  snapshot: QuerySnapshot<DocumentData>;
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
   * @param onSuccess - Success callback with messages and snapshot
   * @param onError - Error callback
   */
  setupListener = (
    channelId: string,
    onSuccess: (messages: Message[], snapshot: QuerySnapshot<DocumentData>) => void,
    onError: (error: string) => void
  ): void => {
    this.clearDebounceTimer(channelId);
    this.scheduleListenerSetup(channelId, onSuccess, onError);
  };

  /**
   * Clear debounce timer for channel
   * @param channelId - Channel ID
   */
  private clearDebounceTimer = (channelId: string): void => {
    const existingTimer = this.debounceTimers.get(channelId);
    if (existingTimer) clearTimeout(existingTimer);
  };

  /**
   * Schedule listener setup after debounce
   * @param channelId - Channel ID
   * @param onSuccess - Success callback
   * @param onError - Error callback
   */
  private scheduleListenerSetup = (
    channelId: string,
    onSuccess: (messages: Message[], snapshot: QuerySnapshot<DocumentData>) => void,
    onError: (error: string) => void
  ): void => {
    const timer = setTimeout(() => {
      this.initializeListener(channelId, onSuccess, onError);
    }, this.DEBOUNCE_MS);
    this.debounceTimers.set(channelId, timer);
  };

  /**
   * Initialize listener for channel
   * @param channelId - Channel ID
   * @param onSuccess - Success callback
   * @param onError - Error callback
   */
  private initializeListener = (
    channelId: string,
    onSuccess: (messages: Message[], snapshot: QuerySnapshot<DocumentData>) => void,
    onError: (error: string) => void
  ): void => {
    this.clearExistingListener(channelId);
    this.retryCounters.set(channelId, 0);
    const unsubscribe = this.createListener(channelId, onSuccess, onError);
    this.messageListeners.set(channelId, unsubscribe);
    this.debounceTimers.delete(channelId);
  };

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
    onSuccess: (messages: Message[], snapshot: QuerySnapshot<DocumentData>) => void,
    onError: (error: string) => void
  ): Unsubscribe => {
    const q = this.buildMessagesQuery(channelId);
    return this.attachSnapshotListener(q, channelId, onSuccess, onError);
  };

  /**
   * Build Firestore query for messages
   * @param channelId - Channel ID
   * @returns Firestore query
   */
  private buildMessagesQuery = (channelId: string): any => {
    const messagesRef = this.operations.getMessagesCollectionRef(channelId);
    return query(messagesRef, orderBy('createdAt', 'asc'), limit(100));
  };

  /**
   * Attach snapshot listener to query
   * @param q - Firestore query
   * @param channelId - Channel ID
   * @param onSuccess - Success callback
   * @param onError - Error callback
   * @returns Unsubscribe function
   */
  private attachSnapshotListener = (
    q: any,
    channelId: string,
    onSuccess: (messages: Message[], snapshot: QuerySnapshot<DocumentData>) => void,
    onError: (error: string) => void
  ): Unsubscribe => {
    return onSnapshot(
      q,
      (snapshot: QuerySnapshot<DocumentData>) => this.handleSnapshotSuccess(snapshot, channelId, onSuccess),
      (error: any) => this.handleListenerError(error, channelId, onError, onSuccess)
    );
  };

  /**
   * Handle successful snapshot
   * @param snapshot - Firestore snapshot
   * @param channelId - Channel ID
   * @param onSuccess - Success callback
   */
  private handleSnapshotSuccess = (
    snapshot: QuerySnapshot<DocumentData>,
    channelId: string,
    onSuccess: (messages: Message[], snapshot: QuerySnapshot<DocumentData>) => void
  ): void => {
    this.clearDebounceTimer(`snapshot-${channelId}`);
    this.scheduleSnapshotProcessing(snapshot, channelId, onSuccess);
  };

  /**
   * Schedule snapshot processing after debounce
   * @param snapshot - Firestore snapshot
   * @param channelId - Channel ID
   * @param onSuccess - Success callback
   */
  private scheduleSnapshotProcessing = (
    snapshot: QuerySnapshot<DocumentData>,
    channelId: string,
    onSuccess: (messages: Message[], snapshot: QuerySnapshot<DocumentData>) => void
  ): void => {
    const timer = setTimeout(() => {
      this.processSnapshot(snapshot, channelId, onSuccess);
    }, 50);
    this.debounceTimers.set(`snapshot-${channelId}`, timer);
  };

  /**
   * Process snapshot and trigger callback
   * @param snapshot - Firestore snapshot
   * @param channelId - Channel ID
   * @param onSuccess - Success callback
   */
  private processSnapshot = (
    snapshot: QuerySnapshot<DocumentData>,
    channelId: string,
    onSuccess: (messages: Message[], snapshot: QuerySnapshot<DocumentData>) => void
  ): void => {
    const messages = this.mapSnapshot(snapshot);
    onSuccess(messages, snapshot);
    this.retryCounters.set(channelId, 0);
    this.debounceTimers.delete(`snapshot-${channelId}`);
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
    onSuccess: (messages: Message[], snapshot: QuerySnapshot<DocumentData>) => void
  ): void => {
    if (this.isFirestoreStateError(error)) {
      this.handleFirestoreStateError(error, channelId, onSuccess, onError);
    } else if (this.isPermissionError(error)) {
      this.handlePermissionError(channelId);
    } else {
      onError(error.message || 'Failed to load channel messages');
    }
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
    onSuccess: (messages: Message[], snapshot: QuerySnapshot<DocumentData>) => void,
    onError: (msg: string) => void
  ): void => {
    const retryCount = this.retryCounters.get(channelId) || 0;
    if (retryCount < this.MAX_RETRIES) {
      this.scheduleRetryAttempt(channelId, retryCount, onSuccess, onError);
    } else {
      this.logMaxRetriesReached(channelId);
    }
  };

  /**
   * Schedule retry attempt
   * @param channelId - Channel ID
   * @param retryCount - Current retry count
   * @param onSuccess - Success callback
   * @param onError - Error callback
   */
  private scheduleRetryAttempt = (
    channelId: string,
    retryCount: number,
    onSuccess: (messages: Message[], snapshot: QuerySnapshot<DocumentData>) => void,
    onError: (msg: string) => void
  ): void => {
    this.retryCounters.set(channelId, retryCount + 1);
    this.logRetryAttempt(channelId, retryCount);
    setTimeout(() => {
      this.retryListener(channelId, onSuccess, onError);
    }, 500 * (retryCount + 1));
  };

  /**
   * Retry listener setup
   * @param channelId - Channel ID
   * @param onSuccess - Success callback
   * @param onError - Error callback
   */
  private retryListener = (
    channelId: string,
    onSuccess: (messages: Message[], snapshot: QuerySnapshot<DocumentData>) => void,
    onError: (msg: string) => void
  ): void => {
    this.clearExistingListener(channelId);
    const unsubscribe = this.createListener(channelId, onSuccess, onError);
    this.messageListeners.set(channelId, unsubscribe);
  };

  /**
   * Log retry attempt
   * @param channelId - Channel ID
   * @param retryCount - Current retry count
   */
  private logRetryAttempt = (channelId: string, retryCount: number): void => {
    console.warn(
      `⚠️ Firestore state error for channel ${channelId} (${retryCount + 1}/${this.MAX_RETRIES}) - retrying...`
    );
  };

  /**
   * Log max retries reached
   * @param channelId - Channel ID
   */
  private logMaxRetriesReached = (channelId: string): void => {
    console.warn(`⚠️ Max retries reached for channel ${channelId}, ignoring error`);
    this.retryCounters.delete(channelId);
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
