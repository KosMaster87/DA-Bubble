/**
 * @fileoverview Chat Private State Service
 * @description Manages computed state for private chat component
 * @module core/services/chat-private-state
 */

import { Injectable, inject, computed, Signal } from '@angular/core';
import { DirectMessageStore, ChannelStore } from '@stores/index';
import { AuthStore } from '@stores/auth';
import { UserTransformationService } from '@core/services/user-transformation/user-transformation.service';
import { MessageGroupingService } from '@core/services/message-grouping/message-grouping.service';
import type { Message, MessageGroup } from '@shared/dashboard-components/conversation-messages/conversation-messages.component';
import type { UserListItem } from '@shared/dashboard-components/user-list-item/user-list-item.component';
import type { ChannelListItem } from '@shared/dashboard-components/channel-list-item/channel-list-item.component';
import type { MessageSearchItem } from '@shared/dashboard-components/message-search-item/message-search-item.component';
import type { ProfileUser } from '@shared/dashboard-components/profile-view/profile-view.component';
import type { EditProfileUser } from '@shared/dashboard-components/profile-edit/profile-edit.component';
import type { DMInfo } from '@features/dashboard/components/chat-private/chat-private.component';

@Injectable({ providedIn: 'root' })
export class ChatPrivateStateService {
  private directMessageStore = inject(DirectMessageStore);
  private channelStore = inject(ChannelStore);
  private authStore = inject(AuthStore);
  private userTransformation = inject(UserTransformationService);
  private messageGrouping = inject(MessageGroupingService);

  /**
   * Get other participant's user ID
   * @param {Signal<DMInfo>} dmInfo - DM info signal
   * @returns {Signal<string | null>} Other user ID or null
   */
  getOtherUserId = (dmInfo: Signal<DMInfo>) => {
    return computed(() => {
      const currentUserId = this.authStore.user()?.uid;
      if (!currentUserId) return null;

      const conversationId = dmInfo().conversationId;
      const conversation = this.directMessageStore.conversations().find(
        (c) => c.id === conversationId
      );
      if (!conversation) return null;

      return conversation.participants.find((id: string) => id !== currentUserId) || null;
    });
  };

  /**
   * Get user list item for header
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
   * @param {Signal<DMInfo>} dmInfo - DM info signal
   * @param {Signal<string | null>} otherUserId - Other user ID signal
   * @returns {Signal<UserListItem[]>} Participant list
   */
  getDmParticipantList = (dmInfo: Signal<DMInfo>, otherUserId: Signal<string | null>) => {
    return computed<UserListItem[]>(() => {
      const userId = otherUserId();
      if (!userId) return [];

      return [{
        id: userId,
        name: dmInfo().userName,
        avatar: dmInfo().userAvatar,
      }];
    });
  };

  /**
   * Get messages from DirectMessageStore
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
   * @private
   * @param {string} conversationId - Conversation ID
   * @param {string} userName - User name
   * @param {Message[]} messages - Messages array
   * @returns {MessageSearchItem[]} Search items
   */
  private createSearchItems = (
    conversationId: string,
    userName: string,
    messages: Message[]
  ): MessageSearchItem[] => {
    return messages.map(msg => ({
      id: `${conversationId}_${msg.id}`,
      displayName: `@${userName}`,
      description: this.truncateContent(msg.content),
      type: 'dm' as const
    }));
  };

  /**
   * Truncate message content
   * @private
   * @param {string} content - Content to truncate
   * @returns {string} Truncated content
   */
  private truncateContent = (content: string): string => {
    return content.substring(0, 60) + (content.length > 60 ? '...' : '');
  };

  /**
   * Sort search items by timestamp
   * @private
   * @param {MessageSearchItem[]} items - Items to sort
   * @param {Message[]} messages - Messages for timestamp lookup
   * @returns {MessageSearchItem[]} Sorted items
   */
  private sortSearchItemsByTimestamp = (
    items: MessageSearchItem[],
    messages: Message[]
  ): MessageSearchItem[] => {
    return items.sort((a, b) => {
      const msgA = messages.find(m => m.id === a.id.split('_')[1]);
      const msgB = messages.find(m => m.id === b.id.split('_')[1]);
      if (!msgA || !msgB) return 0;
      return msgB.timestamp.getTime() - msgA.timestamp.getTime();
    });
  };
}
