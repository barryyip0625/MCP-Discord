# MCP-Discord
[![smithery badge](https://smithery.ai/badge/@barryyip0625/mcp-discord)](https://smithery.ai/server/@barryyip0625/mcp-discord) ![](https://badge.mcpx.dev?type=server 'MCP Server')

A Discord MCP (Model Context Protocol) server that enables AI assistants to interact with the Discord platform.

<a href="https://glama.ai/mcp/servers/@barryyip0625/mcp-discord">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@barryyip0625/mcp-discord/badge" alt="MCP-Discord MCP server" />
</a>

## Overview

MCP-Discord provides the following Discord-related functionalities:

- Login to Discord bot
- Get server information
- Read/delete channel messages
- Send messages to specified channels
- Retrieve forum channel lists
- Create/delete/reply to forum posts
- Create/delete text channels
- Add/remove message reactions
- Create/edit/delete/use webhooks

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Tools Documentation](#tools-documentation)
  - [Basic Functions](#basic-functions)
  - [Channel Management](#channel-management)
  - [Forum Functions](#forum-functions)
  - [Messages and Reactions](#messages-and-reactions)
  - [Webhook Management](#webhook-management)
- [Development](#development)
- [License](#license)

## Prerequisites

- Node.js (v16.0.0 or higher)
- npm (v7.0.0 or higher)
- A Discord bot with appropriate permissions
  - Bot token (obtainable from the [Discord Developer Portal](https://discord.com/developers/applications))
  - Message Content Intent enabled
  - Server Members Intent enabled
  - Presence Intent enabled
- Permissions in your Discord server:
  - Send Messages
  - Create Public Threads
  - Send Messages in Threads
  - Manage Threads
  - Manage Channels
  - Add Reactions

## Installation

### Installing via Smithery

To install mcp-discord for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@barryyip0625/mcp-discord):

```bash
npx -y @smithery/cli install @barryyip0625/mcp-discord --client claude
```

### Manual Installation
```bash
# Clone the repository
git clone https://github.com/barryyip0625/mcp-discord.git
cd mcp-discord

# Install dependencies
npm install

# Compile TypeScript
npm run build
```

## Configuration

A Discord bot token is required for proper operation. You can provide it in two ways:

1. Environment variables:
```
DISCORD_TOKEN=your_discord_bot_token
```

2. Using the `--config` parameter when launching:
```
node path/to/mcp-discord/build/index.js --config "{\"DISCORD_TOKEN\":\"your_discord_bot_token\"}"
```

## Usage with Claude/Cursor
- Claude
  
    ```json
    {
        "mcpServers": {
            "discord": {
                "command": "node",
                "args": [
                    "path/to/mcp-discord/build/index.js"
                ],
                "env": {
                    "DISCORD_TOKEN": "your_discord_bot_token"
                }
            }
        }
    }
    ```

- Cursor

    ```json
    {
        "mcpServers": {
            "discord": {
                "command": "cmd",
                "args": [
                    "/c",
                    "node",
                    "path/to/mcp-discord/build/index.js"
                ],
                "env": {
                    "DISCORD_TOKEN": "your_discord_bot_token"
                }
             }
         }
    }
    ```

## Tools Documentation

### Basic Functions

- `discord_login`: Login to Discord
- `discord_send`: Send a message to a specified channel
- `discord_get_server_info`: Get Discord server information

### Channel Management

- `discord_create_text_channel`: Create a text channel
- `discord_delete_channel`: Delete a channel

### Forum Functions

- `discord_get_forum_channels`: Get a list of forum channels
- `discord_create_forum_post`: Create a forum post
- `discord_get_forum_post`: Get a forum post
- `discord_reply_to_forum`: Reply to a forum post
- `discord_delete_forum_post`: Delete a forum post

### Messages and Reactions

- `discord_read_messages`: Read channel messages
- `discord_add_reaction`: Add a reaction to a message
- `discord_add_multiple_reactions`: Add multiple reactions to a message
- `discord_remove_reaction`: Remove a reaction from a message
- `discord_delete_message`: Delete a specific message from a channel

### Webhook Management

- `discord_create_webhook`: Creates a new webhook for a Discord channel
- `discord_send_webhook_message`: Sends a message to a Discord channel using a webhook
- `discord_edit_webhook`: Edits an existing webhook for a Discord channel
- `discord_delete_webhook`: Deletes an existing webhook for a Discord channel

## Development

```bash
# Development mode
npm run dev
```

## License

[MIT License](https://github.com/barryyip0625/mcp-discord?tab=MIT-1-ov-file)
