/**
 * @fileoverview Message Box State Service
 * @description Maintains popup visibility signals for composer overlays so emoji, user, channel, and search panels can be orchestrated centrally.
 * @module shared/services/message-box-state
 */

import { Injectable, signal } from '@angular/core';

@Injectable()
export class MessageBoxStateService {
  private isEmojiPickerOpen = signal<boolean>(false);
  private isUserSelectionOpen = signal<boolean>(false);
  private isChannelSelectionOpen = signal<boolean>(false);
  private isMessageSearchOpen = signal<boolean>(false);

  /**
   * Get emoji picker open state
   * @description Exposes emoji-picker visibility as readonly state so templates can react without mutating service internals.
   * @returns {boolean} True if emoji picker is open
   */
  getEmojiPickerOpen = () => this.isEmojiPickerOpen.asReadonly();

  /**
   * Get user selection open state
   * @description Exposes user-selector visibility as readonly state for conditional rendering in the composer UI.
   * @returns {boolean} True if user selection is open
   */
  getUserSelectionOpen = () => this.isUserSelectionOpen.asReadonly();

  /**
   * Get channel selection open state
   * @description Exposes channel-selector visibility as readonly state so components can subscribe without write access.
   * @returns {boolean} True if channel selection is open
   */
  getChannelSelectionOpen = () => this.isChannelSelectionOpen.asReadonly();

  /**
   * Get message search open state
   * @description Exposes message-search popup visibility to keep open/close rendering fully signal-driven.
   * @returns {boolean} True if message search is open
   */
  getMessageSearchOpen = () => this.isMessageSearchOpen.asReadonly();

  /**
   * Close all search and selection popups
   * @description Resets all composer overlays at once to guarantee a clean baseline before opening another popup.
   * @returns {void}
   */
  closeAll = (): void => {
    this.isEmojiPickerOpen.set(false);
    this.isUserSelectionOpen.set(false);
    this.isChannelSelectionOpen.set(false);
    this.isMessageSearchOpen.set(false);
  };

  /**
   * Toggle emoji picker and close others
   * @description Enforces mutual exclusivity by closing other overlays before toggling the emoji picker.
   * @returns {void}
   */
  toggleEmojiPicker = (): void => {
    const newState = !this.isEmojiPickerOpen();
    this.closeAll();
    this.isEmojiPickerOpen.set(newState);
  };

  /**
   * Toggle user selection and close others
   * @description Enforces mutual exclusivity by closing other overlays before toggling the user selector.
   * @returns {void}
   */
  toggleUserSelection = (): void => {
    const newState = !this.isUserSelectionOpen();
    this.closeAll();
    this.isUserSelectionOpen.set(newState);
  };

  /**
   * Open message search popup
   * @description Activates message-search mode and closes competing overlays so keyboard navigation targets one popup.
   * @returns {void}
   */
  openMessageSearch = (): void => {
    this.isEmojiPickerOpen.set(false);
    this.isUserSelectionOpen.set(false);
    this.isChannelSelectionOpen.set(false);
    this.isMessageSearchOpen.set(true);
  };

  /**
   * Close message search popup
   * @description Dismisses message-search mode without affecting the rest of the composer state.
   * @returns {void}
   */
  closeMessageSearch = (): void => {
    this.isMessageSearchOpen.set(false);
  };

  /**
   * Open user selection popup
   * @description Opens user mention selection while closing other overlays to prevent stacked popup states.
   * @returns {void}
   */
  openUserSelection = (): void => {
    this.isEmojiPickerOpen.set(false);
    this.isChannelSelectionOpen.set(false);
    this.isMessageSearchOpen.set(false);
    this.isUserSelectionOpen.set(true);
  };

  /**
   * Close user selection popup
   * @description Closes the user selector when mention insertion is canceled or completed.
   * @returns {void}
   */
  closeUserSelection = (): void => {
    this.isUserSelectionOpen.set(false);
  };

  /**
   * Open channel selection popup
   * @description Opens channel mention selection while suppressing other popups to keep interaction focus singular.
   * @returns {void}
   */
  openChannelSelection = (): void => {
    this.isEmojiPickerOpen.set(false);
    this.isUserSelectionOpen.set(false);
    this.isMessageSearchOpen.set(false);
    this.isChannelSelectionOpen.set(true);
  };

  /**
   * Close channel selection popup
   * @description Closes the channel selector after selection or cancellation to restore normal composer interaction.
   * @returns {void}
   */
  closeChannelSelection = (): void => {
    this.isChannelSelectionOpen.set(false);
  };
}
