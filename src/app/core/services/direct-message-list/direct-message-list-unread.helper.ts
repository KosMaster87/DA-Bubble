/**
 * @fileoverview Direct message unread heuristics helpers
 * @description Provides pure helper functions for timestamp and participation checks used by direct message unread badge calculations.
 * @module direct-message-list
 */

import {
  type DirectMessage,
  type DirectMessageConversation,
} from '@core/models/direct-message.model';
import { type ThreadMessage } from '@stores/threads/thread.store';

/**
 * Return the newest normal message timestamp from a conversation message list.
 * @description Finds the latest visible DM message timestamp so unread heuristics compare against the most recent direct activity.
 *
 * @param messages - Conversation messages
 * @returns Latest message timestamp or undefined when there are no messages
 */
export function getLatestDirectMessageTime(messages: DirectMessage[]): Date | undefined {
  return messages.reduce((latest: Date | undefined, message) => {
    const messageTime =
      message.createdAt instanceof Date ? message.createdAt : new Date(message.createdAt);
    return !latest || messageTime > latest ? messageTime : latest;
  }, undefined);
}

/**
 * Return the newest thread activity timestamp from a conversation message list.
 * @description Finds the latest thread update time so thread-only activity can be distinguished from normal message activity.
 *
 * @param messages - Conversation messages
 * @returns Latest thread timestamp or undefined when no thread activity exists
 */
export function getLatestDirectMessageThreadTime(messages: DirectMessage[]): Date | undefined {
  return messages.reduce((latest: Date | undefined, message) => {
    if (!message.lastThreadTimestamp) return latest;
    const threadTime =
      message.lastThreadTimestamp instanceof Date
        ? message.lastThreadTimestamp
        : new Date(message.lastThreadTimestamp);
    return !latest || threadTime > latest ? threadTime : latest;
  }, undefined);
}

/**
 * Derive the fallback unread timestamp from conversation metadata.
 * @description Chooses a fallback timestamp for unread badge calculation while excluding thread-only updates from normal unread detection.
 *
 * @param conversation - Conversation metadata
 * @param messages - Conversation messages
 * @returns Fallback timestamp or undefined when the latest update only reflects thread activity
 */
export function getDirectMessageFallbackTimestamp(
  conversation: DirectMessageConversation,
  messages: DirectMessage[],
): Date | undefined {
  if (!conversation.lastMessageAt) return undefined;

  const lastMessageTime =
    conversation.lastMessageAt instanceof Date
      ? conversation.lastMessageAt
      : new Date(conversation.lastMessageAt);
  const latestThreadTime = getLatestDirectMessageThreadTime(messages);

  if (!latestThreadTime) return lastMessageTime;

  const isThreadUpdate = Math.abs(lastMessageTime.getTime() - latestThreadTime.getTime()) < 1000;
  return isThreadUpdate ? undefined : lastMessageTime;
}

/**
 * Check whether the current user participated in a thread.
 * @description Determines participation from both the parent message and thread replies so unread thread badges only appear for relevant conversation participants.
 *
 * @param message - Parent message of the thread
 * @param threadMessages - Thread replies for the parent message
 * @param userId - Current user ID
 * @returns True when the user authored the parent or any reply
 */
export function hasThreadParticipation(
  message: DirectMessage,
  threadMessages: ThreadMessage[],
  userId: string,
): boolean {
  const wroteThreadReply = threadMessages.some(
    (threadMessage) => threadMessage.authorId === userId,
  );
  const wroteParentMessage = message.authorId === userId;
  return wroteThreadReply || wroteParentMessage;
}
