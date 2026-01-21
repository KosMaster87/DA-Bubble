/**
 * @fileoverview Message Composer Service
 * @description Manages message composition, mentions, and emoji insertion
 * @module shared/services/message-composer
 */

import { Injectable, signal, computed } from '@angular/core';
import { UserListItem } from '../dashboard-components/user-list-item/user-list-item.component';
import { ChannelListItem } from '../dashboard-components/channel-list-item/channel-list-item.component';
import { MentionChipData } from '../dashboard-components/mention-chip/mention-chip.component';
import { ReactionType } from '../dashboard-components/reaction-bar/reaction-bar.component';

@Injectable()
export class MessageComposerService {
  private message = signal<string>('');
  private selectedUsers = signal<UserListItem[]>([]);
  private selectedChannels = signal<ChannelListItem[]>([]);

  private readonly emojiMap: Record<string, string> = {
    'thumbs-up': '👍',
    checked: '✅',
    rocket: '🚀',
    'nerd-face': '🤓',
  };

  /**
   * Get current message text
   * @returns {string} Current message text
   */
  getMessage = () => this.message.asReadonly();

  /**
   * Get selected users
   * @returns {UserListItem[]} Array of selected users
   */
  getSelectedUsers = () => this.selectedUsers.asReadonly();

  /**
   * Get selected channels
   * @returns {ChannelListItem[]} Array of selected channels
   */
  getSelectedChannels = () => this.selectedChannels.asReadonly();

  /**
   * Get mention chips for display
   * @returns {MentionChipData[]} Array of mention chips
   */
  getMentionChips = computed<MentionChipData[]>(() => {
    const userChips = this.selectedUsers().map((user) => ({
      id: user.id,
      type: 'user' as const,
      name: user.name,
      avatar: user.avatar,
    }));
    const channelChips = this.selectedChannels().map((channel) => ({
      id: channel.id,
      type: 'channel' as const,
      name: channel.name,
    }));
    return [...userChips, ...channelChips];
  });

  /**
   * Set message text
   * @param {string} text - Message text to set
   * @returns {void}
   */
  setMessage = (text: string): void => {
    this.message.set(text);
  };

  /**
   * Add user mention
   * @param {UserListItem} user - User to add as mention
   * @returns {void}
   */
  addUser = (user: UserListItem): void => {
    this.selectedUsers.update((users) => [...users, user]);
  };

  /**
   * Add channel mention
   * @param {ChannelListItem} channel - Channel to add as mention
   * @returns {void}
   */
  addChannel = (channel: ChannelListItem): void => {
    this.selectedChannels.update((channels) => [...channels, channel]);
  };

  /**
   * Remove user mention by ID
   * @param {string} userId - ID of user to remove
   * @returns {void}
   */
  removeUser = (userId: string): void => {
    this.selectedUsers.update((users) => users.filter((u) => u.id !== userId));
  };

  /**
   * Remove channel mention by ID
   * @param {string} channelId - ID of channel to remove
   * @returns {void}
   */
  removeChannel = (channelId: string): void => {
    this.selectedChannels.update((channels) => channels.filter((c) => c.id !== channelId));
  };

  /**
   * Build complete message from chips and text
   * @returns {string} Full message with all mentions
   */
  buildFullMessage = (): string => {
    const mentions = this.selectedUsers()
      .map((u) => `@${u.name}`)
      .join(' ');
    const channels = this.selectedChannels()
      .map((c) => `#${c.name}`)
      .join(' ');
    const parts = [mentions, channels, this.message().trim()].filter(Boolean);
    return parts.join(' ');
  };

  /**
   * Reset all composer state
   * @returns {void}
   */
  reset = (): void => {
    this.message.set('');
    this.selectedUsers.set([]);
    this.selectedChannels.set([]);
  };

  /**
   * Add emoji to message
   * @param {ReactionType} reaction - Reaction type to convert to emoji
   * @returns {void}
   */
  addEmoji = (reaction: ReactionType): void => {
    const emoji = this.emojiMap[reaction] || reaction;
    this.message.set(this.message() + emoji);
  };
}
