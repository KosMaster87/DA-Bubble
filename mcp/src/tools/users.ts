/**
 * @fileoverview User tools for the DABubble MCP server
 * @description MCP tools for reading user data from Firestore.
 *
 * Exposed tools:
 *   - list_users  – list all registered users
 *   - get_user    – retrieve a single user's profile by UID
 *
 * @module tools/users
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import { getFirestore } from '../firebase/admin.js';

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
 * Register all user-related MCP tools on the given server instance.
 *
 * @param {McpServer} server - The MCP server instance
 */
export function registerUserTools(server: McpServer): void {
  // -----------------------------------------------------------------------
  // list_users
  // -----------------------------------------------------------------------
  server.tool(
    'list_users',
    'List all registered DABubble users with their display name, online status and last-seen timestamp.',
    {},
    async () => {
      const db = getFirestore();
      const snapshot = await db.collection('users').orderBy('displayName').get();

      if (snapshot.empty) {
        return { content: [{ type: 'text', text: 'No users found.' }] };
      }

      const rows = snapshot.docs.map((doc) => {
        const d = doc.data();
        const lastSeen = formatTimestamp(d['lastSeen']);
        const status = d['isOnline'] ? '🟢 online' : '⚫ offline';
        return `• ${doc.id} | ${d['displayName']} | ${status} | last seen: ${lastSeen || 'unknown'}`;
      });

      return {
        content: [
          {
            type: 'text',
            text: `Users (${rows.length}):\n${rows.join('\n')}`,
          },
        ],
      };
    },
  );

  // -----------------------------------------------------------------------
  // get_user
  // -----------------------------------------------------------------------
  server.tool(
    'get_user',
    'Retrieve the profile of a single DABubble user by UID.',
    {
      uid: z.string().describe('The Firebase UID of the user'),
    },
    async ({ uid }) => {
      const db = getFirestore();
      const doc = await db.collection('users').doc(uid).get();

      if (!doc.exists) {
        return {
          content: [{ type: 'text', text: `User with UID "${uid}" not found.` }],
        };
      }

      const d = doc.data()!;
      const lastSeen = formatTimestamp(d['lastSeen']);
      const createdAt = formatTimestamp(d['createdAt']);
      const channels: string[] = d['channels'] ?? [];
      const dms: string[] = d['directMessages'] ?? [];

      const lines = [
        `UID:           ${uid}`,
        `Display name:  ${d['displayName']}`,
        `Email:         ${d['email']}`,
        `Online:        ${d['isOnline'] ? 'yes' : 'no'}`,
        `Last seen:     ${lastSeen || 'unknown'}`,
        `Created at:    ${createdAt}`,
        `Channels:      ${channels.length} (${channels.join(', ') || 'none'})`,
        `Direct chats:  ${dms.length}`,
      ];

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    },
  );
}
