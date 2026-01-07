/**
 * @fileoverview Workspace Sidebar Service
 * @description Service to manage workspace sidebar state globally (visibility, dropdowns, popups)
 * @module shared/services/workspace-sidebar
 */

import { Injectable, signal, computed } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class WorkspaceSidebarService {
  private _isHidden = signal(false);
  readonly isHidden = this._isHidden.asReadonly();
  readonly isVisible = computed(() => !this._isHidden());

  // Dropdown states
  private _isChannelsOpen = signal(true);
  private _isDirectMessagesOpen = signal(true);
  private _isSystemControlOpen = signal(true);

  readonly isChannelsOpen = this._isChannelsOpen.asReadonly();
  readonly isDirectMessagesOpen = this._isDirectMessagesOpen.asReadonly();
  readonly isSystemControlOpen = this._isSystemControlOpen.asReadonly();

  // Channel creation flow states
  private _isAddChannelActive = signal(false);
  private _isCreateChannelOpen = signal(false);
  private _isAddMemberAfterChannelOpen = signal(false);

  readonly isAddChannelActive = this._isAddChannelActive.asReadonly();
  readonly isCreateChannelOpen = this._isCreateChannelOpen.asReadonly();
  readonly isAddMemberAfterChannelOpen = this._isAddMemberAfterChannelOpen.asReadonly();

  // Thread unread popup state
  private _hoveredThreadUnreadId = signal<string | null>(null);
  readonly hoveredThreadUnreadId = this._hoveredThreadUnreadId.asReadonly();

  // Hover timeout management for thread unread popup
  private hoverTimeout: any = null;

  // Pending channel data for creation flow
  private _pendingChannelName = signal<string>('');
  private _pendingChannelDescription = signal<string>('');
  private _pendingChannelIsPrivate = signal<boolean>(false);

  readonly pendingChannelName = this._pendingChannelName.asReadonly();
  readonly pendingChannelDescription = this._pendingChannelDescription.asReadonly();
  readonly pendingChannelIsPrivate = this._pendingChannelIsPrivate.asReadonly();

  /**
   * Toggle sidebar visibility
   */
  toggle(): void {
    this._isHidden.update((value) => !value);
  }

  /**
   * Show sidebar
   */
  show(): void {
    this._isHidden.set(false);
  }

  /**
   * Hide sidebar
   */
  hide(): void {
    this._isHidden.set(true);
  }

  /**
   * Toggle channels dropdown
   */
  toggleChannels(): void {
    this._isChannelsOpen.update((value) => !value);
  }

  /**
   * Toggle direct messages dropdown
   */
  toggleDirectMessages(): void {
    this._isDirectMessagesOpen.update((value) => !value);
  }

  /**
   * Toggle system control dropdown
   */
  toggleSystemControl(): void {
    this._isSystemControlOpen.update((value) => !value);
  }

  /**
   * Start add channel flow
   */
  startAddChannel(): void {
    this._isAddChannelActive.update((v) => !v);
    this._isCreateChannelOpen.set(true);
  }

  /**
   * Open create channel popup
   */
  openCreateChannel(): void {
    this._isCreateChannelOpen.set(true);
  }

  /**
   * Close create channel popup
   */
  closeCreateChannel(): void {
    this._isCreateChannelOpen.set(false);
  }

  /**
   * Open add member after channel popup
   */
  openAddMemberAfterChannel(): void {
    this._isAddMemberAfterChannelOpen.set(true);
  }

  /**
   * Close add member after channel popup and clear pending data
   */
  closeAddMemberAfterChannel(): void {
    this._isAddMemberAfterChannelOpen.set(false);
    this.clearPendingChannelData();
  }

  /**
   * Set pending channel data for creation flow
   */
  setPendingChannelData(name: string, description: string, isPrivate: boolean): void {
    this._pendingChannelName.set(name);
    this._pendingChannelDescription.set(description);
    this._pendingChannelIsPrivate.set(isPrivate);
  }

  /**
   * Clear pending channel data
   */
  clearPendingChannelData(): void {
    this._pendingChannelName.set('');
    this._pendingChannelDescription.set('');
    this._pendingChannelIsPrivate.set(false);
  }

  /**
   * Set hovered thread unread ID for popup
   */
  setHoveredThreadUnreadId(id: string | null): void {
    this._hoveredThreadUnreadId.set(id);
  }

  /**
   * Handle mouse enter on thread unread item
   * Clears any pending timeout and shows popup
   */
  onThreadUnreadMouseEnter(id: string): void {
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }
    this._hoveredThreadUnreadId.set(id);
  }

  /**
   * Handle mouse leave on thread unread item
   * Adds delay before hiding to allow moving to popup
   */
  onThreadUnreadMouseLeave(): void {
    this.hoverTimeout = setTimeout(() => {
      this._hoveredThreadUnreadId.set(null);
      this.hoverTimeout = null;
    }, 200);
  }

  /**
   * Cancel hover timeout (when entering popup)
   * Prevents popup from hiding when user moves mouse to it
   */
  onPopupMouseEnter(): void {
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }
  }
}
