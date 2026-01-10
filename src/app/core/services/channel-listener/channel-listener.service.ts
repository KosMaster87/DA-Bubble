/**
 * @fileoverview Channel Listener Service
 * @description Manages Firestore real-time listeners for channels
 * @module core/services/channel-listener
 */

import { Injectable, inject } from '@angular/core';
import { Firestore, query, orderBy, onSnapshot, Unsubscribe } from '@angular/fire/firestore';
import { Channel } from '@core/models/channel.model';
import { ChannelOperationsService } from '../channel-operations/channel-operations.service';

@Injectable({
  providedIn: 'root',
})
export class ChannelListenerService {
  private firestore = inject(Firestore);
  private operations = inject(ChannelOperationsService);
  private unsubscribe: Unsubscribe | null = null;
  private debounceTimer: any = null;
  private retryCount = 0;
  private readonly MAX_RETRIES = 3;
  private readonly DEBOUNCE_MS = 100;

  /**
   * Setup real-time listener for channels
   * @param onSuccess - Success callback with channels
   * @param onError - Error callback
   */
  setupListener(onSuccess: (channels: Channel[]) => void, onError: (error: string) => void): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.clearExistingListener();
      this.retryCount = 0;
      this.unsubscribe = this.createListener(onSuccess, onError);
    }, this.DEBOUNCE_MS);
  }

  /**
   * Clear existing listener
   */
  private clearExistingListener = (): void => {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  };

  /**
   * Create Firestore snapshot listener
   * @param onSuccess - Success callback
   * @param onError - Error callback
   * @returns Unsubscribe function
   */
  private createListener = (
    onSuccess: (channels: Channel[]) => void,
    onError: (error: string) => void
  ): Unsubscribe => {
    const channelsRef = this.operations.getChannelsCollectionRef();
    const q = query(channelsRef, orderBy('createdAt', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
          const channels = this.mapSnapshot(snapshot);
          onSuccess(channels);
          this.retryCount = 0;
        }, 50);
      },
      (error: any) => this.handleListenerError(error, onError, onSuccess)
    );
  };

  /**
   * Map Firestore snapshot to channels array
   * @param snapshot - Firestore query snapshot
   * @returns Array of channels
   */
  private mapSnapshot = (snapshot: any): Channel[] => {
    const channels = snapshot.docs.map((doc: any) => {
      return this.operations.mapChannelDocument(doc.id, doc.data());
    });
    return this.deduplicateChannels(channels);
  };

  /**
   * Remove duplicate channels by ID
   * @param channels - Array of channels
   * @returns Deduplicated array
   */
  private deduplicateChannels = (channels: Channel[]): Channel[] => {
    return channels.reduce((acc: Channel[], channel: Channel) => {
      const exists = acc.find((c) => c.id === channel.id);
      if (!exists) {
        acc.push(channel);
      }
      return acc;
    }, []);
  };

  /**
   * Handle Firestore listener errors
   * @param error - Error object
   * @param onError - Error callback
   * @param onSuccess - Success callback for retry
   */
  private handleListenerError = (
    error: any,
    onError: (msg: string) => void,
    onSuccess: (channels: Channel[]) => void
  ): void => {
    if (this.isPermissionError(error)) {
      this.clearExistingListener();
      return;
    }

    if (this.isFirestoreStateError(error) && this.retryCount < this.MAX_RETRIES) {
      this.retryCount++;
      setTimeout(() => {
        this.clearExistingListener();
        this.unsubscribe = this.createListener(onSuccess, onError);
      }, 500 * this.retryCount);
      return;
    }

    console.error('Error in channels listener:', error);
    onError(error.message || 'Failed to load channels');
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
    const message = error.message || '';
    return (
      message.includes('INTERNAL ASSERTION FAILED') ||
      message.includes('Unexpected state') ||
      message.includes('ID: ca9') ||
      message.includes('ID: b815') ||
      message.includes('BloomFilter')
    );
  };

  /**
   * Clear all active listeners
   */
  clearAllListeners = (): void => {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.clearExistingListener();
  };
}
