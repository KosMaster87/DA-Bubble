/**
 * @fileoverview Channel Data Service (Facade)
 * @description Provides unified access to channel data and transformations
 * @module core/services/channel-data
 *
 * @deprecated This is now a facade. Use ChannelAccessService or ChannelTransformationService directly.
 * This facade will be kept for backward compatibility.
 */

import { Injectable, inject, Signal } from '@angular/core';
import { ChannelAccessService } from '../channel-access/channel-access.service';
import {
  ChannelTransformationService,
  ChannelAccessInfo,
  ChannelInfo,
} from '../channel-transformation/channel-transformation.service';
import type { ChannelInfoData } from '@shared/dashboard-components/channel-info/channel-info.component';
import type { UserListItem } from '../user-transformation/user-transformation.service';

// Re-export types for backward compatibility
export type { ChannelAccessInfo, ChannelInfo };

@Injectable({
  providedIn: 'root',
})
export class ChannelDataService {
  private access = inject(ChannelAccessService);
  private transformation = inject(ChannelTransformationService);

  // ============================================
  // ACCESS METHODS (delegated to ChannelAccessService)
  // ============================================

  /**
   * Check if user is member of channel
   * @param channelId Channel ID
   * @returns True if user is member
   */
  isUserMember = (channelId: Signal<string>): Signal<boolean> => {
    return this.access.isUserMember(channelId);
  };

  /**
   * Check if current user is channel owner
   * @param channelId Channel ID
   * @returns True if current user is owner
   */
  isCurrentUserOwner = (channelId: Signal<string>): Signal<boolean> => {
    return this.access.isCurrentUserOwner(channelId);
  };

  // ============================================
  // TRANSFORMATION METHODS (delegated to ChannelTransformationService)
  // ============================================

  /**
   * Get channel access info for access screen
   * @param channelInfo Basic channel info
   * @returns Channel access information
   */
  getChannelAccessInfo = (channelInfo: Signal<ChannelInfo>): Signal<ChannelAccessInfo> => {
    return this.transformation.getChannelAccessInfo(channelInfo);
  };

  /**
   * Get channel info data for channel-info component
   * @param channelInfo Basic channel info
   * @returns Channel info data
   */
  getChannelInfoData = (channelInfo: Signal<ChannelInfo>): Signal<ChannelInfoData> => {
    return this.transformation.getChannelInfoData(channelInfo);
  };

  /**
   * Get channel members as user list items
   * @param channelId Channel ID
   * @returns Members list
   */
  getChannelMembers = (channelId: Signal<string>): Signal<UserListItem[]> => {
    return this.transformation.getChannelMembers(channelId);
  };

  /**
   * Get available users (not yet members)
   * @param channelId Channel ID
   * @returns Available users list
   */
  getAvailableUsers = (channelId: Signal<string>): Signal<UserListItem[]> => {
    return this.transformation.getAvailableUsers(channelId);
  };
}
