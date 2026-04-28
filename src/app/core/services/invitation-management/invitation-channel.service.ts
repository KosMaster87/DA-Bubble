/**
 * @fileoverview Invitation Channel Service
 * @description Resolves invitation target channels and applies safe membership updates during channel-invitation acceptance.
 * @module core/services/invitation-management
 */

import { Injectable, inject } from '@angular/core';
import { ChannelStore } from '@stores/channels/channel.store';

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
   * @description First checks the in-memory store to avoid a Firestore round-trip; falls back to the full channels array if the computed lookup returns undefined.
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
   * @description Uses a Set to deduplicate before updating so accepting the same invitation twice doesn’t cause duplicate member entries.
   * @param channelId Channel ID
   * @param currentMembers Current member array
   * @param userId User ID to add
   */
  addUserToChannel = async (
    channelId: string,
    currentMembers: string[],
    userId: string,
  ): Promise<void> => {
    const updatedMembers = [...new Set([...currentMembers, userId])];
    await this.channelStore.updateChannel(channelId, { members: updatedMembers });
  };
}
