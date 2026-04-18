/**
 * @fileoverview Direct Message ID normalization helpers
 * @description Utilities for handling self-DM IDs and canonical DM ID resolution
 * @module core/services/direct-message-list
 */

/**
 * Normalize direct message IDs for comparison and routing.
 *
 * Self-DM IDs have the form "self-{userId}" when first referenced via the sidebar,
 * but normalize to "{userId}_{userId}" once the conversation is created.
 * This helper ensures both forms map to the same canonical ID.
 *
 * @param directMessageId - The DM ID to normalize
 * @param currentUserId - Current user ID (used for self-DM resolution)
 * @returns Canonical DM ID in "{userId1}_{userId2}" format
 * @example
 * normalizeDirectMessageId('self-user-1', 'user-1') // => 'user-1_user-1'
 * normalizeDirectMessageId('user-1_user-2', 'user-1') // => 'user-1_user-2'
 */
export function normalizeDirectMessageId(directMessageId: string, currentUserId: string): string {
  if (!directMessageId.startsWith('self-')) return directMessageId;
  return `${currentUserId}_${currentUserId}`;
}

/**
 * Check if a DM ID represents a conversation between two users.
 *
 * @param conversationId - The conversation ID to check
 * @param userId1 - First user ID
 * @param userId2 - Second user ID
 * @returns True if the conversation is between these two users (in any order)
 */
export function isSameDmConversation(
  conversationId: string,
  userId1: string,
  userId2: string,
): boolean {
  const [id1, id2] = conversationId.split('_');
  return (id1 === userId1 && id2 === userId2) || (id1 === userId2 && id2 === userId1);
}

/**
 * Extract canonical user ID from a conversation ID.
 *
 * For a DM conversation between two users, returns the other user ID.
 * For a self-DM, returns the current user ID.
 *
 * @param conversationId - The DM conversation ID
 * @param currentUserId - Current user ID
 * @returns The ID of the other participant
 */
export function getOtherUserIdFromConversation(
  conversationId: string,
  currentUserId: string,
): string {
  const [participant1, participant2] = conversationId.split('_');
  return participant1 === currentUserId ? participant2 : participant1;
}
