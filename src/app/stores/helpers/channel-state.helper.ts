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
   * @description Filters the full channel list down to channels the user is a member of, so the sidebar only shows relevant channels.
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
   * @description Immutably updates a matched channel via map so NgRx signal change detection sees a new array reference.
   */
  static updateChannelInArray(
    channels: Channel[],
    channelId: string,
    updates: Partial<Channel>,
  ): Channel[] {
    return channels.map((channel) =>
      channel.id === channelId ? { ...channel, ...updates } : channel,
    );
  }

  /**
   * Find channel by ID
   * @param channels - Channels array
   * @param channelId - Channel ID
   * @returns Channel or undefined
   * @description Provides a typed lookup returning undefined instead of throwing, enabling safe optional-chaining at call sites.
   */
  static findChannelById(channels: Channel[], channelId: string): Channel | undefined {
    return channels.find((ch) => ch.id === channelId);
  }

  /**
   * Validate channel owner
   * @param channel - Channel to check
   * @param userId - User ID to validate
   * @returns True if user is owner
   * @description Encapsulates ownership check so callers don't access channel.createdBy directly and the rule stays consistent across the app.
   */
  static isChannelOwner(channel: Channel, userId: string): boolean {
    return channel.createdBy === userId;
  }
}
