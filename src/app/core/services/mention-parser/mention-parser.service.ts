/**
 * @fileoverview Mention Parser Service
 * @description Extracts user and channel mentions from message content
 * @module core/services/mention-parser
 */

import { Injectable, inject } from '@angular/core';
import { UserStore } from '@stores/users/user.store';
import { ChannelStore } from '@stores/channels/channel.store';

@Injectable({
  providedIn: 'root',
})
export class MentionParserService {
  private userStore = inject(UserStore);
  private channelStore = inject(ChannelStore);

  /**
   * Extract mentioned user IDs from message content
   * @param {string} content - Message content with @mentions
   * @returns {string[]} Array of unique user IDs mentioned
   * @description Parses @mentions using greedy backtracking algorithm (max 100 chars)
   * @example "@John Doe hello" -> ["user123"] if John Doe exists in UserStore
   */
  extractMentionedUserIds = (content: string): string[] => {
    const users = this.userStore.users();
    const mentionedIds: string[] = [];
    let currentIndex = 0;
    while (currentIndex < content.length) {
      const atIndex = content.indexOf('@', currentIndex);
      if (atIndex === -1) break;
      const userId = this.matchUserMention(content, atIndex, users);
      if (userId && !mentionedIds.includes(userId)) {
        mentionedIds.push(userId);
      }
      currentIndex = atIndex + 1;
    }
    return mentionedIds;
  };

  /**
   * Match user mention using greedy backtracking
   * @private
   * @param {string} text - Full message text
   * @param {number} startIndex - Index of @ character
   * @param {any[]} users - Array of users from UserStore
   * @returns {string | null} User ID if match found, null otherwise
   * @description Tries longest possible name first (max 100 chars), then backs off
   */
  private matchUserMention = (text: string, startIndex: number, users: any[]): string | null => {
    const maxEnd = Math.min(text.length, startIndex + 100);
    for (let i = maxEnd; i > startIndex + 1; i--) {
      const possibleName = text.slice(startIndex + 1, i).trim();
      const user = users.find((u) => u.displayName === possibleName);
      if (user) {
        return user.uid;
      }
    }
    return null;
  };
}
