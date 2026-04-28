/**
 * @fileoverview Channel Data Service (Facade)
 * @description Provides unified access to channel data and transformations
 * @module core/services/channel-data
 *
 * @deprecated This is now a facade. Use ChannelAccessService or ChannelTransformationService directly.
 * This facade will be kept for backward compatibility.
 */

import { inject, Injectable, Signal } from '@angular/core';
import type { ChannelInfoData } from '@shared/dashboard-components/channel-info/channel-info.component';
import { ChannelAccessService } from '../channel-access/channel-access.service';
import {
  ChannelAccessInfo,
  ChannelInfo,
  ChannelTransformationService,
} from '../channel-transformation/channel-transformation.service';
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
   * @description Facade delegation — keeps consumers decoupled from ChannelAccessService while the refactoring is in progress.
   * @param channelId Channel ID
   * @returns True if user is member
   */
  isUserMember = (channelId: Signal<string>): Signal<boolean> => {
    return this.access.isUserMember(channelId);
  };

  /**
   * Check if current user is channel owner
   * @description Facade delegation for the owner-check; hides which underlying service performs the computation.
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
   * @description Facade delegation — assembles the access-screen data shape (name, member count, privacy) from the transformation service.
   * @param channelInfo Basic channel info
   * @returns Channel access information
   */
  getChannelAccessInfo = (channelInfo: Signal<ChannelInfo>): Signal<ChannelAccessInfo> => {
    return this.transformation.getChannelAccessInfo(channelInfo);
  };

  /**
   * Get channel info data for channel-info component
   * @description Facade delegation — transforms channel store data into the shape required by the channel-info component.
   * @param channelInfo Basic channel info
   * @returns Channel info data
   */
  getChannelInfoData = (channelInfo: Signal<ChannelInfo>): Signal<ChannelInfoData> => {
    return this.transformation.getChannelInfoData(channelInfo);
  };

  /**
   * Get channel members as user list items
   * @description Facade delegation — converts raw member IDs into display-ready UserListItem shapes for the member list UI.
   * @param channelId Channel ID
   * @returns Members list
   */
  getChannelMembers = (channelId: Signal<string>): Signal<UserListItem[]> => {
    return this.transformation.getChannelMembers(channelId);
  };

  /**
   * Get available users (not yet members)
   * @description Facade delegation — returns users not yet in the channel, used to populate the add-members picker.
   * @param channelId Channel ID
   * @returns Available users list
   */
  getAvailableUsers = (channelId: Signal<string>): Signal<UserListItem[]> => {
    return this.transformation.getAvailableUsers(channelId);
  };
}
