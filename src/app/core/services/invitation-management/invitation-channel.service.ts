/**
 * @fileoverview Invitation Channel Service
 * @description Handles channel-specific logic for invitation acceptance
 * @module core/services/invitation-management
 */

import { Injectable, inject } from '@angular/core';
import { ChannelStore } from '@stores/channel.store';

/**
 * Service for managing channel membership when accepting invitations
 */
@Injectable({
  providedIn: 'root',
})
export class InvitationChannelService {
  private channelStore = inject(ChannelStore);

  /**
   * Get channel by ID from store or fetch
   * @param channelId Channel ID
   * @returns Channel or undefined
   */
  getChannel = async (channelId: string) => {
    const channelDoc = await this.channelStore.getChannelById()(channelId);
    if (channelDoc) return channelDoc;

    const channels = this.channelStore.channels();
    return channels.find((ch) => ch.id === channelId);
  };

  /**
   * Add user to channel members
   * @param channelId Channel ID
   * @param currentMembers Current member array
   * @param userId User ID to add
   */
  addUserToChannel = async (
    channelId: string,
    currentMembers: string[],
    userId: string
  ): Promise<void> => {
    const updatedMembers = [...new Set([...currentMembers, userId])];
    await this.channelStore.updateChannel(channelId, { members: updatedMembers });
  };
}
