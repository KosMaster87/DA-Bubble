/**
 * @fileoverview Thread Listener Service
 * @description Manages Firestore listeners and retry logic for threads
 * @module stores/thread-listener
 */

import { inject, Injectable } from '@angular/core';
import {
  collection,
  DocumentData,
  Firestore,
  onSnapshot,
  orderBy,
  query,
  QuerySnapshot,
  Unsubscribe,
} from '@angular/fire/firestore';
import { type ThreadMessage } from './../threads/thread.store';
import { ThreadOperationsService } from './thread-operations.service';

export interface SnapshotHandler {
  (snapshot: QuerySnapshot<DocumentData>, messageId: string): void;
}

export interface ErrorHandler {
  (
    error: unknown,
    listenerKey: string,
    channelId: string,
    messageId: string,
    isDirectMessage?: boolean,
  ): void;
}

@Injectable({
  providedIn: 'root',
})
export class ThreadListenerService {
  private firestore = inject(Firestore);
  private threadOps = inject(ThreadOperationsService);
  private threadListeners = new Map<string, Unsubscribe>();
  private pendingRetries = new Set<string>();

  /**
   * Setup real-time listener for threads
   * @description
   * Supports optional one-shot mode for warmup flows so thread state can be verified
   * without retaining long-running listeners for inactive contexts.
   */
  setupListener = (
    channelId: string,
    messageId: string,
    isDirectMessage: boolean | undefined,
    onSnapshotCallback: SnapshotHandler,
    onErrorCallback: ErrorHandler,
    options?: { once?: boolean },
  ): boolean => {
    const listenerKey = `${channelId}_${messageId}`;
    if (this.threadListeners.has(listenerKey)) return false;

    const threadsPath = this.threadOps.getThreadsPath(channelId, messageId, isDirectMessage);
    const threadsQuery = query(
      collection(this.firestore, threadsPath),
      orderBy('createdAt', 'asc'),
    );

    const once = options?.once === true;
    let handledFirstSnapshot = false;

    const unsubscribe = onSnapshot(
      threadsQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        if (once && handledFirstSnapshot) return;
        if (once) {
          handledFirstSnapshot = true;
          const existing = this.threadListeners.get(listenerKey);
          if (existing) {
            existing();
            this.threadListeners.delete(listenerKey);
          }
        }

        onSnapshotCallback(snapshot, messageId);
      },
      (error: unknown) =>
        onErrorCallback(error, listenerKey, channelId, messageId, isDirectMessage),
    );

    this.threadListeners.set(listenerKey, unsubscribe);
    return true;
  };

  /**
   * Check if permission error should trigger retry
   */
  isPermissionError = (error: unknown): boolean => {
    if (!(error instanceof Error)) {
      return false;
    }

    const firebaseCode = (error as { code?: string }).code;
    return firebaseCode === 'permission-denied' || error.message.includes('permissions');
  };

  /**
   * Schedule retry for thread subscription after permission error
   * @description
   * Retry is delayed and deduplicated per listener key to avoid rapid re-subscribe loops
   * during temporary permission propagation windows.
   */
  scheduleRetry = (listenerKey: string, retryFn: () => void): void => {
    console.log('🔓 Permission error - will retry thread subscription');

    // Unsubscribe existing listener FIRST before scheduling retry
    const existingListener = this.threadListeners.get(listenerKey);
    if (existingListener) {
      existingListener(); // Call unsubscribe function
      this.threadListeners.delete(listenerKey);
    }

    if (!this.pendingRetries.has(listenerKey)) {
      this.pendingRetries.add(listenerKey);
      setTimeout(() => {
        console.log('🔄 Retrying thread subscription:', listenerKey);
        this.pendingRetries.delete(listenerKey);
        retryFn();
      }, 3000);
    }
  };

  /**
   * Clear all thread listeners
   */
  clearAllListeners = (): void => {
    this.threadListeners.forEach((unsubscribe) => unsubscribe());
    this.threadListeners.clear();
  };

  /**
   * Map snapshot to thread messages
   */
  mapSnapshot = (snapshot: QuerySnapshot<DocumentData>, messageId: string): ThreadMessage[] => {
    return snapshot.docs.map((doc) => this.threadOps.mapThreadDocument(doc, messageId));
  };
}
