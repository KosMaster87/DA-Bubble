/**
 * @fileoverview Channel Conversation State Service
 * @description Manages computed state for channel conversation component
 * @module core/services/channel-conversation-state
 */

import { Injectable, inject, computed, Signal } from '@angular/core';
import { AuthStore } from '@stores/auth';
import { ChannelStore, ChannelMessageStore } from '@stores/index';
import { UserTransformationService } from '@core/services/user-transformation/user-transformation.service';
import { MessageGroupingService } from '@core/services/message-grouping/message-grouping.service';
import { ChannelConversationUIService } from '@core/services/channel-conversation-ui/channel-conversation-ui.service';
import type { ChannelInfo } from '@core/services/channel-data/channel-data.service';
import type { ProfileUser } from '@shared/dashboard-components/profile-view/profile-view.component';
import type { EditProfileUser } from '@shared/dashboard-components/profile-edit/profile-edit.component';
import type { MessageGroup } from '@shared/dashboard-components/conversation-messages/conversation-messages.component';
import type { MessageSearchItem } from '@shared/dashboard-components/message-search-item/message-search-item.component';

@Injectable({ providedIn: 'root' })
export class ChannelConversationStateService {
  private authStore = inject(AuthStore);
  private channelStore = inject(ChannelStore);
  private channelMessageStore = inject(ChannelMessageStore);
  private userTransformation = inject(UserTransformationService);
  private messageGrouping = inject(MessageGroupingService);
  private channelConversationUI = inject(ChannelConversationUIService);

  /**
   * Get current channel data from store
   * @param {Signal<ChannelInfo>} channel - Channel info signal
   * @returns {Signal} Computed channel data from store
   */
  getCurrentChannelData = (channel: Signal<ChannelInfo>) => {
    return computed(() => {
      const ch = channel();
      return this.channelStore.getChannelById()(ch.id);
    });
  };

  /**
   * Check if current user is channel owner
   * @param {Signal<ChannelInfo>} channel - Channel info signal
   * @returns {Signal<boolean>} True if current user owns channel
   */
  getIsChannelOwner = (channel: Signal<ChannelInfo>) => {
    return computed(() => {
      const currentUserId = this.authStore.user()?.uid;
      const channelData = this.channelStore.getChannelById()(channel().id);
      return currentUserId && channelData ? currentUserId === channelData.createdBy : false;
    });
  };

  /**
   * Get selected user channel owner status
   * @param {Signal<ChannelInfo>} channel - Channel info signal
   * @returns {Signal<boolean>} True if selected user owns channel
   */
  getIsSelectedUserChannelOwner = (channel: Signal<ChannelInfo>) => {
    return computed(() => {
      const channelData = this.channelStore.getChannelById()(channel().id);
      const selectedUserId = this.channelConversationUI.getSelectedMemberId()();
      return channelData?.createdBy === selectedUserId;
    });
  };

  /**
   * Check if viewing own profile
   * @returns {Signal<boolean>} True if viewing own profile
   */
  getIsOwnProfile = () => {
    return computed(() => {
      return this.channelConversationUI.getSelectedMemberId()() === this.authStore.user()?.uid;
    });
  };

  /**
   * Get edit profile user
   * @returns {Signal<EditProfileUser | null>} Edit profile user or null
   */
  getEditProfileUser = (): Signal<EditProfileUser | null> => {
    return computed(() => {
      return this.userTransformation.toEditProfileUser(
        this.channelConversationUI.getSelectedMemberId()()
      );
    });
  };

  /**
   * Get selected member as ProfileUser
   * @returns {Signal<ProfileUser | null>} Profile user or null
   */
  getSelectedMember = (): Signal<ProfileUser | null> => {
    return computed(() => {
      return this.userTransformation.toProfileUser(
        this.channelConversationUI.getSelectedMemberId()()
      );
    });
  };

  /**
   * Get channel messages transformed for view
   * @param {Signal<ChannelInfo>} channel - Channel info signal
   * @returns {Signal} Transformed channel messages
   */
  getMessages = (channel: Signal<ChannelInfo>) => {
    return computed(() => {
      const channelId = channel().id;
      const rawMessages = this.channelMessageStore.getMessagesByChannel()(channelId);
      return this.userTransformation.channelMessagesToViewMessages(rawMessages);
    });
  };

  /**
   * Get messages grouped by date
   * @param {Signal<ChannelInfo>} channel - Channel info signal
   * @returns {Signal<MessageGroup[]>} Messages grouped by date
   */
  getMessagesGroupedByDate = (channel: Signal<ChannelInfo>) => {
    return computed<MessageGroup[]>(() => {
      const channelId = channel().id;
      const rawMessages = this.channelMessageStore.getMessagesByChannel()(channelId);
      const messages = this.userTransformation.channelMessagesToViewMessages(rawMessages);
      return this.messageGrouping.groupMessagesByDate(messages);
    });
  };

  /**
   * Check if has more messages
   * @param {Signal<ChannelInfo>} channel - Channel info signal
   * @returns {Signal<boolean>} True if more messages available
   */
  getHasMoreMessages = (channel: Signal<ChannelInfo>) => {
    return computed(() => {
      const channelId = channel().id;
      return this.channelMessageStore.hasMoreMessages()[channelId] ?? false;
    });
  };

  /**
   * Check if loading older messages
   * @param {Signal<ChannelInfo>} channel - Channel info signal
   * @returns {Signal<boolean>} True if loading older messages
   */
  getLoadingOlderMessages = (channel: Signal<ChannelInfo>) => {
    return computed(() => {
      const channelId = channel().id;
      return this.channelMessageStore.loadingOlderMessages()[channelId] ?? false;
    });
  };

  /**
   * Get searchable messages for MessageBox
   * @param {Signal<ChannelInfo>} channel - Channel info signal
   * @returns {Signal<MessageSearchItem[]>} Searchable message items
   */
  getSearchableMessages = (channel: Signal<ChannelInfo>) => {
    return computed<MessageSearchItem[]>(() => {
      const channelId = channel().id;
      const channelName = channel().name;
      const messages = this.getTransformedMessages(channelId);
      return this.mapAndSortMessages(messages, channelId, channelName);
    });
  };

  /**
   * Get transformed channel messages
   * @private
   * @param {string} channelId - Channel identifier
   * @returns {any[]} Transformed messages
   */
  private getTransformedMessages = (channelId: string): any[] => {
    const rawMessages = this.channelMessageStore.getMessagesByChannel()(channelId);
    return this.userTransformation.channelMessagesToViewMessages(rawMessages);
  };

  /**
   * Map and sort messages for search
   * @private
   * @param {any[]} messages - Messages to map
   * @param {string} channelId - Channel identifier
   * @param {string} channelName - Channel name
   * @returns {MessageSearchItem[]} Sorted search items
   */
  private mapAndSortMessages = (
    messages: any[],
    channelId: string,
    channelName: string
  ): MessageSearchItem[] => {
    const searchItems = this.mapMessagesToSearchItems(messages, channelId, channelName);
    return this.sortMessagesByTimestamp(searchItems, messages);
  };

  /**
   * Map messages to search items
   * @private
   * @param {any[]} messages - Messages to map
   * @param {string} channelId - Channel identifier
   * @param {string} channelName - Channel name
   * @returns {MessageSearchItem[]} Search items
   */
  private mapMessagesToSearchItems = (
    messages: any[],
    channelId: string,
    channelName: string
  ): MessageSearchItem[] => {
    return messages.map((msg) => ({
      id: `${channelId}_${msg.id}`,
      displayName: `#${channelName}`,
      description: this.truncateContent(msg.content),
      type: 'channel' as const,
    }));
  };

  /**
   * Truncate message content
   * @private
   * @param {string} content - Message content
   * @returns {string} Truncated content
   */
  private truncateContent = (content: string): string => {
    return content.substring(0, 60) + (content.length > 60 ? '...' : '');
  };

  /**
   * Sort messages by timestamp
   * @private
   * @param {MessageSearchItem[]} items - Search items to sort
   * @param {any[]} messages - Original messages for timestamp
   * @returns {MessageSearchItem[]} Sorted items
   */
  private sortMessagesByTimestamp = (
    items: MessageSearchItem[],
    messages: any[]
  ): MessageSearchItem[] => {
    return items.sort((a, b) => {
      const msgA = messages.find((m) => m.id === a.id.split('_')[1]);
      const msgB = messages.find((m) => m.id === b.id.split('_')[1]);
      if (!msgA || !msgB) return 0;
      return msgB.timestamp.getTime() - msgA.timestamp.getTime();
    });
  };

  /**
   * Get member list items for message-box
   * @param {Signal} members - Channel members signal
   * @returns {Signal} Members in UserListItem format
   */
  getMemberListItems = (members: Signal<any[]>) => {
    return computed(() => members());
  };

  /**
   * Get channel list items for channel mentions
   * @param {Signal<ChannelInfo>} channel - Current channel info
   * @returns {Signal} Public channels excluding current channel
   */
  getChannelListItems = (channel: Signal<ChannelInfo>) => {
    return computed(() => {
      return this.channelStore
        .getPublicChannels()
        .filter((ch) => ch.id !== channel().id)
        .map((ch) => ({ id: ch.id, name: ch.name }));
    });
  };

  /**
   * Check if add member button should be shown
   * @param {Signal<ChannelInfo>} channel - Channel info signal
   * @param {Signal} currentChannelData - Current channel data from store
   * @returns {Signal<boolean>} True if button should be visible
   */
  getShouldShowAddMemberButton = (
    channel: Signal<ChannelInfo>,
    currentChannelData: Signal<any>
  ) => {
    return computed(() => {
      const channelData = currentChannelData() || channel();
      const isPublic = !channelData.isPrivate;
      const channelName = channelData.name;
      const isSpecialChannel =
        channelName === 'DABubble-welcome' || channelName === "Let's Bubble";
      return isPublic && !isSpecialChannel;
    });
  };

  /**
   * Check if access screen should be shown
   * @param {Signal<boolean>} isChannelOwner - Is current user owner
   * @param {Signal<boolean>} isMember - Is current user member
   * @param {Signal<boolean>} isJoiningChannel - Is user currently joining
   * @returns {Signal<boolean>} True if access screen should be shown
   */
  getShowAccessScreen = (
    isChannelOwner: Signal<boolean>,
    isMember: Signal<boolean>,
    isJoiningChannel: Signal<boolean>
  ) => {
    return computed(() => {
      if (isChannelOwner()) return false;
      return !isMember() && !isJoiningChannel();
    });
  };
}
