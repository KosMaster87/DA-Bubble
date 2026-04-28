/**
 * @fileoverview Navigation State Service
 * @description Holds shared navigation signals that coordinate selected views across workspace routing flows.
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
   * @description Returns readonly so consumers can observe state changes without being able to mutate the signal directly.
   */
  getSelectedChannelId() {
    return this.selectedChannelId.asReadonly();
  }

  /**
   * Get selected DM ID signal (read-only)
   * @description Returns readonly so consumers can observe state changes without being able to mutate the signal directly.
   */
  getSelectedDirectMessageId() {
    return this.selectedDirectMessageId.asReadonly();
  }

  /**
   * Set selected channel ID
   * @description Centralises all channel-selection writes so derived signals and effects react consistently.
   */
  setSelectedChannelId(id: string | null): void {
    this.selectedChannelId.set(id);
  }

  /**
   * Set selected direct message ID
   * @description Centralises all DM-selection writes so derived signals and effects react consistently.
   */
  setSelectedDirectMessageId(id: string | null): void {
    this.selectedDirectMessageId.set(id);
  }

  /**
   * Set new message active state
   * @description Allows navigation actions to activate the compose view without routing concerns leaking into the state layer.
   */
  setNewMessageActive(active: boolean): void {
    this.isNewMessageActive.set(active);
  }

  /**
   * Set mailbox active state
   * @description Allows navigation actions to activate the mailbox without routing concerns leaking into the state layer.
   */
  setMailboxActive(active: boolean): void {
    this.isMailboxActive.set(active);
  }

  /**
   * Get current navigation state snapshot
   * @description Returns a plain object snapshot for guards and services that need to inspect multiple state values synchronously.
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
   * @description Full reset used on logout and route guard teardown to ensure no stale selection bleeds into the next session.
   */
  clearAll(): void {
    this.selectedChannelId.set(null);
    this.selectedDirectMessageId.set(null);
    this.isNewMessageActive.set(false);
    this.isMailboxActive.set(false);
  }

  /**
   * Clear channel selection
   * @description Resets only channel-related flags so DM state remains intact when switching away from a channel view.
   */
  clearChannelSelection(): void {
    this.selectedChannelId.set(null);
    this.isNewMessageActive.set(false);
    this.isMailboxActive.set(false);
  }

  /**
   * Clear DM selection
   * @description Resets only DM-related flags so channel state remains intact when switching away from a DM view.
   */
  clearDMSelection(): void {
    this.selectedDirectMessageId.set(null);
    this.isNewMessageActive.set(false);
    this.isMailboxActive.set(false);
  }
}
