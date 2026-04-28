/**
 * @fileoverview Channel Conversation State Service
 * @description Centralizes channel-conversation derived signals for messages, members, and access gating to keep component code focused on orchestration.
 * @module core/services/channel-conversation-state
 */

import { computed, inject, Injectable, Signal } from '@angular/core';
import { ChannelConversationUIService } from '@core/services/channel-conversation-ui/channel-conversation-ui.service';
import type { ChannelInfo } from '@core/services/channel-data/channel-data.service';
import { MessageGroupingService } from '@core/services/message-grouping/message-grouping.service';
import { UserTransformationService } from '@core/services/user-transformation/user-transformation.service';
import type { MessageGroup } from '@shared/dashboard-components/conversation-messages/conversation-messages.component';
import type { MessageSearchItem } from '@shared/dashboard-components/message-search-item/message-search-item.component';
import type { EditProfileUser } from '@shared/dashboard-components/profile-edit/profile-edit.component';
import type { ProfileUser } from '@shared/dashboard-components/profile-view/profile-view.component';
import { AuthStore } from '@stores/auth';
import { ChannelMessageStore, ChannelStore } from '@stores/index';

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
   * @description Derives the live channel object from the store so the component always renders the latest Firestore snapshot.
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
   * @description Used to gate owner-only actions (edit/delete channel) without exposing raw store access to the component.
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
   * @description Determines whether the currently selected member sidebar profile belongs to the channel owner.
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
   * @description Distinguishes between viewing another user’s profile and the current user’s own profile to toggle edit vs. view mode.
   * @returns {Signal<boolean>} True if viewing own profile
   */
  getIsOwnProfile = () => {
    return computed(() => {
      return this.channelConversationUI.getSelectedMemberId()() === this.authStore.user()?.uid;
    });
  };

  /**
   * Get edit profile user
   * @description Resolves the selected member’s editable profile shape for the profile-edit overlay.
   * @returns {Signal<EditProfileUser | null>} Edit profile user or null
   */
  getEditProfileUser = (): Signal<EditProfileUser | null> => {
    return computed(() => {
      return this.userTransformation.toEditProfileUser(
        this.channelConversationUI.getSelectedMemberId()(),
      );
    });
  };

  /**
   * Get selected member as ProfileUser
   * @description Resolves the selected member’s display profile for the profile-view overlay without requiring the component to touch the user store.
   * @returns {Signal<ProfileUser | null>} Profile user or null
   */
  getSelectedMember = (): Signal<ProfileUser | null> => {
    return computed(() => {
      return this.userTransformation.toProfileUser(
        this.channelConversationUI.getSelectedMemberId()(),
      );
    });
  };

  /**
   * Get channel messages transformed for view
   * @description Converts raw Firestore message documents to view-ready Message objects with author names and timestamps.
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
   * @description Groups messages into date buckets so the template can render date-divider headers between conversation sections.
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
   * @description Reads the pagination flag from the message store to show or hide the “load older messages” button.
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
   * @description Exposes the loading spinner state for the pagination area so the component doesn’t need to reach into the message store directly.
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
   * @description Transforms channel messages into MessageSearchItem shapes, sorted newest-first, for use in the inline search overlay.
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
   * @description Extracts and transforms raw messages from the store; extracted as a helper to keep getSearchableMessages readable.
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
   * @description Orchestrates the two-step search-item pipeline: mapping to MessageSearchItem then sorting by timestamp.
   * @private
   * @param {any[]} messages - Messages to map
   * @param {string} channelId - Channel identifier
   * @param {string} channelName - Channel name
   * @returns {MessageSearchItem[]} Sorted search items
   */
  private mapAndSortMessages = (
    messages: any[],
    channelId: string,
    channelName: string,
  ): MessageSearchItem[] => {
    const searchItems = this.mapMessagesToSearchItems(messages, channelId, channelName);
    return this.sortMessagesByTimestamp(searchItems, messages);
  };

  /**
   * Map messages to search items
   * @description Creates MessageSearchItem objects with a composite ID (channelId_messageId) so they can be traced back to their source.
   * @private
   * @param {any[]} messages - Messages to map
   * @param {string} channelId - Channel identifier
   * @param {string} channelName - Channel name
   * @returns {MessageSearchItem[]} Search items
   */
  private mapMessagesToSearchItems = (
    messages: any[],
    channelId: string,
    channelName: string,
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
   * @description Clips content to 60 characters with ellipsis for compact search result previews.
   * @private
   * @param {string} content - Message content
   * @returns {string} Truncated content
   */
  private truncateContent = (content: string): string => {
    return content.substring(0, 60) + (content.length > 60 ? '...' : '');
  };

  /**
   * Sort messages by timestamp
   * @description Orders search items newest-first so users see the most recent matches at the top of the search overlay.
   * @private
   * @param {MessageSearchItem[]} items - Search items to sort
   * @param {any[]} messages - Original messages for timestamp
   * @returns {MessageSearchItem[]} Sorted items
   */
  private sortMessagesByTimestamp = (
    items: MessageSearchItem[],
    messages: any[],
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
   * @description Passes the channel members through unchanged; exists as a computed wrapper so the message-box component can receive a reactive signal.
   * @param {Signal} members - Channel members signal
   * @returns {Signal} Members in UserListItem format
   */
  getMemberListItems = (members: Signal<any[]>) => {
    return computed(() => members());
  };

  /**
   * Get channel list items for channel mentions
   * @description Provides all public channels except the current one for the # channel-mention picker inside the conversation.
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
   * @description Shows the add-member button only for public, non-system channels to prevent structural changes to welcome/onboarding channels.
   * @param {Signal<ChannelInfo>} channel - Channel info signal
   * @param {Signal} currentChannelData - Current channel data from store
   * @returns {Signal<boolean>} True if button should be visible
   */
  getShouldShowAddMemberButton = (
    channel: Signal<ChannelInfo>,
    currentChannelData: Signal<any>,
  ) => {
    return computed(() => {
      const channelData = currentChannelData() || channel();
      const isPublic = !channelData.isPrivate;
      const channelName = channelData.name;
      const isSpecialChannel = channelName === 'DABubble-welcome' || channelName === "Let's Bubble";
      return isPublic && !isSpecialChannel;
    });
  };

  /**
   * Check if access screen should be shown
   * @description Returns true when a non-owner, non-member visits a private channel, triggering the join/request-access flow.
   * @param {Signal<boolean>} isChannelOwner - Is current user owner
   * @param {Signal<boolean>} isMember - Is current user member
   * @param {Signal<boolean>} isJoiningChannel - Is user currently joining
   * @returns {Signal<boolean>} True if access screen should be shown
   */
  getShowAccessScreen = (
    isChannelOwner: Signal<boolean>,
    isMember: Signal<boolean>,
    isJoiningChannel: Signal<boolean>,
  ) => {
    return computed(() => {
      if (isChannelOwner()) return false;
      return !isMember() && !isJoiningChannel();
    });
  };
}
