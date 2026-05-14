/**
 * @fileoverview Direct Message List Service
 * @description Produces sidebar-ready DM list models with stable ordering and unread/thread badge semantics derived from conversation and message state.
 * @module direct-message-list
 */

import { computed, inject, Injectable, Signal } from '@angular/core';
import { DirectMessage, type DirectMessageConversation } from '@core/models/direct-message.model';
import { type User } from '@core/models/user.model';
import { NavigationService } from '@core/services/navigation/navigation.service';
import { UnreadService } from '@core/services/unread/unread.service';
import { AuthStore } from '@stores/auth';
import { DirectMessageStore } from '@stores/direct-messages/direct-message.store';
import { ThreadStore } from '@stores/threads/thread.store';
import { UserStore } from '@stores/users/user.store';
import {
  buildSelfDirectMessageEntry,
  sortDirectMessageListEntries,
} from './direct-message-list-entry.helper';
import {
  buildDirectMessageListItem,
  getOtherDirectMessageParticipantId,
} from './direct-message-list-mapping.helper';
import {
  getDirectMessageFallbackTimestamp,
  getLatestDirectMessageTime,
  hasThreadParticipation,
} from './direct-message-list-unread.helper';

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
   * @description Main entry point for the DM sidebar list; updates are driven by the store's updateCounter signal so the list re-evaluates whenever unread state changes.
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
   * @description Pins the "Notes to self" entry at the top regardless of alphabetical order so users can always find their personal notes quickly.
   * @returns {Signal<DirectMessageListItem[]>} Conversations with Notes to self first
   */
  getConversationsWithSelfDM = (): Signal<DirectMessageListItem[]> => {
    return computed(() => {
      const currentUser = this.authStore.user();
      if (!currentUser) return [];
      const conversations = this.getSortedConversations()();
      const sortedList = sortDirectMessageListEntries(conversations);
      const selfConversationId = `${currentUser.uid}_${currentUser.uid}`;
      const selfDM = buildSelfDirectMessageEntry(currentUser, sortedList, selfConversationId);
      const filteredList = sortedList.filter((dm) => dm.id !== selfConversationId);
      return [selfDM, ...filteredList];
    });
  };

  /**
   * Map conversation to list item
   * @description Normalizes one raw conversation into a renderable sidebar item so identity data and unread metrics are computed together.
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
    const otherUserId = getOtherDirectMessageParticipantId(conversation, currentUserId);
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
    return buildDirectMessageListItem(
      conversation,
      otherUserId,
      otherUser,
      unreadMessageCount,
      unreadThreadCount,
    );
  };

  /**
   * Calculate unread normal message count
   * @description Prefers the persisted unreadCount from conversation metadata for accuracy; falls back to timestamp comparison when the counter is absent.
   * @private
   * @param {DirectMessageConversation} conversation - Conversation data
   * @param {DirectMessage[]} messages - Conversation messages
   * @param {string} currentUserId - Current user ID
   * @returns {number} Number of unread normal messages
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
   * Calculate normal message unread status
   * @description Prioritizes mention unread over generic timestamp heuristics so direct @mention intent is never hidden by fallback unread logic.
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
    const latestTime = getLatestDirectMessageTime(messages);
    const timestamp = latestTime || getDirectMessageFallbackTimestamp(conversation, messages);
    return timestamp ? this.unreadService.hasUnread(conversation.id, timestamp) : false;
  };

  /**
   * Check if user has unread mentions
   * @description Checks for unread mentions specifically so that @ mentions always surface a badge even when the general unread heuristic would not.
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
   * Calculate thread unread status
   * @description Checks whether any message in the conversation has an unread thread the current user participated in.
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
   * @description Counts parent messages with unread thread activity and falls back to 1 (boolean-style badge) when the thread unread heuristic fires.
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
   * @description Only flags thread unread for users who actually participated so threads the user never saw don't create phantom badges.
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
    const userParticipated = hasThreadParticipation(message, threadMessages, userId);
    if (!userParticipated) return false;
    const threadTime =
      message.lastThreadTimestamp instanceof Date
        ? message.lastThreadTimestamp
        : new Date(message.lastThreadTimestamp);
    return this.unreadService.hasThreadUnread(conversationId, message.id, threadTime);
  };

  /**
   * Start or open DM conversation
   * @description Encapsulates open-conversation side effects so message hydration and unread reset happen atomically for every DM entry path.
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
   * @description Intercepts the "self-" prefix used for placeholder entries and creates the real self-conversation on demand before returning the actual ID.
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
   * @description Combines conversation creation with navigation selection so callers can open a DM in one call without managing routing separately.
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
