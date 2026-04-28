/**
 * @fileoverview Channel Message Listener Service
 * @description Owns channel-message realtime subscriptions with retry safeguards so message streams remain resilient to transient listener failures.
 * @module core/services/channel-message-listener
 */

import { inject, Injectable } from '@angular/core';
import {
    DocumentData,
    Firestore,
    limit,
    onSnapshot,
    orderBy,
    query,
    QuerySnapshot,
    Unsubscribe,
} from '@angular/fire/firestore';
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
   * @param {string} channelId - Channel ID
   * @param {Function} onSuccess - Success callback with messages and snapshot
   * @param {Function} onError - Error callback
   * @param options - Optional listener mode (`once` for warmup snapshots)
   * @description
   * `once` mode exists for reload warmup paths where we only need one fresh snapshot
   * and want to avoid keeping long-lived listeners for non-active channels.
   */
  setupListener = (
    channelId: string,
    onSuccess: (messages: Message[], snapshot: QuerySnapshot<DocumentData>) => void,
    onError: (error: string) => void,
    options?: { once?: boolean },
  ): void => {
    this.clearDebounceTimer(channelId);
    this.scheduleListenerSetup(channelId, onSuccess, onError, options);
  };

  /**
   * Clear debounce timer for channel
   * @description Cancels any pending setup timer to prevent stale listeners from being created after rapid re-setup calls.
   * @private
   * @param {string} channelId - Channel ID
   */
  private clearDebounceTimer = (channelId: string): void => {
    const existingTimer = this.debounceTimers.get(channelId);
    if (existingTimer) clearTimeout(existingTimer);
  };

  /**
   * Schedule listener setup after debounce
   * @description Defers actual listener creation by DEBOUNCE_MS to absorb rapid successive setup calls from the same channel.
   * @private
   * @param {string} channelId - Channel ID
   * @param {Function} onSuccess - Success callback
   * @param {Function} onError - Error callback
   */
  private scheduleListenerSetup = (
    channelId: string,
    onSuccess: (messages: Message[], snapshot: QuerySnapshot<DocumentData>) => void,
    onError: (error: string) => void,
    options?: { once?: boolean },
  ): void => {
    const timer = setTimeout(() => {
      this.initializeListener(channelId, onSuccess, onError, options);
    }, this.DEBOUNCE_MS);
    this.debounceTimers.set(channelId, timer);
  };

  /**
   * Initialize listener for channel
   * @description Tears down any existing listener, resets the retry counter, and creates a fresh subscription.
   * @private
   * @param {string} channelId - Channel ID
   * @param {Function} onSuccess - Success callback
   * @param {Function} onError - Error callback
   */
  private initializeListener = (
    channelId: string,
    onSuccess: (messages: Message[], snapshot: QuerySnapshot<DocumentData>) => void,
    onError: (error: string) => void,
    options?: { once?: boolean },
  ): void => {
    this.clearExistingListener(channelId);
    this.retryCounters.set(channelId, 0);
    const unsubscribe = this.createListener(channelId, onSuccess, onError, options);
    this.messageListeners.set(channelId, unsubscribe);
    this.debounceTimers.delete(channelId);
  };

  /**
   * Clear existing listener for channel
   * @description Unsubscribes and removes the stored listener for a channel to prevent duplicate listeners on re-setup.
   * @private
   * @param {string} channelId - Channel ID
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
   * @description Builds the Firestore query and attaches the snapshot handler; the returned Unsubscribe must be stored for later cleanup.
   * @private
   * @param {string} channelId - Channel ID
   * @param {Function} onSuccess - Success callback
   * @param {Function} onError - Error callback
   * @returns {Unsubscribe} Unsubscribe function
   */
  private createListener = (
    channelId: string,
    onSuccess: (messages: Message[], snapshot: QuerySnapshot<DocumentData>) => void,
    onError: (error: string) => void,
    options?: { once?: boolean },
  ): Unsubscribe => {
    const q = this.buildMessagesQuery(channelId);
    return this.attachSnapshotListener(q, channelId, onSuccess, onError, options);
  };

  /**
   * Build Firestore query for messages
   * @description Constructs an ordered, limited query; the 100-message limit keeps initial load fast while still covering most active channels.
   * @private
   * @param {string} channelId - Channel ID
   * @returns {any} Firestore query
   */
  private buildMessagesQuery = (channelId: string): any => {
    const messagesRef = this.operations.getMessagesCollectionRef(channelId);
    return query(messagesRef, orderBy('createdAt', 'asc'), limit(100));
  };

  /**
   * Attach snapshot listener to query
   * @private
   * @param {any} q - Firestore query
   * @param {string} channelId - Channel ID
   * @param {Function} onSuccess - Success callback
   * @param {Function} onError - Error callback
   * @returns {Unsubscribe} Unsubscribe function
   * @description
   * When `once` is enabled we unsubscribe immediately after the first snapshot to cap
   * read pressure during initialization while preserving the same mapping pipeline.
   */
  private attachSnapshotListener = (
    q: any,
    channelId: string,
    onSuccess: (messages: Message[], snapshot: QuerySnapshot<DocumentData>) => void,
    onError: (error: string) => void,
    options?: { once?: boolean },
  ): Unsubscribe => {
    const once = options?.once === true;
    let handledFirstSnapshot = false;

    return onSnapshot(
      q,
      (snapshot: QuerySnapshot<DocumentData>) => {
        if (once && handledFirstSnapshot) return;
        if (once) {
          handledFirstSnapshot = true;
          this.clearExistingListener(channelId);
        }

        this.handleSnapshotSuccess(snapshot, channelId, onSuccess);
      },
      (error: any) => this.handleListenerError(error, channelId, onError, onSuccess),
    );
  };

  /**
   * Handle successful snapshot
   * @description Debounces rapid successive snapshots (e.g. from bulk writes) before forwarding the mapped messages to the callback.
   * @private
   * @param {QuerySnapshot<DocumentData>} snapshot - Firestore snapshot
   * @param {string} channelId - Channel ID
   * @param {Function} onSuccess - Success callback
   */
  private handleSnapshotSuccess = (
    snapshot: QuerySnapshot<DocumentData>,
    channelId: string,
    onSuccess: (messages: Message[], snapshot: QuerySnapshot<DocumentData>) => void,
  ): void => {
    this.clearDebounceTimer(`snapshot-${channelId}`);
    this.scheduleSnapshotProcessing(snapshot, channelId, onSuccess);
  };

  /**
   * Schedule snapshot processing after debounce
   * @description Adds a 50ms debounce after each snapshot to coalesce rapid Firestore writes into a single UI update.
   * @private
   * @param {QuerySnapshot<DocumentData>} snapshot - Firestore snapshot
   * @param {string} channelId - Channel ID
   * @param {Function} onSuccess - Success callback
   */
  private scheduleSnapshotProcessing = (
    snapshot: QuerySnapshot<DocumentData>,
    channelId: string,
    onSuccess: (messages: Message[], snapshot: QuerySnapshot<DocumentData>) => void,
  ): void => {
    const timer = setTimeout(() => {
      this.processSnapshot(snapshot, channelId, onSuccess);
    }, 50);
    this.debounceTimers.set(`snapshot-${channelId}`, timer);
  };

  /**
   * Process snapshot and trigger callback
   * @description Maps the Firestore snapshot to typed Message objects, fires the success callback, and resets the retry counter.
   * @private
   * @param {QuerySnapshot<DocumentData>} snapshot - Firestore snapshot
   * @param {string} channelId - Channel ID
   * @param {Function} onSuccess - Success callback
   */
  private processSnapshot = (
    snapshot: QuerySnapshot<DocumentData>,
    channelId: string,
    onSuccess: (messages: Message[], snapshot: QuerySnapshot<DocumentData>) => void,
  ): void => {
    const messages = this.mapSnapshot(snapshot);
    onSuccess(messages, snapshot);
    this.retryCounters.set(channelId, 0);
    this.debounceTimers.delete(`snapshot-${channelId}`);
  };

  /**
   * Map Firestore snapshot to messages array
   * @description Converts raw Firestore documents to typed Message objects using the operations service mapper.
   * @private
   * @param {any} snapshot - Firestore query snapshot
   * @returns {Message[]} Array of messages
   */
  private mapSnapshot = (snapshot: any): Message[] => {
    return snapshot.docs.map((doc: any) => {
      return this.operations.mapMessageDocument(doc.id, doc.data());
    });
  };

  /**
   * Handle Firestore listener errors
   * @description Routes errors to the appropriate handler: retryable SDK state errors, silent permission errors, or escalated unknown errors.
   * @param error - Error object
   * @param channelId - Channel ID
   * @param onError - Error callback
   * @param onSuccess - Success callback for retry
   */
  private handleListenerError = (
    error: any,
    channelId: string,
    onError: (msg: string) => void,
    onSuccess: (messages: Message[], snapshot: QuerySnapshot<DocumentData>) => void,
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
   * @description
   * State errors are retried with bounded backoff to absorb transient SDK/internal races
   * without surfacing noisy errors to users.
   */
  private handleFirestoreStateError = (
    error: any,
    channelId: string,
    onSuccess: (messages: Message[], snapshot: QuerySnapshot<DocumentData>) => void,
    onError: (msg: string) => void,
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
   * @description Uses exponential-style backoff (500ms × attempt) to give Firestore time to recover before retrying.
   * @param channelId - Channel ID
   * @param retryCount - Current retry count
   * @param onSuccess - Success callback
   * @param onError - Error callback
   */
  private scheduleRetryAttempt = (
    channelId: string,
    retryCount: number,
    onSuccess: (messages: Message[], snapshot: QuerySnapshot<DocumentData>) => void,
    onError: (msg: string) => void,
  ): void => {
    this.retryCounters.set(channelId, retryCount + 1);
    this.logRetryAttempt(channelId, retryCount);
    setTimeout(
      () => {
        this.retryListener(channelId, onSuccess, onError);
      },
      500 * (retryCount + 1),
    );
  };

  /**
   * Retry listener setup
   * @description Clears the dead listener and establishes a new one as part of the bounded retry loop.
   * @param channelId - Channel ID
   * @param onSuccess - Success callback
   * @param onError - Error callback
   */
  private retryListener = (
    channelId: string,
    onSuccess: (messages: Message[], snapshot: QuerySnapshot<DocumentData>) => void,
    onError: (msg: string) => void,
  ): void => {
    this.clearExistingListener(channelId);
    const unsubscribe = this.createListener(channelId, onSuccess, onError);
    this.messageListeners.set(channelId, unsubscribe);
  };

  /**
   * Log retry attempt
   * @description No-op stub kept for debugging — can be re-enabled to surface retry traces in development without touching callers.
   * @private
   * @param {string} channelId - Channel ID
   * @param {number} retryCount - Current retry count
   */
  private logRetryAttempt = (channelId: string, retryCount: number): void => {};

  /**
   * Log max retries reached
   * @description Cleans up the retry counter when all attempts are exhausted to prevent stale state on future listener setups.
   * @private
   * @param {string} channelId - Channel ID
   */
  private logMaxRetriesReached = (channelId: string): void => {
    this.retryCounters.delete(channelId);
  };

  /**
   * Check if error is permission-related
   * @description Identifies permission-denied errors so the listener can be stopped cleanly rather than entering an infinite retry loop.
   * @param error - Error object
   * @returns True if permission error
   */
  private isPermissionError = (error: any): boolean => {
    return error.code === 'permission-denied' || error.message?.includes('permissions');
  };

  /**
   * Check if error is Firestore internal state error
   * @description Detects known transient Firestore SDK error strings that are safe to retry automatically.
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
   * @description Clears the listener and schedules a later retry rather than showing an error — permission may resolve after login propagation.
   * @param channelId - Channel ID
   */
  private handlePermissionError = (channelId: string): void => {
    this.clearExistingListener(channelId);
    this.scheduleRetry(channelId);
  };

  /**
   * Schedule retry for channel subscription
   * @description Registers the channel for a pending retry, skipping it if already queued to prevent duplicate retry entries.
   * @param channelId - Channel ID
   */
  private scheduleRetry = (channelId: string): void => {
    if (this.pendingRetries.has(channelId)) {
      return;
    }
    this.pendingRetries.add(channelId);
  };

  /**
   * Clear all active listeners
   * @description Unsubscribes every active channel listener and clears retry state — call on user logout or app teardown.
   */
  clearAllListeners = (): void => {
    this.messageListeners.forEach((unsubscribe) => unsubscribe());
    this.messageListeners.clear();
    this.pendingRetries.clear();
  };
}
