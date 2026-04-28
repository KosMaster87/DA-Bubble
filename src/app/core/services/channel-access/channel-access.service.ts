/**
 * @fileoverview Channel Access Service
 * @description Provides channel data access and membership checks
 * @module core/services/channel-access
 */

import { computed, inject, Injectable, Signal } from '@angular/core';
import { AuthStore } from '@stores/auth';
import { ChannelStore } from '@stores/index';

@Injectable({
  providedIn: 'root',
})
export class ChannelAccessService {
  private channelStore = inject(ChannelStore);
  private authStore = inject(AuthStore);

  /**
   * Check if user is member of channel
   * @description Guards channel content access — used to conditionally show channel views and prevent unauthorized reads.
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
   * @description Determines whether to show owner-only UI actions like edit, delete, or manage-members controls.
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
   * @description Thin wrapper around the store selector so consumers don't need to inject ChannelStore directly.
   * @param channelId Channel ID
   * @returns Channel data signal
   */
  getChannelById = (channelId: string) => {
    return this.channelStore.getChannelById()(channelId);
  };
}
