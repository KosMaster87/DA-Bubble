/**
 * @fileoverview Navigation State Service
 * @description Manages internal navigation state signals
 * @module core/services/navigation
 */

import { Injectable, signal } from '@angular/core';

/**
 * Navigation state for workspace
 */
export interface NavigationState {
  selectedChannelId: string | null;
  selectedDirectMessageId: string | null;
  isNewMessageActive: boolean;
  isMailboxActive: boolean;
}

/**
 * Service for managing navigation state
 */
@Injectable({
  providedIn: 'root',
})
export class NavigationStateService {
  private selectedChannelId = signal<string | null>(null);
  private selectedDirectMessageId = signal<string | null>(null);
  private isNewMessageActive = signal<boolean>(false);
  private isMailboxActive = signal<boolean>(false);

  /**
   * Get selected channel ID signal (read-only)
   */
  getSelectedChannelId() {
    return this.selectedChannelId.asReadonly();
  }

  /**
   * Get selected DM ID signal (read-only)
   */
  getSelectedDirectMessageId() {
    return this.selectedDirectMessageId.asReadonly();
  }

  /**
   * Set selected channel ID
   */
  setSelectedChannelId(id: string | null): void {
    this.selectedChannelId.set(id);
  }

  /**
   * Set selected direct message ID
   */
  setSelectedDirectMessageId(id: string | null): void {
    this.selectedDirectMessageId.set(id);
  }

  /**
   * Set new message active state
   */
  setNewMessageActive(active: boolean): void {
    this.isNewMessageActive.set(active);
  }

  /**
   * Set mailbox active state
   */
  setMailboxActive(active: boolean): void {
    this.isMailboxActive.set(active);
  }

  /**
   * Get current navigation state snapshot
   */
  getState(): NavigationState {
    return {
      selectedChannelId: this.selectedChannelId(),
      selectedDirectMessageId: this.selectedDirectMessageId(),
      isNewMessageActive: this.isNewMessageActive(),
      isMailboxActive: this.isMailboxActive(),
    };
  }

  /**
   * Clear all selections
   */
  clearAll(): void {
    this.selectedChannelId.set(null);
    this.selectedDirectMessageId.set(null);
    this.isNewMessageActive.set(false);
    this.isMailboxActive.set(false);
  }

  /**
   * Clear channel selection
   */
  clearChannelSelection(): void {
    this.selectedChannelId.set(null);
    this.isNewMessageActive.set(false);
    this.isMailboxActive.set(false);
  }

  /**
   * Clear DM selection
   */
  clearDMSelection(): void {
    this.selectedDirectMessageId.set(null);
    this.isNewMessageActive.set(false);
    this.isMailboxActive.set(false);
  }
}
