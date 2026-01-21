/**
 * @fileoverview Channel List Service
 * @description Handles channel list sorting, filtering, and unread badge calculations
 * @module core/services/channel-list
 */

import { computed, inject, Injectable, Signal } from '@angular/core';
import { ChannelStore } from '@stores/channel.store';
import { ChannelMessageStore } from '@stores/channel-message.store';
import { ThreadStore } from '@stores/thread.store';
import { AuthStore } from '@stores/auth';
import { UnreadService } from '@core/services/unread/unread.service';

export interface ChannelListItem {
  id: string;
  name: string;
  hasUnread: boolean;
  hasThreadUnread: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ChannelListService {
  private channelStore = inject(ChannelStore);
  private channelMessageStore = inject(ChannelMessageStore);
  private threadStore = inject(ThreadStore);
  private authStore = inject(AuthStore);
  private unreadService = inject(UnreadService);

  /**
   * Get visible channels for current user
   * @returns {Signal<ChannelListItem[]>} Computed signal of visible channels with unread status
   * @description Returns public channels and channels where user is member
   */
  getVisibleChannels = (): Signal<ChannelListItem[]> => {
    return computed(() => {
      this.channelMessageStore.updateCounter();
      const currentUser = this.authStore.user();
      if (!currentUser) return [];
      const allChannels = this.channelStore.channels();
      const visibleChannels = this.filterVisibleChannels(allChannels, currentUser.uid);
      return this.sortChannels(visibleChannels.map((ch) => this.mapToListItem(ch)));
    });
  };

  /**
   * Filter channels visible to user
   * @private
   * @param {any[]} channels - All channels
   * @param {string} userId - Current user ID
   * @returns {any[]} Channels user can see
   */
  private filterVisibleChannels = (channels: any[], userId: string): any[] => {
    return channels.filter((ch) => {
      if (ch.id === 'mailbox') return false;
      const isMember = ch.members.includes(userId);
      const isPublic = !ch.isPrivate;
      return isPublic || isMember;
    });
  };

  /**
   * Map channel to list item
   * @private
   * @param {any} channel - Channel data
   * @returns {ChannelListItem} Channel with unread badges
   */
  private mapToListItem = (channel: any): ChannelListItem => {
    const currentUser = this.authStore.user();
    if (!currentUser) {
      return { id: channel.id, name: channel.name, hasUnread: false, hasThreadUnread: false };
    }
    const isMember = channel.members.includes(currentUser.uid);
    const messages = this.channelMessageStore.getMessagesByChannel()(channel.id);
    return this.buildListItem(channel, messages, isMember);
  };

  /**
   * Build list item with badges
   * @private
   * @param {any} channel - Channel data
   * @param {any[]} messages - Channel messages
   * @param {boolean} isMember - User membership status
   * @returns {ChannelListItem} Complete channel list item
   */
  private buildListItem = (channel: any, messages: any[], isMember: boolean): ChannelListItem => {
    const hasNormalUnread = this.calculateNormalUnread(channel, messages, isMember);
    const hasThreadUnread = this.calculateThreadUnread(channel, messages, isMember);
    return {
      id: channel.id,
      name: channel.name,
      hasUnread: hasNormalUnread,
      hasThreadUnread: hasThreadUnread,
    };
  };

  /**
   * Calculate normal message unread status
   * @private
   * @param {any} channel - Channel data
   * @param {any[]} messages - Channel messages
   * @param {boolean} isMember - User membership status
   * @returns {boolean} True if has unread normal messages
   */
  private calculateNormalUnread = (channel: any, messages: any[], isMember: boolean): boolean => {
    if (!isMember) return false;
    const currentUser = this.authStore.user();
    if (!currentUser) return false;
    if (this.hasUnreadMentions(messages, currentUser.uid)) return true;
    const latestTime = this.getLatestNormalMessageTime(messages);
    const timestamp = latestTime || this.getFallbackTimestamp(channel, messages);
    return timestamp ? this.unreadService.hasUnread(channel.id, timestamp) : false;
  };

  /**
   * Check if user has unread mentions
   * @private
   * @param {any[]} messages - Channel messages
   * @param {string} userId - Current user ID
   * @returns {boolean} True if user has unread mentions
   */
  private hasUnreadMentions = (messages: any[], userId: string): boolean => {
    return messages.some((msg) => {
      if (!msg.mentionedUserIds || !msg.mentionedUserIds.includes(userId)) return false;
      const timestamp = msg.createdAt instanceof Date ? msg.createdAt : new Date(msg.createdAt);
      return this.unreadService.hasUnread(msg.channelId, timestamp);
    });
  };

  /**
   * Get latest normal message timestamp
   * @private
   * @param {any[]} messages - Channel messages
   * @returns {Date | undefined} Latest message timestamp
   */
  private getLatestNormalMessageTime = (messages: any[]): Date | undefined => {
    return messages.reduce((latest: Date | undefined, msg) => {
      const msgTime = msg.createdAt instanceof Date ? msg.createdAt : new Date(msg.createdAt);
      return !latest || msgTime > latest ? msgTime : latest;
    }, undefined);
  };

  /**
   * Get fallback timestamp from channel
   * @private
   * @param {any} channel - Channel data
   * @param {any[]} messages - Channel messages
   * @returns {Date | undefined} Fallback timestamp
   */
  private getFallbackTimestamp = (channel: any, messages: any[]): Date | undefined => {
    if (!channel.lastMessageAt) return undefined;
    const lastMsgTime = channel.lastMessageAt instanceof Date
      ? channel.lastMessageAt : new Date(channel.lastMessageAt);
    const latestThreadTime = this.getLatestThreadTime(messages);
    if (!latestThreadTime) return lastMsgTime;
    const isThreadUpdate = Math.abs(lastMsgTime.getTime() - latestThreadTime.getTime()) < 1000;
    return isThreadUpdate ? undefined : lastMsgTime;
  };

  /**
   * Get latest thread timestamp
   * @private
   * @param {any[]} messages - Channel messages
   * @returns {Date | undefined} Latest thread timestamp
   */
  private getLatestThreadTime = (messages: any[]): Date | undefined => {
    return messages.reduce((latest: Date | undefined, msg) => {
      if (!msg.lastThreadTimestamp) return latest;
      const threadTime = msg.lastThreadTimestamp instanceof Date
        ? msg.lastThreadTimestamp : new Date(msg.lastThreadTimestamp);
      return !latest || threadTime > latest ? threadTime : latest;
    }, undefined);
  };

  /**
   * Calculate thread unread status
   * @private
   * @param {any} channel - Channel data
   * @param {any[]} messages - Channel messages
   * @param {boolean} isMember - User membership status
   * @returns {boolean} True if has unread threads
   */
  private calculateThreadUnread = (channel: any, messages: any[], isMember: boolean): boolean => {
    if (!isMember) return false;
    const currentUserId = this.authStore.user()?.uid;
    if (!currentUserId) return false;
    return messages.some((msg) => this.hasUnreadThread(msg, channel.id, currentUserId));
  };

  /**
   * Check if message has unread thread
   * @private
   * @param {any} message - Message data
   * @param {string} channelId - Channel identifier
   * @param {string} userId - Current user ID
   * @returns {boolean} True if thread is unread
   */
  private hasUnreadThread = (message: any, channelId: string, userId: string): boolean => {
    if (!message.lastThreadTimestamp) return false;
    const threadMessages = this.threadStore.getThreadsByMessageId()(message.id);
    const userParticipated = this.checkUserParticipation(message, threadMessages, userId);
    if (!userParticipated) return false;
    const threadTime = message.lastThreadTimestamp instanceof Date
      ? message.lastThreadTimestamp : new Date(message.lastThreadTimestamp);
    return this.unreadService.hasThreadUnread(channelId, message.id, threadTime);
  };

  /**
   * Check if user participated in thread
   * @private
   * @param {any} message - Parent message
   * @param {any[]} threadMessages - Thread messages
   * @param {string} userId - Current user ID
   * @returns {boolean} True if user participated
   */
  private checkUserParticipation = (message: any, threadMessages: any[], userId: string): boolean => {
    const wroteThreadReply = threadMessages.some((threadMsg) => threadMsg.authorId === userId);
    const wroteParentMessage = message.authorId === userId;
    return wroteThreadReply || wroteParentMessage;
  };

  /**
   * Sort channels by priority
   * @private
   * @param {ChannelListItem[]} channels - Unsorted channels
   * @returns {ChannelListItem[]} Sorted channels
   * @description DABubble-welcome first, Let's Bubble second, then alphabetically
   */
  private sortChannels = (channels: ChannelListItem[]): ChannelListItem[] => {
    const welcomeChannel = channels.find((ch) => ch.name === 'DABubble-welcome');
    const letsBubbleChannel = channels.find((ch) => ch.name === "Let's Bubble");
    const otherChannels = channels
      .filter((ch) => ch.name !== 'DABubble-welcome' && ch.name !== "Let's Bubble")
      .sort((a, b) => a.name.localeCompare(b.name));
    const result: ChannelListItem[] = [];
    if (welcomeChannel) result.push(welcomeChannel);
    if (letsBubbleChannel) result.push(letsBubbleChannel);
    result.push(...otherChannels);
    return result;
  };
}
