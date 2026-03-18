# DABubble MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that exposes **DABubble**'s Firebase data to AI assistants such as Claude Desktop, Cursor, VS Code Copilot and any other MCP-compatible host.

---

## What You Can Do (Available Tools)

| Tool | Description |
|------|-------------|
| `list_channels` | List all channels with member count and last-message timestamp |
| `get_channel_messages` | Retrieve recent messages from a specific channel |
| `send_channel_message` | Post a new text message to a channel |
| `list_users` | List all registered users with online status |
| `get_user` | Retrieve a user's full profile by UID |
| `list_direct_message_conversations` | List DM conversations for a given user |
| `get_direct_messages` | Retrieve recent messages from a DM conversation |
| `send_direct_message` | Post a new message to a DM conversation |
| `search_messages` | Full-text keyword search across all channel messages |

---

## Prerequisites

- Node.js ≥ 20
- A Firebase project with Firestore enabled
- A Firebase service-account key **or** [Application Default Credentials (ADC)](https://cloud.google.com/docs/authentication/application-default-credentials)

---

## Setup

### 1. Install dependencies

```bash
cd mcp
npm install
```

### 2. Configure environment variables

Create a `.env` file in the `mcp/` directory (never commit this file – it is already in `.gitignore`):

```dotenv
# Required – your Firebase project ID
FIREBASE_PROJECT_ID=your-project-id

# Optional – path to service-account JSON when ADC is not configured
GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json
```

### 3. Build

```bash
npm run build
```

### 4. Run

```bash
node lib/index.js
```

The server communicates over **stdio** and is ready to be consumed by any MCP host.

---

## Connecting to Claude Desktop

Add the following block to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "dabubble": {
      "command": "node",
      "args": ["/absolute/path/to/DABubble/mcp/lib/index.js"],
      "env": {
        "FIREBASE_PROJECT_ID": "your-project-id",
        "GOOGLE_APPLICATION_CREDENTIALS": "/path/to/serviceAccountKey.json"
      }
    }
  }
}
```

---

## Connecting to VS Code (GitHub Copilot)

The repository already ships a `.vscode/mcp.json` entry-point. Add the following to that file:

```json
{
  "servers": {
    "dabubble": {
      "type": "stdio",
      "command": "node",
      "args": ["${workspaceFolder}/mcp/lib/index.js"],
      "env": {
        "FIREBASE_PROJECT_ID": "your-project-id",
        "GOOGLE_APPLICATION_CREDENTIALS": "${env:HOME}/.config/gcloud/application_default_credentials.json"
      }
    }
  }
}
```

---

## Example Prompts

Once connected to an AI assistant you can ask things like:

- *"List all channels in DABubble."*
- *"Show me the last 10 messages in the #general channel."*
- *"Send 'Hello everyone!' to channel abc123 as user uid456."*
- *"Search for messages containing 'sprint review'."*
- *"Show the profile of user uid789."*

---

## Security Notes

- The server uses **Firebase Admin SDK** with full read/write access. Use Firestore Security Rules to restrict what the service account can access if needed.
- Never commit `serviceAccountKey.json` or `.env` files – both patterns are covered by `.gitignore`.
- The `send_channel_message` and `send_direct_message` tools write directly to Firestore; make sure you trust the AI assistant host before granting write access.
