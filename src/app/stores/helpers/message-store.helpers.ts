/**
 * @fileoverview Helper functions for `MessageStore`.
 * @description Contains pure builders used by the message store to keep Firestore
 * write payload construction isolated from store orchestration.
 * @module message-store
 */

import { CreateMessageRequest, Message } from '@core/models/message.model';

/**
 * Build complete message payload for Firestore writes.
 * @description Centralizes message creation so all send paths use a consistent
 * timestamp and reaction initialization strategy.
 * @param {CreateMessageRequest} messageData - Basic message data from the UI.
 * @param {string} authorId - ID of the message author.
 * @returns {Omit<Message, 'id'>} Message payload ready for Firestore.
 */
export function buildMessageData(
  messageData: CreateMessageRequest,
  authorId: string,
): Omit<Message, 'id'> {
  return {
    ...messageData,
    authorId,
    attachments: messageData.attachments || [],
    reactions: [],
    isEdited: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Build a stored message object after Firestore assigns an ID.
 * @description Combines the pre-write payload with the Firestore-generated
 * document ID so the local store can update immediately with a complete
 * message object.
 * @param {Omit<Message, 'id'>} message - Message payload without an ID.
 * @param {string} id - Firestore document ID.
 * @returns {Message} Complete message object with ID.
 */
export function buildStoredMessage(message: Omit<Message, 'id'>, id: string): Message {
  return { ...message, id };
}
