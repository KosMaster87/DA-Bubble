/**
 * @fileoverview Channel tools for the DABubble MCP server
 * @description MCP tools for reading and writing channel data in Firestore.
 *
 * Exposed tools:
 *   - list_channels           – list all channels the service account can read
 *   - get_channel_messages    – retrieve recent messages from a channel
 *   - send_channel_message    – post a new message to a channel
 *
 * @module tools/channels
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import { getFirestore } from '../firebase/admin.js';

/** Maximum number of messages returned per request */
const MAX_MESSAGES = 50;

/**
 * Format a Firestore timestamp or Date to an ISO string, gracefully
 * handling `null` / `undefined` values.
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
 * Register all channel-related MCP tools on the given server instance.
 *
 * @param {McpServer} server - The MCP server instance
 */
export function registerChannelTools(server: McpServer): void {
  // -----------------------------------------------------------------------
  // list_channels
  // -----------------------------------------------------------------------
  server.tool(
    'list_channels',
    'List all DABubble channels. Returns id, name, description, member count and last-message timestamp.',
    {},
    async () => {
      const db = getFirestore();
      const snapshot = await db.collection('channels').orderBy('name').get();

      if (snapshot.empty) {
        return { content: [{ type: 'text', text: 'No channels found.' }] };
      }

      const rows = snapshot.docs.map((doc) => {
        const d = doc.data();
        const members: string[] = d['members'] ?? [];
        const lastMsg = formatTimestamp(d['lastMessageAt']);
        return `• ${doc.id} | ${d['name']} | members: ${members.length} | last message: ${lastMsg || 'never'}`;
      });

      return {
        content: [
          {
            type: 'text',
            text: `Channels (${rows.length}):\n${rows.join('\n')}`,
          },
        ],
      };
    },
  );

  // -----------------------------------------------------------------------
  // get_channel_messages
  // -----------------------------------------------------------------------
  server.tool(
    'get_channel_messages',
    'Retrieve the most-recent messages from a DABubble channel.',
    {
      channelId: z.string().describe('The Firestore document ID of the channel'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(MAX_MESSAGES)
        .default(20)
        .describe(`Number of messages to return (1-${MAX_MESSAGES}, default 20)`),
    },
    async ({ channelId, limit }) => {
      const db = getFirestore();
      const snapshot = await db
        .collection('channels')
        .doc(channelId)
        .collection('messages')
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      if (snapshot.empty) {
        return {
          content: [{ type: 'text', text: `No messages found in channel ${channelId}.` }],
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
            text: `Messages in channel ${channelId} (${rows.length}):\n${rows.join('\n')}`,
          },
        ],
      };
    },
  );

  // -----------------------------------------------------------------------
  // send_channel_message
  // -----------------------------------------------------------------------
  server.tool(
    'send_channel_message',
    'Post a new text message to a DABubble channel.',
    {
      channelId: z.string().describe('The Firestore document ID of the target channel'),
      authorId: z.string().describe('The UID of the user sending the message'),
      content: z.string().min(1).describe('The text content of the message'),
    },
    async ({ channelId, authorId, content }) => {
      const db = getFirestore();
      const now = admin.firestore.FieldValue.serverTimestamp();
      const ref = await db
        .collection('channels')
        .doc(channelId)
        .collection('messages')
        .add({
          content,
          authorId,
          channelId,
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
            text: `Message sent successfully. Document ID: ${ref.id}`,
          },
        ],
      };
    },
  );
}
