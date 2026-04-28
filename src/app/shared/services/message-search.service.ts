/**
 * @fileoverview Message Search Service
 * @description Interprets composer search prefixes and applies type-specific filtering so mentions, channels, and message commands share one parsing model.
 * @module shared/services/message-search
 */

import { Injectable } from '@angular/core';
import { ChannelListItem } from '../dashboard-components/channel-list-item/channel-list-item.component';
import { MessageSearchItem } from '../dashboard-components/message-search-item/message-search-item.component';
import { UserListItem } from '../dashboard-components/user-list-item/user-list-item.component';

export type SearchPrefix = '' | '@' | '#' | '$';

@Injectable()
export class MessageSearchService {
  /**
   * Get search prefix from message
   * @description Detects the active search mode based on leading prefix symbols used in composer input.
   * @param {string} message - Message text to analyze
   * @returns {SearchPrefix} Search prefix (@ # $ or empty)
   */
  getSearchPrefix = (message: string): SearchPrefix => {
    const msg = message.trim();
    if (msg.startsWith('$')) return '$';
    if (msg.startsWith('@')) return '@';
    if (msg.startsWith('#')) return '#';
    return '';
  };

  /**
   * Get search term without prefix
   * @description Normalizes query text by stripping the prefix and lowercasing for case-insensitive filtering.
   * @param {string} message - Message text to analyze
   * @returns {string} Search term without prefix
   */
  getSearchTerm = (message: string): string => {
    const prefix = this.getSearchPrefix(message);
    if (!prefix) return '';
    return message.substring(1).toLowerCase().trim();
  };

  /**
   * Filter messages based on search term
   * @description Applies a minimum-length guard and returns top matching message snippets capped by maxResults.
   * @param {MessageSearchItem[]} messages - All messages to filter
   * @param {string} searchTerm - Search term to filter by
   * @param {number} maxResults - Maximum results to return
   * @returns {MessageSearchItem[]} Filtered messages
   */
  filterMessages = (
    messages: MessageSearchItem[],
    searchTerm: string,
    maxResults: number = 5,
  ): MessageSearchItem[] => {
    if (searchTerm.length < 3) return [];

    return messages
      .filter((msg) => msg.description.toLowerCase().includes(searchTerm))
      .slice(0, maxResults);
  };

  /**
   * Filter channels based on search term
   * @description Narrows channel candidates by name while preserving full list behavior for empty queries.
   * @param {ChannelListItem[]} channels - All channels to filter
   * @param {string} searchTerm - Search term to filter by
   * @returns {ChannelListItem[]} Filtered channels
   */
  filterChannels = (channels: ChannelListItem[], searchTerm: string): ChannelListItem[] => {
    if (!searchTerm) return channels;
    return channels.filter((channel) => channel.name.toLowerCase().includes(searchTerm));
  };

  /**
   * Filter users based on search term
   * @description Narrows user candidates by display name while preserving full list behavior for empty queries.
   * @param {UserListItem[]} users - All users to filter
   * @param {string} searchTerm - Search term to filter by
   * @returns {UserListItem[]} Filtered users
   */
  filterUsers = (users: UserListItem[], searchTerm: string): UserListItem[] => {
    if (!searchTerm) return users;
    return users.filter((user) => user.name.toLowerCase().includes(searchTerm));
  };

  /**
   * Exclude already selected items from list
   * @description Removes already selected IDs from candidate lists to prevent duplicate mention selections.
   * @param {T[]} items - All items
   * @param {string[]} selectedIds - IDs of selected items to exclude
   * @returns {T[]} Items not in selectedIds
   */
  excludeSelected = <T extends { id: string }>(items: T[], selectedIds: string[]): T[] => {
    return items.filter((item) => !selectedIds.includes(item.id));
  };
}
