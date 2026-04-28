/**
 * @fileoverview Message Composer Service
 * @description Encapsulates composer drafting behavior, mention chips, and emoji insertion so input logic stays reusable across conversation entry points.
 * @module shared/services/message-composer
 */

import { computed, Injectable, signal } from '@angular/core';
import { ChannelListItem } from '../dashboard-components/channel-list-item/channel-list-item.component';
import { MentionChipData } from '../dashboard-components/mention-chip/mention-chip.component';
import { ReactionType } from '../dashboard-components/reaction-bar/reaction-bar.component';
import { UserListItem } from '../dashboard-components/user-list-item/user-list-item.component';

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
   * @description Exposes the draft message signal as readonly state for template binding and computed derivations.
   * @returns {string} Current message text
   */
  getMessage = () => this.message.asReadonly();

  /**
   * Get selected users
   * @description Exposes selected user mentions as readonly state so chips and filters can react consistently.
   * @returns {UserListItem[]} Array of selected users
   */
  getSelectedUsers = () => this.selectedUsers.asReadonly();

  /**
   * Get selected channels
   * @description Exposes selected channel mentions as readonly state for chip rendering and deduplication logic.
   * @returns {ChannelListItem[]} Array of selected channels
   */
  getSelectedChannels = () => this.selectedChannels.asReadonly();

  /**
   * Get mention chips for display
   * @description Merges selected user and channel mentions into one chip list used by the composer UI.
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
   * @description Updates the draft text as the single write path for message input changes.
   * @param {string} text - Message text to set
   * @returns {void}
   */
  setMessage = (text: string): void => {
    this.message.set(text);
  };

  /**
   * Add user mention
   * @description Appends a user mention to staged selections so it is included in chip rendering and final message composition.
   * @param {UserListItem} user - User to add as mention
   * @returns {void}
   */
  addUser = (user: UserListItem): void => {
    this.selectedUsers.update((users) => [...users, user]);
  };

  /**
   * Add channel mention
   * @description Appends a channel mention to staged selections so it is included in chip rendering and final message composition.
   * @param {ChannelListItem} channel - Channel to add as mention
   * @returns {void}
   */
  addChannel = (channel: ChannelListItem): void => {
    this.selectedChannels.update((channels) => [...channels, channel]);
  };

  /**
   * Remove user mention by ID
   * @description Removes one selected user mention by ID without affecting other staged mentions.
   * @param {string} userId - ID of user to remove
   * @returns {void}
   */
  removeUser = (userId: string): void => {
    this.selectedUsers.update((users) => users.filter((u) => u.id !== userId));
  };

  /**
   * Remove channel mention by ID
   * @description Removes one selected channel mention by ID without affecting other staged mentions.
   * @param {string} channelId - ID of channel to remove
   * @returns {void}
   */
  removeChannel = (channelId: string): void => {
    this.selectedChannels.update((channels) => channels.filter((c) => c.id !== channelId));
  };

  /**
   * Build complete message from chips and text
   * @description Serializes selected mentions and draft text into the final outbound message payload.
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
   * @description Clears draft text and all staged mentions after send or explicit cancel actions.
   * @returns {void}
   */
  reset = (): void => {
    this.message.set('');
    this.selectedUsers.set([]);
    this.selectedChannels.set([]);
  };

  /**
   * Add emoji to message
   * @description Resolves a reaction key to an emoji glyph and appends it to the current draft.
   * @param {ReactionType} reaction - Reaction type to convert to emoji
   * @returns {void}
   */
  addEmoji = (reaction: ReactionType): void => {
    const emoji = this.emojiMap[reaction] || reaction;
    this.message.set(this.message() + emoji);
  };
}
