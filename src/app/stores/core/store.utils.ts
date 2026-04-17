/**
 * @fileoverview Store utility functions and helpers
 * Provides helper functions for store management, data formatting,
 * and common operations used across multiple stores.
 * @description This utility module contains shared functions for store operations,
 * data validation, formatting utilities, and other common store-related tasks.
 * @module StoreUtils
 */

import { inject } from '@angular/core';
import {
  AuthStore,
  ChannelMemberStore,
  ChannelMessageStore,
  ChannelStore,
  DirectMessageStore,
  MessageStore,
  UserPresenceStore,
  UserStore,
} from '../index';

/**
 * Custom hook to access all stores in one object
 * Provides convenient access to all SignalStores in the application
 * @function useStores
 * @returns {Object} Object containing all store instances
 */
export function useStores() {
  const authStore = inject(AuthStore);
  const userStore = inject(UserStore);
  const channelStore = inject(ChannelStore);
  const channelMemberStore = inject(ChannelMemberStore);
  const messageStore = inject(MessageStore);
  const channelMessageStore = inject(ChannelMessageStore);
  const directMessageStore = inject(DirectMessageStore);
  const userPresenceStore = inject(UserPresenceStore);

  return {
    auth: authStore,
    user: userStore,
    channel: channelStore,
    channelMember: channelMemberStore,
    message: messageStore,
    channelMessage: channelMessageStore,
    directMessage: directMessageStore,
    userPresence: userPresenceStore,
  };
}

/**
 * Helper to get conversation ID for direct messages
 * @function getConversationId
 * @param {string} user1Id - First user ID
 * @param {string} user2Id - Second user ID
 * @returns {string} Conversation ID
 */
export function getConversationId(user1Id: string, user2Id: string): string {
  return [user1Id, user2Id].sort().join('_');
}

/**
 * Helper to format timestamps for display
 * @function formatTimestamp
 * @param {Date} date - Date to format
 * @returns {string} Formatted timestamp string
 */
export function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

/**
 * Helper to validate email format
 * @function isValidEmail
 * @param {string} email - Email to validate
 * @returns {boolean} True if email is valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Helper to generate unique message ID
 * @function generateMessageId
 * @returns {string} Unique message ID
 */
export function generateMessageId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Helper to sanitize user input
 * @function sanitizeInput
 * @param {string} input - Input to sanitize
 * @returns {string} Sanitized input
 */
export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}
