/**
 * @fileoverview Message Box State Service
 * @description Manages popup visibility state for message box component
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
   * @returns {boolean} True if emoji picker is open
   */
  getEmojiPickerOpen = () => this.isEmojiPickerOpen.asReadonly();

  /**
   * Get user selection open state
   * @returns {boolean} True if user selection is open
   */
  getUserSelectionOpen = () => this.isUserSelectionOpen.asReadonly();

  /**
   * Get channel selection open state
   * @returns {boolean} True if channel selection is open
   */
  getChannelSelectionOpen = () => this.isChannelSelectionOpen.asReadonly();

  /**
   * Get message search open state
   * @returns {boolean} True if message search is open
   */
  getMessageSearchOpen = () => this.isMessageSearchOpen.asReadonly();

  /**
   * Close all search and selection popups
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
   * @returns {void}
   */
  toggleEmojiPicker = (): void => {
    const newState = !this.isEmojiPickerOpen();
    this.closeAll();
    this.isEmojiPickerOpen.set(newState);
  };

  /**
   * Toggle user selection and close others
   * @returns {void}
   */
  toggleUserSelection = (): void => {
    const newState = !this.isUserSelectionOpen();
    this.closeAll();
    this.isUserSelectionOpen.set(newState);
  };

  /**
   * Open message search popup
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
   * @returns {void}
   */
  closeMessageSearch = (): void => {
    this.isMessageSearchOpen.set(false);
  };

  /**
   * Open user selection popup
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
   * @returns {void}
   */
  closeUserSelection = (): void => {
    this.isUserSelectionOpen.set(false);
  };

  /**
   * Open channel selection popup
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
   * @returns {void}
   */
  closeChannelSelection = (): void => {
    this.isChannelSelectionOpen.set(false);
  };
}
