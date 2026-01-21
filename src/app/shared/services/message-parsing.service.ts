/**
 * @fileoverview Message Parsing Service
 * @description Parses message text into segments with @mentions and #channels
 * @module shared/services/message-parsing
 */

import { Injectable } from '@angular/core';

export interface MessageSegment {
  type: 'text' | 'mention' | 'channel';
  content: string;
  id?: string;
  avatar?: string;
}

export interface User {
  uid: string;
  displayName: string;
  photoURL?: string;
}

export interface Channel {
  id: string;
  name: string;
}

@Injectable()
export class MessageParsingService {
  /**
   * Parse message content into segments
   * @param {string} text - Message text to parse
   * @param {User[]} users - Available users for mentions
   * @param {Channel[]} channels - Available channels for mentions
   * @returns {MessageSegment[]} Array of parsed segments
   */
  parse = (text: string, users: User[], channels: Channel[]): MessageSegment[] => {
    const segments: MessageSegment[] = [];
    let currentIndex = 0;

    while (currentIndex < text.length) {
      currentIndex = this.parseSegmentAtIndex(text, currentIndex, segments, users, channels);
    }

    return segments;
  };

  /**
   * Parse segment at current index
   * @param {string} text - Full message text
   * @param {number} currentIndex - Current parsing position
   * @param {MessageSegment[]} segments - Accumulated segments array
   * @param {User[]} users - Available users
   * @param {Channel[]} channels - Available channels
   * @returns {number} New index position
   */
  private parseSegmentAtIndex = (
    text: string,
    currentIndex: number,
    segments: MessageSegment[],
    users: User[],
    channels: Channel[]
  ): number => {
    const char = text[currentIndex];

    if (char === '@') {
      const result = this.matchMention(text, currentIndex, users);
      if (result) {
        segments.push(result.segment);
        return result.endIndex;
      }
    } else if (char === '#') {
      const result = this.matchChannel(text, currentIndex, channels);
      if (result) {
        segments.push(result.segment);
        return result.endIndex;
      }
    }

    return this.addTextSegment(text, currentIndex, segments);
  };

  /**
   * Create text segment from string
   * @param {string} text - Text content
   * @param {number} startIndex - Start position
   * @param {number} endIndex - End position
   * @returns {MessageSegment | null} Text segment or null if empty
   */
  private createTextSegment = (text: string, startIndex: number, endIndex: number): MessageSegment | null => {
    const textContent = text.slice(startIndex, endIndex);
    if (!textContent) return null;
    return { type: 'text', content: textContent };
  };

  /**
   * Add text segment until next special character
   * @param {string} text - Full message text
   * @param {number} currentIndex - Current parsing position
   * @param {MessageSegment[]} segments - Accumulated segments array
   * @returns {number} New index position
   */
  private addTextSegment = (text: string, currentIndex: number, segments: MessageSegment[]): number => {
    const nextSpecial = text.slice(currentIndex).search(/[@#]/);
    const endIndex = nextSpecial === -1 ? text.length : currentIndex + nextSpecial;
    const textSegment = this.createTextSegment(text, currentIndex, endIndex);

    if (textSegment) segments.push(textSegment);
    return endIndex;
  };

  /**
   * Find maximum end index for mention search
   * @param {string} text - Full message text
   * @param {number} startIndex - Start position of @ or # symbol
   * @returns {number} Maximum end index
   */
  private findMaxEndIndex = (text: string, startIndex: number): number => {
    const nextSpecial = text.slice(startIndex + 1).search(/[@#]/);
    return nextSpecial === -1 ? text.length : startIndex + 1 + nextSpecial;
  };

  /**
   * Try to find user by name
   * @param {string} name - User display name to search for
   * @param {User[]} users - Available users
   * @returns {User | null} User object or null
   */
  private findUserByName = (name: string, users: User[]): User | null => {
    return users.find((u) => u.displayName === name) || null;
  };

  /**
   * Create mention segment from user
   * @param {string} name - User display name
   * @param {User} user - User object
   * @param {number} startIndex - Start position
   * @returns {{ segment: MessageSegment; endIndex: number }} Mention result
   */
  private createMentionSegment = (name: string, user: User, startIndex: number) => {
    return {
      segment: {
        type: 'mention' as const,
        content: `@${name}`,
        id: user.uid,
        avatar: user.photoURL || '/img/profile/default-avatar.png',
      },
      endIndex: startIndex + 1 + name.length,
    };
  };

  /**
   * Match a user mention starting at the given index
   * Uses greedy matching with backtracking to find longest valid user name
   * @param {string} text - Full message text
   * @param {number} startIndex - Start position of @ symbol
   * @param {User[]} users - Available users
   * @returns {{ segment: MessageSegment; endIndex: number } | null} Mention result or null
   */
  private matchMention = (
    text: string,
    startIndex: number,
    users: User[]
  ): { segment: MessageSegment; endIndex: number } | null => {
    const maxEnd = this.findMaxEndIndex(text, startIndex);

    for (let i = maxEnd; i > startIndex + 1; i--) {
      const possibleName = text.slice(startIndex + 1, i).trim();
      const user = this.findUserByName(possibleName, users);

      if (user) return this.createMentionSegment(possibleName, user, startIndex);
    }

    return null;
  };

  /**
   * Try to find channel by name
   * @param {string} name - Channel name to search for
   * @param {Channel[]} channels - Available channels
   * @returns {Channel | null} Channel object or null
   */
  private findChannelByName = (name: string, channels: Channel[]): Channel | null => {
    return channels.find((c) => c.name === name) || null;
  };

  /**
   * Create channel segment from channel
   * @param {string} name - Channel name
   * @param {Channel} channel - Channel object
   * @param {number} startIndex - Start position
   * @returns {{ segment: MessageSegment; endIndex: number }} Channel result
   */
  private createChannelSegment = (name: string, channel: Channel, startIndex: number) => {
    return {
      segment: {
        type: 'channel' as const,
        content: `#${name}`,
        id: channel.id,
      },
      endIndex: startIndex + 1 + name.length,
    };
  };

  /**
   * Match a channel mention starting at the given index
   * Uses greedy matching with backtracking to find longest valid channel name
   * @param {string} text - Full message text
   * @param {number} startIndex - Start position of # symbol
   * @param {Channel[]} channels - Available channels
   * @returns {{ segment: MessageSegment; endIndex: number } | null} Channel result or null
   */
  private matchChannel = (
    text: string,
    startIndex: number,
    channels: Channel[]
  ): { segment: MessageSegment; endIndex: number } | null => {
    const maxEnd = this.findMaxEndIndex(text, startIndex);

    for (let i = maxEnd; i > startIndex + 1; i--) {
      const possibleName = text.slice(startIndex + 1, i).trim();
      const channel = this.findChannelByName(possibleName, channels);

      if (channel) return this.createChannelSegment(possibleName, channel, startIndex);
    }

    return null;
  };
}
