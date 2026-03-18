/**
 * @fileoverview DABubble MCP Server – main entry point
 * @description Starts a Model Context Protocol (MCP) server that exposes
 *   DABubble's Firebase data to AI assistants via the stdio transport.
 *
 * Required environment variables:
 *   FIREBASE_PROJECT_ID             – Firebase project ID
 *   GOOGLE_APPLICATION_CREDENTIALS  – path to service-account JSON (when ADC
 *                                     is not configured)
 *
 * Usage:
 *   npm run build && node lib/index.js
 *
 * @module index
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { registerChannelTools } from './tools/channels.js';
import { registerUserTools } from './tools/users.js';
import { registerDirectMessageTools } from './tools/direct-messages.js';
import { registerSearchTools } from './tools/search.js';

/**
 * Create and configure the MCP server, then start listening on stdio.
 *
 * @returns {Promise<void>} Resolves once the server is connected
 */
async function main(): Promise<void> {
  const server = new McpServer({
    name: 'dabubble-mcp',
    version: '1.0.0',
  });

  registerChannelTools(server);
  registerUserTools(server);
  registerDirectMessageTools(server);
  registerSearchTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('Fatal error starting DABubble MCP server:', err);
  process.exit(1);
});
