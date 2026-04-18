/**
 * @fileoverview Direct Message List Service
 * @description Handles DM list sorting, filtering, and unread badge calculations
 * @module core/services/direct-message-list
 */

import { computed, inject, Injectable, Signal } from '@angular/core';
import { DirectMessage, type DirectMessageConversation } from '@core/models/direct-message.model';
import { type User } from '@core/models/user.model';
import { NavigationService } from '@core/services/navigation/navigation.service';
import { UnreadService } from '@core/services/unread/unread.service';
import { AuthStore } from '@stores/auth';
import { DirectMessageStore } from '@stores/direct-messages/direct-message.store';
import { ThreadStore, type ThreadMessage } from '@stores/threads/thread.store';
import { UserStore } from '@stores/users/user.store';

type DirectMessageMap = Record<string, DirectMessage[]>;
type CurrentDirectMessageUser = Pick<User, 'uid' | 'displayName' | 'photoURL'>;
type DirectMessageParticipant = Pick<User, 'uid' | 'displayName' | 'photoURL' | 'isOnline'>;
type StartedConversation = { id: string; participants: [string, string] };

export interface DirectMessageListItem {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  isOnline: boolean;
  hasUnread: boolean;
  hasThreadUnread: boolean;
  unreadMessageCount: number;
  unreadThreadCount: number;
}

@Injectable({
  providedIn: 'root',
})
export class DirectMessageListService {
  private directMessageStore = inject(DirectMessageStore);
  private userStore = inject(UserStore);
  private threadStore = inject(ThreadStore);
  private authStore = inject(AuthStore);
  private unreadService = inject(UnreadService);
  private navigationService = inject(NavigationService);

  /**
   * Get sorted DM conversations with unread badges
   * @returns {Signal<DirectMessageListItem[]>} Computed signal of DM conversations
   */
  getSortedConversations = (): Signal<DirectMessageListItem[]> => {
    return computed(() => {
      this.directMessageStore.updateCounter();
      const currentUser = this.authStore.user();
      if (!currentUser) return [];
      const conversations = this.directMessageStore.sortedConversations();
      const allMessages = this.directMessageStore.messages();

      return conversations.map((conversation) =>
        this.mapConversationToListItem(conversation, currentUser.uid, allMessages),
      );
    });
  };

  /**
   * Get DM conversations with self-DM at top
   * @returns {Signal<DirectMessageListItem[]>} Conversations with Notes to self first
   */
  getConversationsWithSelfDM = (): Signal<DirectMessageListItem[]> => {
    return computed(() => {
      const currentUser = this.authStore.user();
      if (!currentUser) return [];
      const conversations = this.getSortedConversations()();
      const sortedList = this.sortConversationsAlphabetically(conversations);
      const selfConversationId = `${currentUser.uid}_${currentUser.uid}`;
      const selfDM = this.createSelfDMEntry(currentUser, sortedList, selfConversationId);
      const filteredList = sortedList.filter((dm) => dm.id !== selfConversationId);
      return [selfDM, ...filteredList];
    });
  };

  /**
   * Sort conversations alphabetically by name
   * @private
   * @param {DirectMessageListItem[]} conversations - Unsorted conversations
   * @returns {DirectMessageListItem[]} Alphabetically sorted conversations
   */
  private sortConversationsAlphabetically = (
    conversations: DirectMessageListItem[],
  ): DirectMessageListItem[] => {
    return conversations.sort((a, b) => a.name.localeCompare(b.name));
  };

  /**
   * Create self-DM entry
   * @private
   * @param {CurrentDirectMessageUser} currentUser - Current user data
   * @param {DirectMessageListItem[]} sortedList - Sorted conversations
   * @param {string} selfConversationId - Self conversation ID
   * @returns {DirectMessageListItem} Self-DM entry
   */
  private createSelfDMEntry = (
    currentUser: CurrentDirectMessageUser,
    sortedList: DirectMessageListItem[],
    selfConversationId: string,
  ): DirectMessageListItem => {
    const existingSelfDM = sortedList.find((dm) => dm.id === selfConversationId);
    return existingSelfDM
      ? { ...existingSelfDM, name: `${currentUser.displayName} (Notes)` }
      : this.buildDefaultSelfDM(currentUser);
  };

  /**
   * Build default self-DM entry
   * @private
   * @param {CurrentDirectMessageUser} currentUser - Current user data
   * @returns {DirectMessageListItem} Default self-DM
   */
  private buildDefaultSelfDM = (currentUser: CurrentDirectMessageUser): DirectMessageListItem => {
    return {
      id: `self-${currentUser.uid}`,
      userId: currentUser.uid,
      name: `${currentUser.displayName} (Notes)`,
      avatar: currentUser.photoURL || '/img/profile/profile-0.svg',
      isOnline: true,
      hasUnread: false,
      hasThreadUnread: false,
      unreadMessageCount: 0,
      unreadThreadCount: 0,
    };
  };

  /**
   * Map conversation to list item
   * @private
   * @param {DirectMessageConversation} conversation - Conversation data
   * @param {string} currentUserId - Current user ID
   * @param {DirectMessageMap} allMessages - All messages map keyed by conversation ID
   * @returns {DirectMessageListItem} Mapped list item
   */
  private mapConversationToListItem = (
    conversation: DirectMessageConversation,
    currentUserId: string,
    allMessages: DirectMessageMap,
  ): DirectMessageListItem => {
    const otherUserId = this.getOtherUserId(conversation, currentUserId);
    const otherUser = this.userStore.getUserById()(otherUserId);
    const messages = allMessages[conversation.id] || [];
    const unreadMessageCount = this.calculateNormalUnreadCount(
      conversation,
      messages,
      currentUserId,
    );
    const unreadThreadCount = this.calculateThreadUnreadCount(
      conversation,
      messages,
      currentUserId,
    );
    return this.buildListItem(
      conversation,
      otherUserId,
      otherUser,
      unreadMessageCount,
      unreadThreadCount,
    );
  };

  /**
   * Build list item from conversation data
   * @private
   * @param {DirectMessageConversation} conversation - Conversation data
   * @param {string} otherUserId - Other user ID
   * @param {DirectMessageParticipant | undefined} otherUser - Other user data
   * @param {number} unreadMessageCount - Normal unread message count
   * @param {number} unreadThreadCount - Unread thread count
   * @returns {DirectMessageListItem} Built list item
   */
  private buildListItem = (
    conversation: DirectMessageConversation,
    otherUserId: string,
    otherUser: DirectMessageParticipant | undefined,
    unreadMessageCount: number,
    unreadThreadCount: number,
  ): DirectMessageListItem => {
    return {
      id: conversation.id,
      userId: otherUserId,
      name: otherUser?.displayName || 'Unknown User',
      avatar: otherUser?.photoURL || '/img/profile/profile-0.svg',
      isOnline: otherUser?.isOnline || false,
      hasUnread: unreadMessageCount > 0,
      hasThreadUnread: unreadThreadCount > 0,
      unreadMessageCount,
      unreadThreadCount,
    };
  };

  /**
   * Calculate unread normal message count
   * @private
   * @param {DirectMessageConversation} conversation - Conversation data
   * @param {DirectMessage[]} messages - Conversation messages
   * @param {string} currentUserId - Current user ID
   * @returns {number} Number of unread normal messages
   * @description
   * The service intentionally returns the raw unread counters from conversation metadata or
   * message timestamps. Hiding badges for the currently open DM is a presentation concern and
   * is derived in the sidebar component so other consumers can still access the real unread state.
   */
  private calculateNormalUnreadCount = (
    conversation: DirectMessageConversation,
    messages: DirectMessage[],
    currentUserId: string,
  ): number => {
    const conversationUnreadCount = conversation.unreadCount?.[currentUserId];
    if (typeof conversationUnreadCount === 'number' && conversationUnreadCount > 0) {
      return conversationUnreadCount;
    }

    const unreadMessages = messages.filter((msg) => {
      if (msg.authorId === currentUserId) return false;
      const timestamp = msg.createdAt instanceof Date ? msg.createdAt : new Date(msg.createdAt);
      return this.unreadService.hasUnread(conversation.id, timestamp);
    });

    if (unreadMessages.length > 0) return unreadMessages.length;

    return this.calculateNormalUnread(conversation, messages) ? 1 : 0;
  };

  /**
   * Get other participant user ID
   * @private
   * @param {DirectMessageConversation} conversation - Conversation data
   * @param {string} currentUserId - Current user ID
   * @returns {string} Other user ID
   */
  private getOtherUserId = (
    conversation: DirectMessageConversation,
    currentUserId: string,
  ): string => {
    const otherUserId = conversation.participants.find((id: string) => id !== currentUserId);
    return otherUserId || currentUserId;
  };

  /**
   * Calculate normal message unread status
   * @private
   * @param {DirectMessageConversation} conversation - Conversation data
   * @param {DirectMessage[]} messages - Conversation messages
   * @returns {boolean} True if has unread normal messages
   */
  private calculateNormalUnread = (
    conversation: DirectMessageConversation,
    messages: DirectMessage[],
  ): boolean => {
    const currentUser = this.authStore.user();
    if (!currentUser) return false;
    if (this.hasUnreadMentions(messages, currentUser.uid, conversation.id)) return true;
    const latestTime = this.getLatestNormalMessageTime(messages);
    const timestamp = latestTime || this.getFallbackTimestamp(conversation, messages);
    return timestamp ? this.unreadService.hasUnread(conversation.id, timestamp) : false;
  };

  /**
   * Check if user has unread mentions
   * @private
   * @param {DirectMessage[]} messages - Conversation messages
   * @param {string} userId - Current user ID
   * @param {string} conversationId - Conversation ID
   * @returns {boolean} True if user has unread mentions
   */
  private hasUnreadMentions = (
    messages: DirectMessage[],
    userId: string,
    conversationId: string,
  ): boolean => {
    return messages.some((msg) => {
      if (!msg.mentionedUserIds || !msg.mentionedUserIds.includes(userId)) return false;
      const timestamp = msg.createdAt instanceof Date ? msg.createdAt : new Date(msg.createdAt);
      return this.unreadService.hasUnread(conversationId, timestamp);
    });
  };

  /**
   * Get latest normal message timestamp
   * @private
   * @param {DirectMessage[]} messages - Conversation messages
   * @returns {Date | undefined} Latest message timestamp
   */
  private getLatestNormalMessageTime = (messages: DirectMessage[]): Date | undefined => {
    return messages.reduce((latest: Date | undefined, msg) => {
      const msgTime = msg.createdAt instanceof Date ? msg.createdAt : new Date(msg.createdAt);
      return !latest || msgTime > latest ? msgTime : latest;
    }, undefined);
  };

  /**
   * Get fallback timestamp from conversation
   * @private
   * @param {DirectMessageConversation} conversation - Conversation data
   * @param {DirectMessage[]} messages - Conversation messages
   * @returns {Date | undefined} Fallback timestamp
   */
  private getFallbackTimestamp = (
    conversation: DirectMessageConversation,
    messages: DirectMessage[],
  ): Date | undefined => {
    if (!conversation.lastMessageAt) return undefined;
    const lastMsgTime =
      conversation.lastMessageAt instanceof Date
        ? conversation.lastMessageAt
        : new Date(conversation.lastMessageAt);
    const latestThreadTime = this.getLatestThreadTime(messages);
    if (!latestThreadTime) return lastMsgTime;
    const isThreadUpdate = Math.abs(lastMsgTime.getTime() - latestThreadTime.getTime()) < 1000;
    return isThreadUpdate ? undefined : lastMsgTime;
  };

  /**
   * Get latest thread timestamp
   * @private
   * @param {DirectMessage[]} messages - Conversation messages
   * @returns {Date | undefined} Latest thread timestamp
   */
  private getLatestThreadTime = (messages: DirectMessage[]): Date | undefined => {
    return messages.reduce((latest: Date | undefined, msg) => {
      if (!msg.lastThreadTimestamp) return latest;
      const threadTime =
        msg.lastThreadTimestamp instanceof Date
          ? msg.lastThreadTimestamp
          : new Date(msg.lastThreadTimestamp);
      return !latest || threadTime > latest ? threadTime : latest;
    }, undefined);
  };

  /**
   * Calculate thread unread status
   * @private
   * @param {DirectMessageConversation} conversation - Conversation data
   * @param {DirectMessage[]} messages - Conversation messages
   * @param {string} currentUserId - Current user ID
   * @returns {boolean} True if has unread threads
   */
  private calculateThreadUnread = (
    conversation: DirectMessageConversation,
    messages: DirectMessage[],
    currentUserId: string,
  ): boolean => {
    return messages.some((msg) => this.hasUnreadThread(msg, conversation.id, currentUserId));
  };

  /**
   * Calculate unread thread count
   * @private
   * @param {DirectMessageConversation} conversation - Conversation data
   * @param {DirectMessage[]} messages - Conversation messages
   * @param {string} currentUserId - Current user ID
   * @returns {number} Number of parent messages with unread thread activity
   */
  private calculateThreadUnreadCount = (
    conversation: DirectMessageConversation,
    messages: DirectMessage[],
    currentUserId: string,
  ): number => {
    const unreadThreads = messages.filter((msg) =>
      this.hasUnreadThread(msg, conversation.id, currentUserId),
    );

    if (unreadThreads.length > 0) return unreadThreads.length;

    return this.calculateThreadUnread(conversation, messages, currentUserId) ? 1 : 0;
  };

  /**
   * Check if message has unread thread
   * @private
   * @param {DirectMessage} message - Message data
   * @param {string} conversationId - Conversation ID
   * @param {string} userId - Current user ID
   * @returns {boolean} True if thread is unread
   */
  private hasUnreadThread = (
    message: DirectMessage,
    conversationId: string,
    userId: string,
  ): boolean => {
    if (!message.lastThreadTimestamp) return false;
    const threadMessages = this.threadStore.getThreadsByMessageId()(message.id);
    const userParticipated = this.checkUserParticipation(message, threadMessages, userId);
    if (!userParticipated) return false;
    const threadTime =
      message.lastThreadTimestamp instanceof Date
        ? message.lastThreadTimestamp
        : new Date(message.lastThreadTimestamp);
    return this.unreadService.hasThreadUnread(conversationId, message.id, threadTime);
  };

  /**
   * Check if user participated in thread
   * @private
   * @param {DirectMessage} message - Parent message
   * @param {ThreadMessage[]} threadMessages - Thread messages
   * @param {string} userId - Current user ID
   * @returns {boolean} True if user participated
   */
  private checkUserParticipation = (
    message: DirectMessage,
    threadMessages: ThreadMessage[],
    userId: string,
  ): boolean => {
    const wroteThreadReply = threadMessages.some((threadMsg) => threadMsg.authorId === userId);
    const wroteParentMessage = message.authorId === userId;
    return wroteThreadReply || wroteParentMessage;
  };

  /**
   * Start or open DM conversation
   * @param {string} currentUserId - Current user ID
   * @param {string} otherUserId - Other user ID
   * @returns {Promise<StartedConversation | null>} Conversation or null
   */
  startConversation = async (
    currentUserId: string,
    otherUserId: string,
  ): Promise<StartedConversation | null> => {
    try {
      const conversation = await this.directMessageStore.startConversation(
        currentUserId,
        otherUserId,
      );
      await this.directMessageStore.loadMessages(conversation.id);
      await this.unreadService.markAsRead(conversation.id, true);
      return conversation;
    } catch (error) {
      return null;
    }
  };

  /**
   * Select conversation with self-DM handling
   * @param {string} conversationId - Conversation ID (can be "self-{userId}")
   * @param {string} currentUserId - Current user ID
   * @returns {Promise<string | null>} Actual conversation ID or null
   */
  selectConversation = async (
    conversationId: string,
    currentUserId: string,
  ): Promise<string | null> => {
    if (conversationId.startsWith('self-')) {
      const conversation = await this.startConversation(currentUserId, currentUserId);
      return conversation?.id || null;
    }
    return conversationId;
  };

  /**
   * Start DM conversation and auto-select
   * @param {string} currentUserId - Current user ID
   * @param {string} otherUserId - Other user ID
   * @returns {Promise<StartedConversation | null>} Conversation or null
   */
  startAndSelectConversation = async (
    currentUserId: string,
    otherUserId: string,
  ): Promise<StartedConversation | null> => {
    const conversation = await this.startConversation(currentUserId, otherUserId);
    if (!conversation) return null;
    this.navigationService.selectDirectMessageById(conversation.id);
    return conversation;
  };
}
