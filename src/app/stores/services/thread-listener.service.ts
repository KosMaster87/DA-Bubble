/**
 * @fileoverview Thread Listener Service
 * @description Manages Firestore listeners and retry logic for threads
 * @module stores/thread-listener
 */

import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  onSnapshot,
  query,
  orderBy,
  Unsubscribe,
} from '@angular/fire/firestore';
import { ThreadOperationsService } from './thread-operations.service';
import { type ThreadMessage } from './../thread.store';

export interface SnapshotHandler {
  (snapshot: any, messageId: string): void;
}

export interface ErrorHandler {
  (error: any, listenerKey: string, channelId: string, messageId: string, isDirectMessage?: boolean): void;
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
   */
  setupListener = (
    channelId: string,
    messageId: string,
    isDirectMessage: boolean | undefined,
    onSnapshotCallback: SnapshotHandler,
    onErrorCallback: ErrorHandler
  ): boolean => {
    const listenerKey = `${channelId}_${messageId}`;
    if (this.threadListeners.has(listenerKey)) return false;

    try {
      const threadsPath = this.threadOps.getThreadsPath(channelId, messageId, isDirectMessage);
      const threadsQuery = query(collection(this.firestore, threadsPath), orderBy('createdAt', 'asc'));

      const unsubscribe = onSnapshot(
        threadsQuery,
        (snapshot: any) => onSnapshotCallback(snapshot, messageId),
        (error: any) => onErrorCallback(error, listenerKey, channelId, messageId, isDirectMessage)
      );

      this.threadListeners.set(listenerKey, unsubscribe);
      return true;
    } catch (error) {
      throw error;
    }
  };

  /**
   * Check if permission error should trigger retry
   */
  isPermissionError = (error: any): boolean => {
    return error.code === 'permission-denied' || error.message?.includes('permissions');
  };

  /**
   * Schedule retry for thread subscription after permission error
   */
  scheduleRetry = (
    listenerKey: string,
    retryFn: () => void
  ): void => {
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
  mapSnapshot = (snapshot: any, messageId: string): ThreadMessage[] => {
    return snapshot.docs.map((doc: any) => this.threadOps.mapThreadDocument(doc, messageId));
  };
}
