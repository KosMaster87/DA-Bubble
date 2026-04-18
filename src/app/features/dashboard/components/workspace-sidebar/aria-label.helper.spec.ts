/**
 * @fileoverview ARIA label helper unit tests
 * @description Tests for accessible label generation for sidebar items
 */
import { describe, expect, it } from 'vitest';
import {
  buildChannelAriaLabel,
  buildDirectMessageAriaLabel,
  buildMailboxAriaLabel,
  buildUnreadAriaSuffix,
} from './aria-label.helper';

describe('aria-label.helper', () => {
  describe('buildChannelAriaLabel()', () => {
    it('should build label for channel without unread items', () => {
      const result = buildChannelAriaLabel('general', 0, 0);
      expect(result).toContain('general');
      expect(result).not.toContain('unread');
    });

    it('should build label for channel with unread messages', () => {
      const result = buildChannelAriaLabel('general', 5, 0);
      expect(result).toContain('general');
      expect(result).toContain('5');
      expect(result).toContain('unread');
    });

    it('should build label for channel with unread threads', () => {
      const result = buildChannelAriaLabel('general', 0, 3);
      expect(result).toContain('general');
      expect(result).toContain('3');
      expect(result).toContain('thread');
    });

    it('should build label for channel with both unread messages and threads', () => {
      const result = buildChannelAriaLabel('general', 5, 3);
      expect(result).toContain('general');
      expect(result).toContain('5');
      expect(result).toContain('3');
    });

    it('should handle channel name with special characters', () => {
      const result = buildChannelAriaLabel('#random-fun-stuff', 0, 0);
      expect(result).toContain('random-fun-stuff');
    });
  });

  describe('buildDirectMessageAriaLabel()', () => {
    it('should build label for DM without unread items', () => {
      const result = buildDirectMessageAriaLabel('Alice', 0, 0);
      expect(result).toContain('Alice');
      expect(result).not.toContain('unread');
    });

    it('should build label for DM with unread messages', () => {
      const result = buildDirectMessageAriaLabel('Bob', 2, 0);
      expect(result).toContain('Bob');
      expect(result).toContain('2');
      expect(result).toContain('unread');
    });

    it('should build label for DM with unread threads', () => {
      const result = buildDirectMessageAriaLabel('Charlie', 0, 1);
      expect(result).toContain('Charlie');
      expect(result).toContain('1');
    });

    it('should build label for DM with both unread messages and threads', () => {
      const result = buildDirectMessageAriaLabel('Diana', 4, 2);
      expect(result).toContain('Diana');
      expect(result).toContain('4');
      expect(result).toContain('2');
    });

    it('should handle username with spaces', () => {
      const result = buildDirectMessageAriaLabel('John Doe', 0, 0);
      expect(result).toContain('John Doe');
    });
  });

  describe('buildMailboxAriaLabel()', () => {
    it('should build label for mailbox without unread items', () => {
      const result = buildMailboxAriaLabel(0);
      expect(result).toContain('Mailbox');
      expect(result).not.toContain('unread');
    });

    it('should build label for mailbox with unread items', () => {
      const result = buildMailboxAriaLabel(3);
      expect(result).toContain('Mailbox');
      expect(result).toContain('3');
      expect(result).toContain('unread');
    });

    it("should use singular 'item' for count of 1", () => {
      const result = buildMailboxAriaLabel(1);
      expect(result).toContain('Mailbox');
      expect(result).toContain('1');
      expect(result).toContain('item');
      expect(result).not.toContain('items');
    });

    it("should use plural 'items' for count greater than 1", () => {
      const result = buildMailboxAriaLabel(5);
      expect(result).toContain('Mailbox');
      expect(result).toContain('5');
      expect(result).toContain('items');
    });
  });

  describe('buildUnreadAriaSuffix()', () => {
    it('should return empty string when both counts are 0', () => {
      const result = buildUnreadAriaSuffix(0, 0);
      expect(result).toBe('');
    });

    it('should return suffix with message count when only messages unread', () => {
      const result = buildUnreadAriaSuffix(5, 0);
      expect(result).toContain('5');
      expect(result).toContain('unread');
      expect(result).not.toContain('thread');
    });

    it('should return suffix with thread count when only threads unread', () => {
      const result = buildUnreadAriaSuffix(0, 3);
      expect(result).toContain('3');
      expect(result).toContain('thread');
    });

    it('should return suffix with both counts when both unread', () => {
      const result = buildUnreadAriaSuffix(5, 3);
      expect(result).toContain('5');
      expect(result).toContain('3');
    });

    it('should use proper pluralization for singular message', () => {
      const result = buildUnreadAriaSuffix(1, 0);
      expect(result).toContain('1');
      // Check for singular form (e.g., "message" not "messages")
    });

    it('should use proper pluralization for singular thread', () => {
      const result = buildUnreadAriaSuffix(0, 1);
      expect(result).toContain('1');
      // Check for singular form (e.g., "thread" not "threads")
    });

    it('should handle large counts', () => {
      const result = buildUnreadAriaSuffix(99, 50);
      expect(result).toContain('99');
      expect(result).toContain('50');
    });
  });
});
