/**
 * @fileoverview Thread State Service
 * @description Builds all thread-view derived state in one place so ThreadComponent remains focused on interaction wiring.
 * @module core/services/thread-state
 */

import { computed, inject, Injectable, Signal } from '@angular/core';
import { MessageGroupingService } from '@core/services/message-grouping/message-grouping.service';
import { UserTransformationService } from '@core/services/user-transformation/user-transformation.service';
import type { ThreadInfo } from '@features/dashboard/components/thread/thread.component';
import type { ChannelListItem } from '@shared/dashboard-components/channel-list-item/channel-list-item.component';
import type { Message, MessageGroup } from '@shared/dashboard-components/conversation-messages/conversation-messages.component';
import type { MessageSearchItem } from '@shared/dashboard-components/message-search-item/message-search-item.component';
import type { EditProfileUser } from '@shared/dashboard-components/profile-edit/profile-edit.component';
import type { ProfileUser } from '@shared/dashboard-components/profile-view/profile-view.component';
import type { UserListItem } from '@shared/dashboard-components/user-list-item/user-list-item.component';
import { AuthStore } from '@stores/auth';
import { ChannelStore } from '@stores/channels/channel.store';
import { ThreadStore } from '@stores/threads/thread.store';
import { UserStore } from '@stores/users/user.store';

@Injectable({ providedIn: 'root' })
export class ThreadStateService {
  private threadStore = inject(ThreadStore);
  private channelStore = inject(ChannelStore);
  private userStore = inject(UserStore);
  private authStore = inject(AuthStore);
  private userTransformation = inject(UserTransformationService);
  private messageGrouping = inject(MessageGroupingService);

  /**
   * Get thread replies loaded from store
   * @description Converts raw thread store messages to view-ready Message objects; returns an empty array until the parent message ID is available.
   * @param {Signal<ThreadInfo>} threadInfo - Thread info signal
   * @returns {Signal<Message[]>} Thread replies as view messages
   */
  getReplies = (threadInfo: Signal<ThreadInfo>) => {
    return computed<Message[]>(() => {
      const info = threadInfo();
      if (!info?.parentMessageId) return [];

      const threadMessages = this.threadStore.getThreadsByMessageId()(info.parentMessageId);
      return this.userTransformation.threadMessagesToViewMessages(threadMessages);
    });
  };

  /**
   * Get searchable replies formatted for MessageBox
   * @description Maps thread replies to MessageSearchItem shapes sorted newest-first for the inline search overlay.
   * @param {Signal<ThreadInfo>} threadInfo - Thread info signal
   * @param {Signal<Message[]>} replies - Replies signal
   * @returns {Signal<MessageSearchItem[]>} Searchable message items
   */
  getSearchableReplies = (threadInfo: Signal<ThreadInfo>, replies: Signal<Message[]>) => {
    return computed<MessageSearchItem[]>(() => {
      const info = threadInfo();
      if (!info) return [];

      const items = this.createSearchItems(info, replies());
      return this.sortSearchItemsByTimestamp(items, replies());
    });
  };

  /**
   * Get thread participants for mentions
   * @description Returns the single DM partner for DM threads, or the full channel member list for channel threads, so the mention picker shows the right people.
   * @param {Signal<ThreadInfo>} threadInfo - Thread info signal
   * @param {Signal<Message[]>} replies - Replies signal
   * @returns {Signal<UserListItem[]>} Thread participants
   */
  getThreadParticipants = (threadInfo: Signal<ThreadInfo>, replies: Signal<Message[]>) => {
    return computed<UserListItem[]>(() => {
      const info = threadInfo();
      if (!info?.channelId) return [];

      if (info.isDirectMessage) {
        return this.getDMParticipant(replies());
      }

      return this.getChannelMembers(info.channelId);
    });
  };

  /**
   * Get public channels for channel mentions
   * @description Provides the channel list for the # channel-mention picker inside thread conversations.
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
   * Get replies grouped by date
   * @description Delegates to the MessageGroupingService to bucket replies by calendar date for date-divider rendering.
   * @param {Signal<Message[]>} replies - Replies signal
   * @returns {Signal<MessageGroup[]>} Grouped messages
   */
  getRepliesGroupedByDate = (replies: Signal<Message[]>) => {
    return computed<MessageGroup[]>(() => {
      return this.messageGrouping.groupMessagesByDate(replies());
    });
  };

  /**
   * Get reply count
   * @description Exposes the reply count as a reactive signal so the thread header updates without manual subscriptions.
   * @param {Signal<Message[]>} replies - Replies signal
   * @returns {Signal<number>} Total reply count
   */
  getReplyCount = (replies: Signal<Message[]>) => {
    return computed(() => replies().length);
  };

  /**
   * Get selected user profile
   * @description Resolves the selected user’s profile for the profile-view overlay within the thread sidebar.
   * @param {Signal<string | null>} selectedUserId - Selected user ID signal
   * @returns {Signal<ProfileUser | null>} Profile user or null
   */
  getSelectedUserProfile = (selectedUserId: Signal<string | null>) => {
    return computed<ProfileUser | null>(() => {
      return this.userTransformation.toProfileUser(selectedUserId());
    });
  };

  /**
   * Get edit profile user
   * @description Resolves the edit-profile shape for the selected user inside the thread sidebar.
   * @param {Signal<string | null>} selectedUserId - Selected user ID signal
   * @returns {Signal<EditProfileUser | null>} Edit profile user or null
   */
  getEditProfileUser = (selectedUserId: Signal<string | null>) => {
    return computed<EditProfileUser | null>(() => {
      return this.userTransformation.toEditProfileUser(selectedUserId());
    });
  };

  /**
   * Check if selected profile is own profile
   * @description Determines whether to show edit controls in the thread sidebar’s profile overlay.
   * @param {Signal<string | null>} selectedUserId - Selected user ID signal
   * @returns {Signal<boolean>} True if own profile
   */
  getIsOwnProfile = (selectedUserId: Signal<string | null>) => {
    return computed(() => {
      return selectedUserId() === this.authStore.user()?.uid;
    });
  };

  /**
   * Create search items from replies
   * @description Builds MessageSearchItem objects using a composite ID (containerId_messageId) for unique identification across channels and DMs.
   * @private
   * @param {ThreadInfo} info - Thread info
   * @param {Message[]} replies - Reply messages
   * @returns {MessageSearchItem[]} Search items
   */
  private createSearchItems = (info: ThreadInfo, replies: Message[]): MessageSearchItem[] => {
    const displayName = info.isDirectMessage ? `@${info.channelName}` : `#${info.channelName}`;
    const containerId = info.isDirectMessage ? info.parentMessageId : info.channelId;

    return replies.map(msg => ({
      id: `${containerId}_${msg.id}`,
      displayName,
      description: this.truncateContent(msg.content),
      type: info.isDirectMessage ? 'dm' as const : 'channel' as const
    }));
  };

  /**
   * Truncate message content for search display
   * @description Clips content at 60 characters so search result previews fit a single line.
   * @private
   * @param {string} content - Message content
   * @returns {string} Truncated content
   */
  private truncateContent = (content: string): string => {
    return content.substring(0, 60) + (content.length > 60 ? '...' : '');
  };

  /**
   * Sort search items by timestamp descending
   * @description Orders results newest-first using the source message timestamps for consistent ordering in the search overlay.
   * @private
   * @param {MessageSearchItem[]} items - Search items
   * @param {Message[]} replies - Reply messages
   * @returns {MessageSearchItem[]} Sorted items
   */
  private sortSearchItemsByTimestamp = (
    items: MessageSearchItem[],
    replies: Message[]
  ): MessageSearchItem[] => {
    return items.sort((a, b) => {
      const msgA = replies.find(m => m.id === a.id.split('_')[1]);
      const msgB = replies.find(m => m.id === b.id.split('_')[1]);
      if (!msgA || !msgB) return 0;
      return msgB.timestamp.getTime() - msgA.timestamp.getTime();
    });
  };

  /**
   * Get DM participant from replies
   * @description Finds the non-current-user reply author so DM thread participants always show the other person rather than the current user.
   * @private
   * @param {Message[]} replies - Reply messages
   * @returns {UserListItem[]} DM participant list
   */
  private getDMParticipant = (replies: Message[]): UserListItem[] => {
    if (replies.length === 0) return [];

    const currentUserId = this.authStore.user()?.uid;
    const otherUser = replies.find(r => r.senderId !== currentUserId);
    if (!otherUser) return [];

    return [{
      id: otherUser.senderId,
      name: otherUser.senderName,
      avatar: otherUser.senderAvatar,
    }];
  };

  /**
   * Get channel members as user list items
   * @description Resolves channel member UIDs to UserListItem shapes for the mention picker without leaking store access into the component.
   * @private
   * @param {string} channelId - Channel ID
   * @returns {UserListItem[]} Channel members
   */
  private getChannelMembers = (channelId: string): UserListItem[] => {
    const channel = this.channelStore.channels().find(c => c.id === channelId);
    if (!channel?.members) return [];

    const allUsers = this.userStore.users();
    return channel.members
      .map((memberId: string) => {
        const user = allUsers.find(u => u.uid === memberId);
        if (!user) return null;
        return {
          id: user.uid,
          name: user.displayName,
          avatar: user.photoURL || '',
        } as UserListItem;
      })
      .filter((u): u is UserListItem => u !== null);
  };

  /**
   * Check if thread info is valid
   * @description Guards against rendering the thread panel before both required IDs (parentMessageId and channelId) are available.
   * @param {ThreadInfo} info - Thread info to validate
   * @returns {boolean} True if valid
   */
  isValidThreadInfo = (info: ThreadInfo): boolean => {
    return !!(info?.parentMessageId && info?.channelId);
  };

  /**
   * Check if thread info has changed
   * @description Compares the new thread info against the last-rendered IDs to avoid reloading the same thread on signal re-evaluations.
   * @param {ThreadInfo} info - Current thread info
   * @param {string | null} lastChannelId - Last channel ID
   * @param {string | null} lastMessageId - Last message ID
   * @returns {boolean} True if changed
   */
  hasThreadInfoChanged = (
    info: ThreadInfo,
    lastChannelId: string | null,
    lastMessageId: string | null
  ): boolean => {
    return info.channelId !== lastChannelId || info.parentMessageId !== lastMessageId;
  };

  /**
   * Check if thread can be marked as read
   * @description Validates all three required fields before triggering a read-mark call to avoid writing incomplete Firestore paths.
   * @param {ThreadInfo} info - Thread info
   * @param {string | undefined} currentUserId - Current user ID
   * @returns {boolean} True if can mark as read
   */
  canMarkAsRead = (info: ThreadInfo, currentUserId: string | undefined): boolean => {
    return !!(info?.parentMessageId && currentUserId && info?.channelId);
  };

  /**
   * Check if thread should be marked as read
   * @description Returns true only when the count has grown, preventing redundant read-marks when the signal re-evaluates without new replies.
   * @param {number} currentCount - Current reply count
   * @param {number} previousCount - Previous reply count
   * @returns {boolean} True if should mark as read
   */
  shouldMarkAsRead = (currentCount: number, previousCount: number): boolean => {
    return currentCount > previousCount && currentCount > 0;
  };
}
