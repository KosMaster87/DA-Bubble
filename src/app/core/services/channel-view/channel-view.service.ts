/**
 * @fileoverview Channel View Service
 * @description Manages channel preview modal state and actions
 * @module core/services/channel-view
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { ChannelStore } from '@stores/index';
import { ChannelMembershipService } from '../channel-membership/channel-membership.service';

/**
 * Service for managing channel preview modal
 * @description Handles opening, closing, joining, and navigating to channels from preview
 */
@Injectable({
  providedIn: 'root',
})
export class ChannelViewService {
  private channelStore = inject(ChannelStore);
  private channelMembership = inject(ChannelMembershipService);

  private isOpen = signal<boolean>(false);
  private selectedChannelId = signal<string | null>(null);

  /**
   * Get modal open state
   * @returns {Signal<boolean>} Whether modal is open
   */
  readonly isChannelViewOpen = computed(() => this.isOpen());

  /**
   * Get selected channel ID
   * @returns {Signal<string | null>} Channel ID or null
   */
  readonly channelId = computed(() => this.selectedChannelId());

  /**
   * Open channel preview modal
   * @param {string} channelId - Channel identifier
   * @returns {void}
   * @description Opens modal if channel exists
   */
  openChannelView = (channelId: string): void => {
    const channel = this.channelStore.getChannelById()(channelId);

    if (channel) {
      this.selectedChannelId.set(channelId);
      this.isOpen.set(true);
    } else {
      console.warn('Channel not found:', channelId);
    }
  };

  /**
   * Close channel preview modal
   * @returns {void}
   * @description Closes modal and resets selection
   */
  closeChannelView = (): void => {
    this.isOpen.set(false);
    this.selectedChannelId.set(null);
  };

  /**
   * Join channel and close modal
   * @param {string} channelId - Channel identifier
   * @returns {Promise<boolean>} Success status
   * @description Joins channel, closes modal, returns success
   */
  joinChannel = async (channelId: string): Promise<boolean> => {
    try {
      await this.channelMembership.joinChannel(channelId);
      this.closeChannelView();
      return true;
    } catch (error) {
      console.error('Failed to join channel:', error);
      return false;
    }
  };

  /**
   * Navigate to channel and close modal
   * @returns {void}
   * @description Closes modal for navigation
   */
  navigateToChannel = (): void => {
    this.closeChannelView();
  };
}
