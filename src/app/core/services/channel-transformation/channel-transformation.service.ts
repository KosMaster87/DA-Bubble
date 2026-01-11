/**
 * @fileoverview Channel Transformation Service
 * @description Transforms channel data into UI-ready formats
 * @module core/services/channel-transformation
 */

import { Injectable, inject, computed, Signal } from '@angular/core';
import { ChannelStore, UserStore } from '@stores/index';
import {
  UserTransformationService,
  UserListItem,
} from '../user-transformation/user-transformation.service';
import type { ChannelInfoData } from '@shared/dashboard-components/channel-info/channel-info.component';

/**
 * Channel access information for access screen
 */
export interface ChannelAccessInfo {
  channelId: string;
  channelName: string;
  isPrivate: boolean;
  description: string;
  rules: string[];
}

/**
 * Basic channel information
 */
export interface ChannelInfo {
  id: string;
  name: string;
  description: string;
  isPrivate: boolean;
  memberCount: number;
}

@Injectable({
  providedIn: 'root',
})
export class ChannelTransformationService {
  private channelStore = inject(ChannelStore);
  private userStore = inject(UserStore);
  private userTransformation = inject(UserTransformationService);

  /**
   * Get channel access info for access screen
   * @param channelInfo Basic channel info
   * @returns Channel access information
   */
  getChannelAccessInfo = (channelInfo: Signal<ChannelInfo>): Signal<ChannelAccessInfo> => {
    return computed(() => {
      const channel = channelInfo();
      const channelData = this.channelStore.getChannelById()(channel.id);

      return {
        channelId: channel.id,
        channelName: channel.name,
        isPrivate: channel.isPrivate,
        description: channelData?.description || channel.description,
        rules: [],
      };
    });
  };

  /**
   * Get channel info data for channel-info component
   * @param channelInfo Basic channel info
   * @returns Channel info data
   */
  getChannelInfoData = (channelInfo: Signal<ChannelInfo>): Signal<ChannelInfoData> => {
    return computed(() => {
      const ch = channelInfo();
      const channelData = this.channelStore.getChannelById()(ch.id);
      return channelData
        ? this.buildChannelInfoFromData(channelData)
        : this.buildDefaultChannelInfo(ch);
    });
  };

  /**
   * Get channel members as user list items
   * @param channelId Channel ID
   * @returns Members list
   */
  getChannelMembers = (channelId: Signal<string>): Signal<UserListItem[]> => {
    return computed(() => {
      const channelData = this.channelStore.getChannelById()(channelId());
      if (!channelData || !channelData.members) return [];
      return this.userTransformation.mapMembersToListItems(channelData.members);
    });
  };

  /**
   * Get available users (not yet members)
   * @param channelId Channel ID
   * @returns Available users list
   */
  getAvailableUsers = (channelId: Signal<string>): Signal<UserListItem[]> => {
    return computed(() => {
      const channelData = this.channelStore.getChannelById()(channelId());
      const currentMemberIds = channelData?.members || [];

      return this.userStore
        .users()
        .filter((user) => !currentMemberIds.includes(user.uid))
        .map((user) => ({
          id: user.uid,
          name: user.displayName,
          avatar: user.photoURL || '/img/profile/profile-0.svg',
        }));
    });
  };

  /**
   * Build channel info from channel data
   * @param channelData Channel data from store
   * @returns Channel info data
   */
  private buildChannelInfoFromData = (channelData: any): ChannelInfoData => {
    const creatorName = this.userTransformation.getUserDisplayName(channelData.createdBy);
    const admins = this.userTransformation.mapChannelAdmins(channelData.admins);

    return {
      id: channelData.id,
      name: channelData.name,
      description: channelData.description,
      isPrivate: channelData.isPrivate,
      createdBy: channelData.createdBy,
      createdByName: creatorName,
      admins,
    };
  };

  /**
   * Build default channel info when no data available
   * @param ch Basic channel info
   * @returns Default channel info data
   */
  private buildDefaultChannelInfo = (ch: ChannelInfo): ChannelInfoData => {
    return {
      id: ch.id,
      name: ch.name,
      description: ch.description,
      isPrivate: false,
      createdBy: '',
      createdByName: 'Unknown',
      admins: [],
    };
  };
}
