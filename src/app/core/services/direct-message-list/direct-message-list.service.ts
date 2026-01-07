/**
 * @fileoverview Direct Message List Service
 * @description Handles DM list sorting, filtering, and unread badge calculations
 * @module core/services/direct-message-list
 */

import { computed, inject, Injectable, Signal } from '@angular/core';
import { DirectMessageStore } from '@stores/direct-message.store';
import { UserStore } from '@stores/user.store';
import { ThreadStore } from '@stores/thread.store';
import { AuthStore } from '@stores/auth';
import { UnreadService } from '@core/services/unread/unread.service';
import { NavigationService } from '@core/services/navigation/navigation.service';

/**
 * DM list item for UI
 */
export interface DirectMessageListItem {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  isOnline: boolean;
  hasUnread: boolean;
  hasThreadUnread: boolean;
}

/**
 * Service for managing direct message list display
 */
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
   */
  getSortedConversations(): Signal<DirectMessageListItem[]> {
    return computed(() => {
      this.directMessageStore.updateCounter();

      const currentUser = this.authStore.user();
      if (!currentUser) return [];

      const conversations = this.directMessageStore.sortedConversations();
      const allMessages = this.directMessageStore.messages();

      return conversations.map((conv) =>
        this.mapConversationToListItem(conv, currentUser.uid, allMessages)
      );
    });
  }

  /**
   * Get DM conversations with self-DM (Notes to self) at the top
   * Includes unread badges and alphabetical sorting
   */
  getConversationsWithSelfDM(): Signal<DirectMessageListItem[]> {
    return computed(() => {
      const currentUser = this.authStore.user();
      if (!currentUser) return [];

      const conversations = this.getSortedConversations()();

      // Sort alphabetically by name
      const sortedList = conversations.sort((a: DirectMessageListItem, b: DirectMessageListItem) =>
        a.name.localeCompare(b.name)
      );

      // Check if self-conversation already exists in the list
      const selfConversationId = `${currentUser.uid}_${currentUser.uid}`;
      const existingSelfDM = sortedList.find(
        (dm: DirectMessageListItem) => dm.id === selfConversationId
      );

      // Create or use existing self-DM entry at the top
      const selfDM: DirectMessageListItem = existingSelfDM
        ? {
            ...existingSelfDM,
            name: `${currentUser.displayName} (Notes)`, // Override name to show (Notes)
          }
        : {
            id: `self-${currentUser.uid}`,
            userId: currentUser.uid,
            name: `${currentUser.displayName} (Notes)`,
            avatar: currentUser.photoURL || '/img/profile/profile-0.svg',
            isOnline: true,
            hasUnread: false,
            hasThreadUnread: false,
          };

      // Filter out the self-conversation from the regular list if it exists
      const filteredList = sortedList.filter(
        (dm: DirectMessageListItem) => dm.id !== selfConversationId
      );

      return [selfDM, ...filteredList];
    });
  }

  /**
   * Map conversation to list item
   */
  private mapConversationToListItem(
    conversation: any,
    currentUserId: string,
    allMessages: any
  ): DirectMessageListItem {
    const otherUserId = this.getOtherUserId(conversation, currentUserId);
    const otherUser = this.userStore.getUserById()(otherUserId);

    const messages = allMessages[conversation.id] || [];
    const hasNormalUnread = this.calculateNormalUnread(conversation, messages);
    const hasThreadUnread = this.calculateThreadUnread(conversation, messages, currentUserId);

    return {
      id: conversation.id,
      userId: otherUserId,
      name: otherUser?.displayName || 'Unknown User',
      avatar: otherUser?.photoURL || '/img/profile/profile-0.svg',
      isOnline: otherUser?.isOnline || false,
      hasUnread: hasNormalUnread,
      hasThreadUnread: hasThreadUnread,
    };
  }

  /**
   * Get other participant's user ID
   */
  private getOtherUserId(conversation: any, currentUserId: string): string {
    const otherUserId = conversation.participants.find((id: string) => id !== currentUserId);
    return otherUserId || currentUserId;
  }

  /**
   * Calculate normal message unread status
   */
  private calculateNormalUnread(conversation: any, messages: any[]): boolean {
    const latestNormalTime = this.getLatestNormalMessageTime(messages);
    const timestamp = latestNormalTime || this.getFallbackTimestamp(conversation, messages);

    return timestamp ? this.unreadService.hasUnread(conversation.id, timestamp) : false;
  }

  /**
   * Get latest normal message timestamp
   */
  private getLatestNormalMessageTime(messages: any[]): Date | undefined {
    return messages.reduce((latest: Date | undefined, msg) => {
      const msgTime = msg.createdAt instanceof Date ? msg.createdAt : new Date(msg.createdAt);
      return !latest || msgTime > latest ? msgTime : latest;
    }, undefined);
  }

  /**
   * Get fallback timestamp from conversation data
   */
  private getFallbackTimestamp(conversation: any, messages: any[]): Date | undefined {
    if (!conversation.lastMessageAt) return undefined;

    const lastMsgTime =
      conversation.lastMessageAt instanceof Date
        ? conversation.lastMessageAt
        : new Date(conversation.lastMessageAt);

    const latestThreadTime = this.getLatestThreadTime(messages);

    if (!latestThreadTime) return lastMsgTime;

    const isThreadUpdate = Math.abs(lastMsgTime.getTime() - latestThreadTime.getTime()) < 1000;
    return isThreadUpdate ? undefined : lastMsgTime;
  }

  /**
   * Get latest thread timestamp
   */
  private getLatestThreadTime(messages: any[]): Date | undefined {
    return messages.reduce((latest: Date | undefined, msg) => {
      if (!msg.lastThreadTimestamp) return latest;

      const threadTime =
        msg.lastThreadTimestamp instanceof Date
          ? msg.lastThreadTimestamp
          : new Date(msg.lastThreadTimestamp);

      return !latest || threadTime > latest ? threadTime : latest;
    }, undefined);
  }

  /**
   * Calculate thread unread status
   */
  private calculateThreadUnread(
    conversation: any,
    messages: any[],
    currentUserId: string
  ): boolean {
    return messages.some((msg) => this.hasUnreadThread(msg, conversation.id, currentUserId));
  }

  /**
   * Check if message has unread thread
   */
  private hasUnreadThread(message: any, conversationId: string, userId: string): boolean {
    if (!message.lastThreadTimestamp) return false;

    const threadMessages = this.threadStore.getThreadsByMessageId()(message.id);
    const userParticipated = this.checkUserParticipation(message, threadMessages, userId);

    if (!userParticipated) return false;

    const threadTime =
      message.lastThreadTimestamp instanceof Date
        ? message.lastThreadTimestamp
        : new Date(message.lastThreadTimestamp);

    return this.unreadService.hasThreadUnread(conversationId, message.id, threadTime);
  }

  /**
   * Check if user participated in thread
   */
  private checkUserParticipation(message: any, threadMessages: any[], userId: string): boolean {
    const wroteThreadReply = threadMessages.some((threadMsg) => threadMsg.authorId === userId);
    const wroteParentMessage = message.authorId === userId;

    return wroteThreadReply || wroteParentMessage;
  }

  /**
   * Start or open a direct message conversation with a user
   * @param currentUserId The current user's ID
   * @param otherUserId The other user's ID
   * @returns Conversation data { id, participants }
   */
  async startConversation(
    currentUserId: string,
    otherUserId: string
  ): Promise<{ id: string; participants: [string, string] } | null> {
    console.log('🚀 Starting DM conversation', {
      currentUserId,
      otherUserId,
    });

    try {
      // Start or get existing conversation via DirectMessageStore
      const conversation = await this.directMessageStore.startConversation(
        currentUserId,
        otherUserId
      );

      console.log('✅ Conversation created/found:', conversation.id);

      // Load messages for this conversation
      await this.directMessageStore.loadMessages(conversation.id);

      console.log('✅ Messages loaded for conversation:', conversation.id);

      // Mark as read for the user who started the conversation
      await this.unreadService.markAsRead(conversation.id);

      console.log('✅ DM conversation opened:', conversation.id);

      return conversation;
    } catch (error) {
      console.error('❌ Failed to start DM conversation:', error);
      return null;
    }
  }

  /**
   * Select a conversation with self-DM handling
   * Handles "self-" prefixed IDs and starts conversations if needed
   * @param conversationId The conversation ID (can be "self-{userId}")
   * @param currentUserId The current user's ID
   * @returns The actual conversation ID or null if failed
   */
  async selectConversation(conversationId: string, currentUserId: string): Promise<string | null> {
    // Handle self DM (Notes to self)
    if (conversationId.startsWith('self-')) {
      // Start a conversation with self
      const conversation = await this.startConversation(currentUserId, currentUserId);
      return conversation?.id || null;
    }

    return conversationId;
  }

  /**
   * Start a direct message conversation and auto-select it
   * Handles conversation creation and navigation state update
   * @param currentUserId Current user's ID
   * @param otherUserId Other user's ID
   * @returns Conversation object or null if failed
   */
  async startAndSelectConversation(
    currentUserId: string,
    otherUserId: string
  ): Promise<{ id: string; participants: string[] } | null> {
    // Create or get existing conversation
    const conversation = await this.startConversation(currentUserId, otherUserId);

    if (!conversation) return null;

    // Auto-select and navigate to the conversation
    this.navigationService.selectDirectMessageById(conversation.id);

    return conversation;
  }
}
