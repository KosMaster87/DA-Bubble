/**
 * @fileoverview Direct message list mapping helpers
 * @description Provides pure helper functions for constructing and extracting direct message list item data.
 * @module direct-message-list
 */

import { type DirectMessageConversation } from '@core/models/direct-message.model';
import { type User } from '@core/models/user.model';

const DEFAULT_DIRECT_MESSAGE_AVATAR = '/img/profile/profile-0.svg';

type DirectMessageParticipant = Pick<User, 'uid' | 'displayName' | 'photoURL' | 'isOnline'>;

type DirectMessageListItem = {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  isOnline: boolean;
  hasUnread: boolean;
  hasThreadUnread: boolean;
  unreadMessageCount: number;
  unreadThreadCount: number;
};

/**
 * Extract the ID of the other participant in a two-user conversation.
 * @description Returns the other participant's ID or falls back to the current user's ID for self-DM conversations so the list item always has a valid user reference.
 *
 * @param conversation - Conversation data containing participant IDs
 * @param currentUserId - Current user ID to exclude from the result
 * @returns The ID of the other participant, or the current user ID for self-DMs
 */
export function getOtherDirectMessageParticipantId(
  conversation: DirectMessageConversation,
  currentUserId: string,
): string {
  const otherUserId = conversation.participants.find((id: string) => id !== currentUserId);
  return otherUserId || currentUserId;
}

/**
 * Construct a sidebar-ready direct message list item from conversation and user data.
 * @description Assembles the display model for the DM sidebar so unread badge counts and participant identity are calculated in one place.
 *
 * @param conversation - Conversation metadata
 * @param otherUserId - ID of the other conversation participant
 * @param otherUser - Resolved user data for the other participant (may be undefined)
 * @param unreadMessageCount - Number of unread normal messages in the conversation
 * @param unreadThreadCount - Number of parent messages with unread threads
 * @returns Sidebar-ready list item with all required display fields
 */
export function buildDirectMessageListItem(
  conversation: DirectMessageConversation,
  otherUserId: string,
  otherUser: DirectMessageParticipant | undefined,
  unreadMessageCount: number,
  unreadThreadCount: number,
): DirectMessageListItem {
  return {
    id: conversation.id,
    userId: otherUserId,
    name: otherUser?.displayName || 'Unknown User',
    avatar: otherUser?.photoURL || DEFAULT_DIRECT_MESSAGE_AVATAR,
    isOnline: otherUser?.isOnline || false,
    hasUnread: unreadMessageCount > 0,
    hasThreadUnread: unreadThreadCount > 0,
    unreadMessageCount,
    unreadThreadCount,
  };
}
