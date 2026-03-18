/**
 * @fileoverview Direct-message tools for the DABubble MCP server
 * @description MCP tools for reading and writing direct-message data.
 *
 * Exposed tools:
 *   - list_direct_message_conversations – list DM conversations for a user
 *   - get_direct_messages               – retrieve messages from a DM conversation
 *   - send_direct_message               – send a message to a DM conversation
 *
 * @module tools/direct-messages
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import { getFirestore } from '../firebase/admin.js';

/** Maximum number of messages returned per request */
const MAX_MESSAGES = 50;

/**
 * Format a Firestore timestamp or Date to an ISO string.
 *
 * @param {admin.firestore.Timestamp | Date | null | undefined} value - timestamp
 * @returns {string} ISO string or empty string
 */
function formatTimestamp(
  value: admin.firestore.Timestamp | Date | null | undefined,
): string {
  if (!value) return '';
  if (value instanceof admin.firestore.Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return '';
}

/**
 * Register all direct-message-related MCP tools on the given server instance.
 *
 * @param {McpServer} server - The MCP server instance
 */
export function registerDirectMessageTools(server: McpServer): void {
  // -----------------------------------------------------------------------
  // list_direct_message_conversations
  // -----------------------------------------------------------------------
  server.tool(
    'list_direct_message_conversations',
    'List all direct-message conversations that a given user participates in.',
    {
      userId: z.string().describe('The Firebase UID of the user'),
    },
    async ({ userId }) => {
      const db = getFirestore();
      const snapshot = await db
        .collection('direct-messages')
        .where('participants', 'array-contains', userId)
        .orderBy('lastMessageAt', 'desc')
        .get();

      if (snapshot.empty) {
        return {
          content: [{ type: 'text', text: `No DM conversations found for user ${userId}.` }],
        };
      }

      const rows = snapshot.docs.map((doc) => {
        const d = doc.data();
        const participants: string[] = d['participants'] ?? [];
        const lastMsg = formatTimestamp(d['lastMessageAt']);
        return `• ${doc.id} | participants: ${participants.join(', ')} | last message: ${lastMsg || 'never'}`;
      });

      return {
        content: [
          {
            type: 'text',
            text: `DM conversations for ${userId} (${rows.length}):\n${rows.join('\n')}`,
          },
        ],
      };
    },
  );

  // -----------------------------------------------------------------------
  // get_direct_messages
  // -----------------------------------------------------------------------
  server.tool(
    'get_direct_messages',
    'Retrieve the most-recent messages from a DABubble direct-message conversation.',
    {
      conversationId: z
        .string()
        .describe('The Firestore document ID of the DM conversation'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(MAX_MESSAGES)
        .default(20)
        .describe(`Number of messages to return (1-${MAX_MESSAGES}, default 20)`),
    },
    async ({ conversationId, limit }) => {
      const db = getFirestore();
      const snapshot = await db
        .collection('direct-messages')
        .doc(conversationId)
        .collection('messages')
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      if (snapshot.empty) {
        return {
          content: [
            {
              type: 'text',
              text: `No messages found in conversation ${conversationId}.`,
            },
          ],
        };
      }

      const rows = snapshot.docs
        .reverse()
        .map((doc) => {
          const d = doc.data();
          const ts = formatTimestamp(d['createdAt']);
          return `[${ts}] ${d['authorId']}: ${d['content']}`;
        });

      return {
        content: [
          {
            type: 'text',
            text: `Messages in conversation ${conversationId} (${rows.length}):\n${rows.join('\n')}`,
          },
        ],
      };
    },
  );

  // -----------------------------------------------------------------------
  // send_direct_message
  // -----------------------------------------------------------------------
  server.tool(
    'send_direct_message',
    'Post a new text message to an existing DABubble direct-message conversation.',
    {
      conversationId: z
        .string()
        .describe('The Firestore document ID of the target DM conversation'),
      authorId: z.string().describe('The UID of the user sending the message'),
      content: z.string().min(1).describe('The text content of the message'),
    },
    async ({ conversationId, authorId, content }) => {
      const db = getFirestore();
      const now = admin.firestore.FieldValue.serverTimestamp();
      const ref = await db
        .collection('direct-messages')
        .doc(conversationId)
        .collection('messages')
        .add({
          content,
          authorId,
          type: 'text',
          attachments: [],
          reactions: [],
          isEdited: false,
          createdAt: now,
          updatedAt: now,
        });

      return {
        content: [
          {
            type: 'text',
            text: `Direct message sent successfully. Document ID: ${ref.id}`,
          },
        ],
      };
    },
  );
}
