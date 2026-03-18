/**
 * @fileoverview Search tools for the DABubble MCP server
 * @description MCP tool for searching messages across channels and DMs.
 *
 * Exposed tools:
 *   - search_messages – full-text keyword search across channel messages
 *
 * @module tools/search
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import { getFirestore } from '../firebase/admin.js';

/** Maximum hits returned per search request */
const MAX_RESULTS = 30;

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
 * Search messages inside a single Firestore messages collection.
 *
 * Firestore does not support native full-text search, so we fetch the most
 * recent documents and filter client-side.  For production deployments
 * consider integrating Algolia or Typesense.
 *
 * @param {admin.firestore.CollectionReference} collection - messages collection
 * @param {string} query - lowercase search keyword
 * @param {number} limit - max results to collect
 * @returns {Promise<string[]>} Formatted result lines
 */
async function searchCollection(
  collection: admin.firestore.CollectionReference,
  query: string,
  limit: number,
): Promise<string[]> {
  const snapshot = await collection.orderBy('createdAt', 'desc').limit(200).get();
  const results: string[] = [];

  for (const doc of snapshot.docs) {
    if (results.length >= limit) break;
    const d = doc.data();
    const content: string = (d['content'] ?? '').toLowerCase();
    if (content.includes(query)) {
      const ts = formatTimestamp(d['createdAt']);
      results.push(`[${ts}] ${d['authorId']}: ${d['content']}`);
    }
  }

  return results;
}

/**
 * Register all search-related MCP tools on the given server instance.
 *
 * @param {McpServer} server - The MCP server instance
 */
export function registerSearchTools(server: McpServer): void {
  // -----------------------------------------------------------------------
  // search_messages
  // -----------------------------------------------------------------------
  server.tool(
    'search_messages',
    'Search for messages containing a keyword across all DABubble channels.',
    {
      query: z.string().min(1).describe('The keyword or phrase to search for'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(MAX_RESULTS)
        .default(10)
        .describe(`Maximum number of results to return (1-${MAX_RESULTS}, default 10)`),
    },
    async ({ query, limit }) => {
      const db = getFirestore();
      const lowerQuery = query.toLowerCase();

      const channelsSnapshot = await db.collection('channels').get();
      const allResults: string[] = [];

      for (const channelDoc of channelsSnapshot.docs) {
        if (allResults.length >= limit) break;
        const messagesCol = db
          .collection('channels')
          .doc(channelDoc.id)
          .collection('messages');

        const remaining = limit - allResults.length;
        const hits = await searchCollection(messagesCol, lowerQuery, remaining);
        const channelName: string = channelDoc.data()['name'] ?? channelDoc.id;
        hits.forEach((h) => allResults.push(`#${channelName}: ${h}`));
      }

      if (allResults.length === 0) {
        return {
          content: [{ type: 'text', text: `No messages found containing "${query}".` }],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: `Search results for "${query}" (${allResults.length}):\n${allResults.join('\n')}`,
          },
        ],
      };
    },
  );
}
