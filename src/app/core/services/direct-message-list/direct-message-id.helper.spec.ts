/**
 * @fileoverview Direct Message ID normalization helper unit tests
 * @description Tests for ID normalization, comparison, and user extraction utilities
 */
import { describe, expect, it } from 'vitest';
import {
  getOtherUserIdFromConversation,
  isSameDmConversation,
  normalizeDirectMessageId,
} from './direct-message-id.helper';

describe('direct-message-id.helper', () => {
  describe('normalizeDirectMessageId()', () => {
    it('should normalize self-DM temporary ID to canonical form', () => {
      const result = normalizeDirectMessageId('self-user-123', 'user-123');
      expect(result).toBe('user-123_user-123');
    });

    it('should return non-self IDs unchanged', () => {
      const result = normalizeDirectMessageId('user-1_user-2', 'user-1');
      expect(result).toBe('user-1_user-2');
    });

    it('should handle empty string', () => {
      const result = normalizeDirectMessageId('', 'user-1');
      expect(result).toBe('');
    });

    it("should handle IDs that don't start with self-", () => {
      const result = normalizeDirectMessageId('regular-id', 'user-1');
      expect(result).toBe('regular-id');
    });
  });

  describe('isSameDmConversation()', () => {
    it('should return true for identical user pair in same order', () => {
      const result = isSameDmConversation('user-1_user-2', 'user-1', 'user-2');
      expect(result).toBeTruthy();
    });

    it('should return true for identical user pair in reverse order', () => {
      const result = isSameDmConversation('user-1_user-2', 'user-2', 'user-1');
      expect(result).toBeTruthy();
    });

    it('should return true for self-DM conversation', () => {
      const result = isSameDmConversation('user-1_user-1', 'user-1', 'user-1');
      expect(result).toBeTruthy();
    });

    it('should return false for different user pairs', () => {
      const result = isSameDmConversation('user-1_user-2', 'user-3', 'user-4');
      expect(result).toBeFalsy();
    });

    it('should return false when only one user matches', () => {
      const result = isSameDmConversation('user-1_user-2', 'user-1', 'user-3');
      expect(result).toBeFalsy();
    });

    it('should handle malformed conversation ID', () => {
      const result = isSameDmConversation('malformed', 'user-1', 'user-2');
      expect(result).toBeFalsy();
    });
  });

  describe('getOtherUserIdFromConversation()', () => {
    it('should extract other user ID when current user is first participant', () => {
      const result = getOtherUserIdFromConversation('user-1_user-2', 'user-1');
      expect(result).toBe('user-2');
    });

    it('should extract other user ID when current user is second participant', () => {
      const result = getOtherUserIdFromConversation('user-1_user-2', 'user-2');
      expect(result).toBe('user-1');
    });

    it('should return same user ID for self-DM', () => {
      const result = getOtherUserIdFromConversation('user-1_user-1', 'user-1');
      expect(result).toBe('user-1');
    });

    it('should handle malformed conversation ID (single part)', () => {
      const result = getOtherUserIdFromConversation('single-id', 'user-1');
      expect(result).toBe('single-id');
    });

    it('should return empty string for empty conversation ID', () => {
      const result = getOtherUserIdFromConversation('', 'user-1');
      expect(result).toBe('');
    });
  });
});
