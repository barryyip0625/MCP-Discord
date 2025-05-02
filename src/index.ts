import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Client, GatewayIntentBits } from "discord.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { toolList } from './toolList.js';
import { 
  createToolContext, 
  loginHandler, 
  sendMessageHandler,
  getForumChannelsHandler,
  createForumPostHandler,
  getForumPostHandler,
  replyToForumHandler,
  deleteForumPostHandler,
  createTextChannelHandler,
  deleteChannelHandler,
  readMessagesHandler,
  getServerInfoHandler,
  addReactionHandler,
  addMultipleReactionsHandler,
  removeReactionHandler,
  deleteMessageHandler,
  createWebhookHandler,
  sendWebhookMessageHandler,
  editWebhookHandler,
  deleteWebhookHandler
} from './tools/tools.js';

// Configuration parsing
let config: any = {};

// Read configuration from environment variables
if (process.env.DISCORD_TOKEN) {
    config.DISCORD_TOKEN = process.env.DISCORD_TOKEN;
    console.log("Config loaded from environment variables. Discord token available:", !!config.DISCORD_TOKEN);
    if (config.DISCORD_TOKEN) {
        console.log("Token length:", config.DISCORD_TOKEN.length);
    }
} else {
    // Try to parse configuration from command line arguments (for backward compatibility)
    const configArgIndex = process.argv.indexOf('--config');
    if (configArgIndex !== -1 && configArgIndex < process.argv.length - 1) {
        try {
            let configStr = process.argv[configArgIndex + 1];
            
            // Print raw configuration string for debugging
            console.log("Raw config string:", configStr);
            
            // Try to parse JSON
            config = JSON.parse(configStr);
            console.log("Config parsed successfully. Discord token available:", !!config.DISCORD_TOKEN);
            
            if (config.DISCORD_TOKEN) {
                console.log("Token length:", config.DISCORD_TOKEN.length);
            }
        } catch (error) {
            console.error("Failed to parse config argument:", error);
            console.error("Raw config argument:", process.argv[configArgIndex + 1]);
            
            // Try to read arguments directly (for debugging)
            console.log("All arguments:", process.argv);
        }
    } else {
        console.warn("No config found in environment variables or command line arguments");
        console.log("All arguments:", process.argv);
    }
}

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Save token to client for login handler
if (config.DISCORD_TOKEN) {
    client.token = config.DISCORD_TOKEN;
}

// Create an MCP server
const server = new Server(
  {
    name: "MCP-Discord",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Set up the tool list
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: toolList
  };
});

// Create tool context
const toolContext = createToolContext(client);

// Handle tool execution requests
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let toolResponse;
    switch (name) {
      case "discord_login":
        toolResponse = await loginHandler(args, toolContext);
        return toolResponse;

      case "discord_send":
        toolResponse = await sendMessageHandler(args, toolContext);
        return toolResponse;

      case "discord_get_forum_channels":
        toolResponse = await getForumChannelsHandler(args, toolContext);
        return toolResponse;

      case "discord_create_forum_post":
        toolResponse = await createForumPostHandler(args, toolContext);
        return toolResponse;

      case "discord_get_forum_post":
        toolResponse = await getForumPostHandler(args, toolContext);
        return toolResponse;

      case "discord_reply_to_forum":
        toolResponse = await replyToForumHandler(args, toolContext);
        return toolResponse;

      case "discord_delete_forum_post":
        toolResponse = await deleteForumPostHandler(args, toolContext);
        return toolResponse;

      case "discord_create_text_channel":
        toolResponse = await createTextChannelHandler(args, toolContext);
        return toolResponse;

      case "discord_delete_channel":
        toolResponse = await deleteChannelHandler(args, toolContext);
        return toolResponse;

      case "discord_read_messages":
        toolResponse = await readMessagesHandler(args, toolContext);
        return toolResponse;

      case "discord_get_server_info":
        toolResponse = await getServerInfoHandler(args, toolContext);
        return toolResponse;

      case "discord_add_reaction":
        toolResponse = await addReactionHandler(args, toolContext);
        return toolResponse;

      case "discord_add_multiple_reactions":
        toolResponse = await addMultipleReactionsHandler(args, toolContext);
        return toolResponse;

      case "discord_remove_reaction":
        toolResponse = await removeReactionHandler(args, toolContext);
        return toolResponse;

      case "discord_delete_message":
        toolResponse = await deleteMessageHandler(args, toolContext);
        return toolResponse;

      case "discord_create_webhook":
        toolResponse = await createWebhookHandler(args, toolContext);
        return toolResponse;

      case "discord_send_webhook_message":
        toolResponse = await sendWebhookMessageHandler(args, toolContext);
        return toolResponse;

      case "discord_edit_webhook":
        toolResponse = await editWebhookHandler(args, toolContext);
        return toolResponse;

      case "discord_delete_webhook":
        toolResponse = await deleteWebhookHandler(args, toolContext);
        return toolResponse;

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        content: [{ 
          type: "text", 
          text: `Invalid arguments: ${error.errors
            .map((e) => `${e.path.join(".")}: ${e.message}`)
            .join(", ")}` 
        }],
        isError: true
      };
    }
    
    return {
      content: [{ type: "text", text: `Error executing tool: ${error}` }],
      isError: true
    };
  }
});

// Auto-login on startup if token is available
const autoLogin = async () => {
    const token = config.DISCORD_TOKEN;
    if (token) {
        try {
            await client.login(token);
        } catch (error) {
            console.error("Auto-login failed:", error);
        }
    } else {
        console.log("No Discord token found in config, skipping auto-login");
    }
};

// Start auto-login process
autoLogin();
  
const transport = new StdioServerTransport();
await server.connect(transport);