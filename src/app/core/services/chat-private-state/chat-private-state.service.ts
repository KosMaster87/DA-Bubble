/**
 * @fileoverview Chat Private State Service
 * @description Builds private-chat derived view state so DM components can consume reactive UI-ready data without duplicating transformation logic.
 * @module core/services/chat-private-state
 */

import { computed, inject, Injectable, Signal } from '@angular/core';
import { MessageGroupingService } from '@core/services/message-grouping/message-grouping.service';
import { UserTransformationService } from '@core/services/user-transformation/user-transformation.service';
import type { DMInfo } from '@features/dashboard/components/chat-private/chat-private.component';
import type { ChannelListItem } from '@shared/dashboard-components/channel-list-item/channel-list-item.component';
import type {
    Message,
    MessageGroup,
} from '@shared/dashboard-components/conversation-messages/conversation-messages.component';
import type { MessageSearchItem } from '@shared/dashboard-components/message-search-item/message-search-item.component';
import type { EditProfileUser } from '@shared/dashboard-components/profile-edit/profile-edit.component';
import type { ProfileUser } from '@shared/dashboard-components/profile-view/profile-view.component';
import type { UserListItem } from '@shared/dashboard-components/user-list-item/user-list-item.component';
import { AuthStore } from '@stores/auth';
import { ChannelStore, DirectMessageStore } from '@stores/index';

@Injectable({ providedIn: 'root' })
export class ChatPrivateStateService {
  private directMessageStore = inject(DirectMessageStore);
  private channelStore = inject(ChannelStore);
  private authStore = inject(AuthStore);
  private userTransformation = inject(UserTransformationService);
  private messageGrouping = inject(MessageGroupingService);

  /**
   * Get other participant's user ID
   * @description Resolves the conversation partner’s UID from the conversation participants list, excluding the current user.
   * @param {Signal<DMInfo>} dmInfo - DM info signal
   * @returns {Signal<string | null>} Other user ID or null
   */
  getOtherUserId = (dmInfo: Signal<DMInfo>) => {
    return computed(() => {
      const currentUserId = this.authStore.user()?.uid;
      if (!currentUserId) return null;

      const conversationId = dmInfo().conversationId;
      const conversation = this.directMessageStore
        .conversations()
        .find((c) => c.id === conversationId);
      if (!conversation) return null;

      return conversation.participants.find((id: string) => id !== currentUserId) || null;
    });
  };

  /**
   * Get user list item for header
   * @description Builds the header-compatible UserListItem from DMInfo so the chat header doesn’t need to query the user store.
   * @param {Signal<DMInfo>} dmInfo - DM info signal
   * @param {Signal<string | null>} otherUserId - Other user ID signal
   * @returns {Signal<UserListItem>} User list item
   */
  getUserListItem = (dmInfo: Signal<DMInfo>, otherUserId: Signal<string | null>) => {
    return computed<UserListItem>(() => {
      const userId = otherUserId() || this.authStore.user()?.uid || '';
      return {
        id: userId,
        name: dmInfo().userName,
        avatar: dmInfo().userAvatar,
      };
    });
  };

  /**
   * Get DM participant as list for mentions
   * @description Wraps the single DM partner in an array so the mention-picker component receives a homogeneous UserListItem[] regardless of context.
   * @param {Signal<DMInfo>} dmInfo - DM info signal
   * @param {Signal<string | null>} otherUserId - Other user ID signal
   * @returns {Signal<UserListItem[]>} Participant list
   */
  getDmParticipantList = (dmInfo: Signal<DMInfo>, otherUserId: Signal<string | null>) => {
    return computed<UserListItem[]>(() => {
      const userId = otherUserId();
      if (!userId) return [];

      return [
        {
          id: userId,
          name: dmInfo().userName,
          avatar: dmInfo().userAvatar,
        },
      ];
    });
  };

  /**
   * Get messages from DirectMessageStore
   * @description Retrieves raw DM messages for the conversation and maps them to view-ready Message objects.
   * @param {Signal<DMInfo>} dmInfo - DM info signal
   * @returns {Signal<Message[]>} Conversation messages
   */
  getMessages = (dmInfo: Signal<DMInfo>) => {
    return computed<Message[]>(() => {
      const conversationId = dmInfo().conversationId;
      const conversationMessages = this.directMessageStore.messages()[conversationId] || [];
      return this.userTransformation.directMessagesToViewMessages(conversationMessages);
    });
  };

  /**
   * Get searchable messages for MessageBox
   * @description Transforms DM messages into the MessageSearchItem shape and sorts them newest-first for the search overlay.
   * @param {Signal<DMInfo>} dmInfo - DM info signal
   * @param {Signal<Message[]>} messages - Messages signal
   * @returns {Signal<MessageSearchItem[]>} Searchable messages
   */
  getSearchableMessages = (dmInfo: Signal<DMInfo>, messages: Signal<Message[]>) => {
    return computed<MessageSearchItem[]>(() => {
      const conversationId = dmInfo().conversationId;
      const userName = dmInfo().userName;
      const items = this.createSearchItems(conversationId, userName, messages());
      return this.sortSearchItemsByTimestamp(items, messages());
    });
  };

  /**
   * Get public channels for channel mentions
   * @description Provides the channel list for the @ mention picker inside DM conversations.
   * @returns {Signal<ChannelListItem[]>} Channel list items
   */
  getChannelListItems = () => {
    return computed<ChannelListItem[]>(() => {
      return this.channelStore.getPublicChannels().map((ch) => ({
        id: ch.id,
        name: ch.name,
      }));
    });
  };

  /**
   * Check if more messages available
   * @description Reads the pagination flag from the DM store to show or hide the “load older messages” control.
   * @param {Signal<DMInfo>} dmInfo - DM info signal
   * @returns {Signal<boolean>} True if more messages
   */
  getHasMoreMessages = (dmInfo: Signal<DMInfo>) => {
    return computed(() => {
      const conversationId = dmInfo().conversationId;
      return this.directMessageStore.hasMoreMessages()[conversationId] ?? false;
    });
  };

  /**
   * Check if loading older messages
   * @description Exposes the loading flag for the conversation’s pagination state so the UI can show a spinner.
   * @param {Signal<DMInfo>} dmInfo - DM info signal
   * @returns {Signal<boolean>} True if loading
   */
  getLoadingOlderMessages = (dmInfo: Signal<DMInfo>) => {
    return computed(() => {
      const conversationId = dmInfo().conversationId;
      return this.directMessageStore.loadingOlderMessages()[conversationId] ?? false;
    });
  };

  /**
   * Get messages grouped by date
   * @description Groups the conversation messages by calendar date so the template can render date dividers.
   * @param {Signal<Message[]>} messages - Messages signal
   * @returns {Signal<MessageGroup[]>} Grouped messages
   */
  getMessagesGroupedByDate = (messages: Signal<Message[]>) => {
    return computed<MessageGroup[]>(() => {
      return this.messageGrouping.groupMessagesByDate(messages());
    });
  };

  /**
   * Get selected user's profile
   * @description Resolves the selected user’s profile for the profile-view overlay without duplicating user store lookups in the component.
   * @param {Signal<string | null>} selectedUserId - Selected user ID signal
   * @returns {Signal<ProfileUser | null>} User profile or null
   */
  getSelectedUserProfile = (selectedUserId: Signal<string | null>) => {
    return computed<ProfileUser | null>(() => {
      return this.userTransformation.toProfileUser(selectedUserId());
    });
  };

  /**
   * Get user for edit profile
   * @description Resolves the edit-profile shape for the selected user, used when the current user opens their own profile editor.
   * @param {Signal<string | null>} selectedUserId - Selected user ID signal
   * @returns {Signal<EditProfileUser | null>} Edit profile user or null
   */
  getEditProfileUser = (selectedUserId: Signal<string | null>) => {
    return computed<EditProfileUser | null>(() => {
      return this.userTransformation.toEditProfileUser(selectedUserId());
    });
  };

  /**
   * Check if viewing own profile
   * @description Determines whether to show edit-profile controls; only the current user can edit their own profile.
   * @param {Signal<string | null>} selectedUserId - Selected user ID signal
   * @returns {Signal<boolean>} True if own profile
   */
  getIsOwnProfile = (selectedUserId: Signal<string | null>) => {
    return computed(() => {
      return selectedUserId() === this.authStore.user()?.uid;
    });
  };

  /**
   * Create search items from messages
   * @description Maps DM messages to the MessageSearchItem shape; the composite ID embeds both conversationId and messageId for unique keying.
   * @private
   * @param {string} conversationId - Conversation ID
   * @param {string} userName - User name
   * @param {Message[]} messages - Messages array
   * @returns {MessageSearchItem[]} Search items
   */
  private createSearchItems = (
    conversationId: string,
    userName: string,
    messages: Message[],
  ): MessageSearchItem[] => {
    return messages.map((msg) => ({
      id: `${conversationId}_${msg.id}`,
      displayName: `@${userName}`,
      description: this.truncateContent(msg.content),
      type: 'dm' as const,
    }));
  };

  /**
   * Truncate message content
   * @description Clips content to 60 characters with an ellipsis for use in compact search-result previews.
   * @private
   * @param {string} content - Content to truncate
   * @returns {string} Truncated content
   */
  private truncateContent = (content: string): string => {
    return content.substring(0, 60) + (content.length > 60 ? '...' : '');
  };

  /**
   * Sort search items by timestamp
   * @description Orders search results newest-first using message timestamps so users see the most recent matches first.
   * @private
   * @param {MessageSearchItem[]} items - Items to sort
   * @param {Message[]} messages - Messages for timestamp lookup
   * @returns {MessageSearchItem[]} Sorted items
   */
  private sortSearchItemsByTimestamp = (
    items: MessageSearchItem[],
    messages: Message[],
  ): MessageSearchItem[] => {
    return items.sort((a, b) => {
      const msgA = messages.find((m) => m.id === a.id.split('_')[1]);
      const msgB = messages.find((m) => m.id === b.id.split('_')[1]);
      if (!msgA || !msgB) return 0;
      return msgB.timestamp.getTime() - msgA.timestamp.getTime();
    });
  };
}
