/**
 * @fileoverview Search Autocomplete Service
 * @description Service for autocomplete search functionality with filtering by channels, users, and messages
 * @module shared/services/search-autocomplete
 */

import { Injectable, inject, computed, signal } from '@angular/core';
import { ChannelStore } from '@stores/channel.store';
import { UserStore } from '@stores/user.store';
import { ChannelMessageStore } from '@stores/channel-message.store';
import { DirectMessageStore } from '@stores/direct-message.store';

/**
 * Search result type
 */
export type SearchResultType = 'channel' | 'user' | 'message';

/**
 * Search result interface
 */
export interface SearchResult {
  id: string;
  type: SearchResultType;
  displayName: string;
  avatar?: string;
  description?: string;
  isPrivate?: boolean;
  email?: string;
}

/**
 * Search filter prefix
 */
export type SearchPrefix = '#' | '@' | '$' | '';

@Injectable({
  providedIn: 'root',
})
export class SearchAutocompleteService {
  private channelStore = inject(ChannelStore);
  private userStore = inject(UserStore);
  private channelMessageStore = inject(ChannelMessageStore);
  private directMessageStore = inject(DirectMessageStore);

  private _searchQuery = signal('');
  readonly searchQuery = this._searchQuery.asReadonly();

  /**
   * Detect search prefix (# for channels, @ for users, $ for messages)
   */
  private searchPrefix = computed<SearchPrefix>(() => {
    const query = this._searchQuery();
    if (query.startsWith('#')) return '#';
    if (query.startsWith('@')) return '@';
    if (query.startsWith('$')) return '$';
    return '';
  });

  /**
   * Clean search term without prefix
   */
  private searchTerm = computed(() => {
    const query = this._searchQuery();
    const prefix = this.searchPrefix();
    return prefix ? query.slice(1).toLowerCase().trim() : query.toLowerCase().trim();
  });

  /**
   * Filter channels based on search term
   */
  private filteredChannels = computed<SearchResult[]>(() => {
    const prefix = this.searchPrefix();
    const term = this.searchTerm();

    // Only filter channels if prefix is # or no prefix
    if (prefix === '@' || prefix === '$') return [];

    if (!term) {
      // Return all channels if no search term
      return this.channelStore.channels().map(channel => ({
        id: channel.id,
        type: 'channel' as SearchResultType,
        displayName: `#${channel.name}`,
        description: channel.description || '',
        isPrivate: channel.isPrivate,
      }));
    }

    return this.channelStore
      .channels()
      .filter(channel => channel.name.toLowerCase().includes(term))
      .map(channel => ({
        id: channel.id,
        type: 'channel' as SearchResultType,
        displayName: `#${channel.name}`,
        description: channel.description || '',
        isPrivate: channel.isPrivate,
      }));
  });

  /**
   * Filter users based on search term
   */
  private filteredUsers = computed<SearchResult[]>(() => {
    const prefix = this.searchPrefix();
    const term = this.searchTerm();

    // Only filter users if prefix is @ or no prefix
    if (prefix === '#' || prefix === '$') return [];

    if (!term) {
      // Return all users if no search term
      return this.userStore.users().map(user => ({
        id: user.uid,
        type: 'user' as SearchResultType,
        displayName: `@${user.displayName}`,
        avatar: user.photoURL || '',
        email: user.email,
      }));
    }

    return this.userStore
      .users()
      .filter(
        user =>
          user.displayName.toLowerCase().includes(term) ||
          user.email?.toLowerCase().includes(term)
      )
      .map(user => ({
        id: user.uid,
        type: 'user' as SearchResultType,
        displayName: `@${user.displayName}`,
        avatar: user.photoURL || '',
        email: user.email,
      }));
  });

  /**
   * Search in messages (within channels and direct messages)
   */
  private searchMessages = computed<SearchResult[]>(() => {
    const prefix = this.searchPrefix();
    const term = this.searchTerm();

    console.log('searchMessages - prefix:', prefix, 'term:', term, 'length:', term.length);

    // Only search messages if prefix is $ or no prefix (and term length >= 3)
    if (prefix === '#' || prefix === '@') {
      console.log('searchMessages - skipped due to prefix');
      return [];
    }
    if (!term || term.length < 3) {
      console.log('searchMessages - skipped due to term length');
      return [];
    }

    const results: { result: SearchResult; date: Date }[] = [];

    // Search in channel messages
    const channelMessagesObj = this.channelMessageStore.channelMessages();
    console.log('searchMessages - channelMessagesObj:', Object.keys(channelMessagesObj).length, 'channels');
    const allChannelMessages: any[] = [];

    // Flatten all channel messages with dates
    Object.entries(channelMessagesObj).forEach(([channelId, messages]) => {
      console.log(`Channel ${channelId} has ${messages.length} messages`);
      messages.forEach((msg: any) => {
        if (msg.content?.toLowerCase().includes(term)) {
          console.log('Found matching message:', msg.content);
          allChannelMessages.push({
            ...msg,
            channelId,
            searchDate: msg.createdAt
          });
        }
      });
    });

    console.log('searchMessages - found', allChannelMessages.length, 'matching channel messages');

    // Sort by date (newest first) and take top 5
    allChannelMessages.sort((a, b) => {
      const dateA = a.searchDate instanceof Date ? a.searchDate : new Date(a.searchDate);
      const dateB = b.searchDate instanceof Date ? b.searchDate : new Date(b.searchDate);
      return dateB.getTime() - dateA.getTime();
    });

    const topChannelMessages = allChannelMessages.slice(0, 5);

    // Create results for top channel messages
    topChannelMessages.forEach((msg: any) => {
      const channel = this.channelStore.channels().find(c => c.id === msg.channelId);
      if (channel) {
        const msgDate = msg.searchDate instanceof Date ? msg.searchDate : new Date(msg.searchDate);
        results.push({
          result: {
            id: `${msg.channelId}_${msg.id}`,
            type: 'message' as SearchResultType,
            displayName: `#${channel.name}`,
            description: msg.content.substring(0, 60) + (msg.content.length > 60 ? '...' : ''),
          },
          date: msgDate
        });
      }
    });

    // Search in direct messages
    const directMessagesObj = this.directMessageStore.messages();
    console.log('searchMessages - directMessagesObj:', Object.keys(directMessagesObj).length, 'conversations');
    const allDirectMessages: any[] = [];

    // Flatten all direct messages with dates
    Object.entries(directMessagesObj).forEach(([conversationId, messages]) => {
      console.log(`Conversation ${conversationId} has ${messages.length} messages`);
      messages.forEach((msg: any) => {
        if (msg.content?.toLowerCase().includes(term)) {
          console.log('Found matching DM:', msg.content);
          allDirectMessages.push({
            ...msg,
            conversationId,
            searchDate: msg.createdAt
          });
        }
      });
    });

    console.log('searchMessages - found', allDirectMessages.length, 'matching DMs');

    // Sort by date (newest first) and take top 5
    allDirectMessages.sort((a, b) => {
      const dateA = a.searchDate instanceof Date ? a.searchDate : new Date(a.searchDate);
      const dateB = b.searchDate instanceof Date ? b.searchDate : new Date(b.searchDate);
      return dateB.getTime() - dateA.getTime();
    });

    const topDirectMessages = allDirectMessages.slice(0, 5);

    // Create results for top DM messages
    topDirectMessages.forEach((msg: any) => {
      const conversation = this.directMessageStore.conversations().find((c: any) => c.id === msg.conversationId);
      if (conversation) {
        const otherParticipantId = conversation.participants.find((uid: string) => {
          return true; // For now, just use the first participant
        });

        const otherUser = otherParticipantId ? this.userStore.users().find(u => u.uid === otherParticipantId) : null;
        const msgDate = msg.searchDate instanceof Date ? msg.searchDate : new Date(msg.searchDate);

        results.push({
          result: {
            id: `${msg.conversationId}_${msg.id}`,
            type: 'message' as SearchResultType,
            displayName: otherUser ? `@${otherUser.displayName}` : 'Direct Message',
            description: msg.content.substring(0, 60) + (msg.content.length > 60 ? '...' : ''),
          },
          date: msgDate
        });
      }
    });

    // Sort all results by date (newest first) and take top 5
    results.sort((a, b) => b.date.getTime() - a.date.getTime());

    console.log('searchMessages - total results:', results.length);

    return results.slice(0, 5).map(r => r.result);
  });

  /**
   * Combined search results
   */
  readonly searchResults = computed<SearchResult[]>(() => {
    const prefix = this.searchPrefix();
    const channels = this.filteredChannels();
    const users = this.filteredUsers();
    const messages = this.searchMessages();

    // If prefix is used, only return the corresponding type
    if (prefix === '#') return channels;
    if (prefix === '@') return users;
    if (prefix === '$') return messages;

    // Otherwise, return all results (channels, users, then messages)
    return [...channels, ...users, ...messages];
  });

  /**
   * Update search query
   */
  setSearchQuery(query: string): void {
    this._searchQuery.set(query);
  }

  /**
   * Clear search
   */
  clearSearch(): void {
    this._searchQuery.set('');
  }

  /**
   * Get result by ID and type
   */
  getResultById(id: string, type: SearchResultType): SearchResult | undefined {
    return this.searchResults().find(result => result.id === id && result.type === type);
  }
}
