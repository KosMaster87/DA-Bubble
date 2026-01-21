/**
 * @fileoverview Message Search Service
 * @description Manages search prefix detection and filtering logic
 * @module shared/services/message-search
 */

import { Injectable, computed, Signal } from '@angular/core';
import { UserListItem } from '../dashboard-components/user-list-item/user-list-item.component';
import { ChannelListItem } from '../dashboard-components/channel-list-item/channel-list-item.component';
import { MessageSearchItem } from '../dashboard-components/message-search-item/message-search-item.component';

export type SearchPrefix = '' | '@' | '#' | '$';

@Injectable()
export class MessageSearchService {
  /**
   * Get search prefix from message
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
   * @param {MessageSearchItem[]} messages - All messages to filter
   * @param {string} searchTerm - Search term to filter by
   * @param {number} maxResults - Maximum results to return
   * @returns {MessageSearchItem[]} Filtered messages
   */
  filterMessages = (
    messages: MessageSearchItem[],
    searchTerm: string,
    maxResults: number = 5
  ): MessageSearchItem[] => {
    if (searchTerm.length < 3) return [];

    return messages
      .filter((msg) => msg.description.toLowerCase().includes(searchTerm))
      .slice(0, maxResults);
  };

  /**
   * Filter channels based on search term
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
   * @param {T[]} items - All items
   * @param {string[]} selectedIds - IDs of selected items to exclude
   * @returns {T[]} Items not in selectedIds
   */
  excludeSelected = <T extends { id: string }>(items: T[], selectedIds: string[]): T[] => {
    return items.filter((item) => !selectedIds.includes(item.id));
  };
}
