/**
 * @fileoverview Channel State Helper
 * @description Pure helper functions for channel state updates
 * @module stores/channel/helpers
 */

import { Channel } from '@core/models/channel.model';

export class ChannelStateHelper {
  /**
   * Filter channels by user membership
   * @param channels - All channels
   * @param userId - User ID to filter by
   * @returns User's channels
   */
  static filterUserChannels(channels: Channel[], userId?: string): Channel[] {
    return userId ? channels.filter((ch) => ch.members.includes(userId)) : [];
  }

  /**
   * Update specific channel in array
   * @param channels - Current channels array
   * @param channelId - Channel ID to update
   * @param updates - Updates to apply
   * @returns Updated channels array
   */
  static updateChannelInArray(
    channels: Channel[],
    channelId: string,
    updates: Partial<Channel>
  ): Channel[] {
    return channels.map((channel) =>
      channel.id === channelId ? { ...channel, ...updates } : channel
    );
  }

  /**
   * Find channel by ID
   * @param channels - Channels array
   * @param channelId - Channel ID
   * @returns Channel or undefined
   */
  static findChannelById(channels: Channel[], channelId: string): Channel | undefined {
    return channels.find((ch) => ch.id === channelId);
  }

  /**
   * Validate channel owner
   * @param channel - Channel to check
   * @param userId - User ID to validate
   * @returns True if user is owner
   */
  static isChannelOwner(channel: Channel, userId: string): boolean {
    return channel.createdBy === userId;
  }
}
