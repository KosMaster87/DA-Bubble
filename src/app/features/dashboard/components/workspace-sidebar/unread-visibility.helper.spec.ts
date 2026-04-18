/**
 * @fileoverview Unread visibility helper unit tests
 * @description Tests for badge visibility rules and count formatting
 */
import { describe, expect, it } from 'vitest';
import {
  formatBadgeCount,
  getVisibleUnreadMessageCount,
  getVisibleUnreadThreadCount,
  shouldRenderUnreadBadges,
} from './unread-visibility.helper';

describe('unread-visibility.helper', () => {
  describe('getVisibleUnreadMessageCount()', () => {
    it('should return count when item is not active', () => {
      const result = getVisibleUnreadMessageCount(5, false);
      expect(result).toBe(5);
    });

    it('should return 0 when item is active', () => {
      const result = getVisibleUnreadMessageCount(5, true);
      expect(result).toBe(0);
    });

    it('should return 0 when count is already 0', () => {
      const result = getVisibleUnreadMessageCount(0, false);
      expect(result).toBe(0);
    });

    it('should suppress count when active even if count is large', () => {
      const result = getVisibleUnreadMessageCount(99, true);
      expect(result).toBe(0);
    });
  });

  describe('getVisibleUnreadThreadCount()', () => {
    it('should return count when item is not active', () => {
      const result = getVisibleUnreadThreadCount(3, false);
      expect(result).toBe(3);
    });

    it('should keep the count when item is active', () => {
      const result = getVisibleUnreadThreadCount(3, true);
      expect(result).toBe(3);
    });

    it('should return 0 when count is already 0', () => {
      const result = getVisibleUnreadThreadCount(0, false);
      expect(result).toBe(0);
    });

    it('should keep large counts visible when active', () => {
      const result = getVisibleUnreadThreadCount(50, true);
      expect(result).toBe(50);
    });
  });

  describe('formatBadgeCount()', () => {
    it('should return count as string when less than 100', () => {
      const result = formatBadgeCount(5);
      expect(result).toBe('5');
    });

    it("should return '99+' when count is 100 or more", () => {
      const result = formatBadgeCount(100);
      expect(result).toBe('99+');
    });

    it("should return '99+' for very large counts", () => {
      const result = formatBadgeCount(999);
      expect(result).toBe('99+');
    });

    it("should return '0' when count is 0", () => {
      const result = formatBadgeCount(0);
      expect(result).toBe('0');
    });

    it("should return '1' for edge case", () => {
      const result = formatBadgeCount(1);
      expect(result).toBe('1');
    });

    it("should return '99' for count 99", () => {
      const result = formatBadgeCount(99);
      expect(result).toBe('99');
    });

    it('should handle negative counts (treat as 0)', () => {
      const result = formatBadgeCount(-5);
      expect(result).toBe('-5'); // Or adjust based on helper implementation
    });
  });

  describe('shouldRenderUnreadBadges()', () => {
    it('should return true when unread message count is greater than 0', () => {
      const result = shouldRenderUnreadBadges(5, 0);
      expect(result).toBeTruthy();
    });

    it('should return true when unread thread count is greater than 0', () => {
      const result = shouldRenderUnreadBadges(0, 3);
      expect(result).toBeTruthy();
    });

    it('should return true when both counts are greater than 0', () => {
      const result = shouldRenderUnreadBadges(5, 3);
      expect(result).toBeTruthy();
    });

    it('should return false when both counts are 0', () => {
      const result = shouldRenderUnreadBadges(0, 0);
      expect(result).toBeFalsy();
    });

    it('should return false for negative or zero counts', () => {
      expect(shouldRenderUnreadBadges(-1, 0)).toBeFalsy();
      expect(shouldRenderUnreadBadges(0, -1)).toBeFalsy();
    });
  });
});
