/**
 * @fileoverview Channel Access Service
 * @description Provides channel data access and membership checks
 * @module core/services/channel-access
 */

import { Injectable, inject, computed, Signal } from '@angular/core';
import { ChannelStore } from '@stores/index';
import { AuthStore } from '@stores/auth';

@Injectable({
  providedIn: 'root',
})
export class ChannelAccessService {
  private channelStore = inject(ChannelStore);
  private authStore = inject(AuthStore);

  /**
   * Check if user is member of channel
   * @param channelId Channel ID
   * @returns True if user is member
   */
  isUserMember = (channelId: Signal<string>): Signal<boolean> => {
    return computed(() => {
      const currentUser = this.authStore.user();
      if (!currentUser) return false;

      const channelData = this.channelStore.getChannelById()(channelId());
      if (!channelData) return false;

      return channelData.members.includes(currentUser.uid);
    });
  };

  /**
   * Check if current user is channel owner
   * @param channelId Channel ID
   * @returns True if current user is owner
   */
  isCurrentUserOwner = (channelId: Signal<string>): Signal<boolean> => {
    return computed(() => {
      const channelData = this.channelStore.getChannelById()(channelId());
      const currentUserId = this.authStore.user()?.uid;
      return channelData?.createdBy === currentUserId;
    });
  };

  /**
   * Get channel data by ID
   * @param channelId Channel ID
   * @returns Channel data signal
   */
  getChannelById = (channelId: string) => {
    return this.channelStore.getChannelById()(channelId);
  };
}
