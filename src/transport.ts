import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import express, { Request, Response } from "express";
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
  deleteWebhookHandler,
  editCategoryHandler,
  createCategoryHandler,
  deleteCategoryHandler
} from './tools/tools.js';
import { Client, GatewayIntentBits } from "discord.js";
import { info, error } from './logger.js';
import { checkAndReconnectClient, createErrorResponse, createSuccessResponse } from './utils.js';

export interface MCPTransport {
    start(server: Server): Promise<void>;
    stop(): Promise<void>;
}

export class StdioTransport implements MCPTransport {
    private transport: StdioServerTransport | null = null;

    async start(server: Server): Promise<void> {
        this.transport = new StdioServerTransport();
        await server.connect(this.transport);
    }

    async stop(): Promise<void> {
        if (this.transport) {
            await this.transport.close();
            this.transport = null;
        }
    }
}

// Tool handler mapping to eliminate switch statement duplication
const TOOL_HANDLERS = {
    discord_send: sendMessageHandler,
    discord_get_forum_channels: getForumChannelsHandler,
    discord_create_forum_post: createForumPostHandler,
    discord_get_forum_post: getForumPostHandler,
    discord_reply_to_forum: replyToForumHandler,
    discord_delete_forum_post: deleteForumPostHandler,
    discord_create_text_channel: createTextChannelHandler,
    discord_delete_channel: deleteChannelHandler,
    discord_read_messages: readMessagesHandler,
    discord_get_server_info: getServerInfoHandler,
    discord_add_reaction: addReactionHandler,
    discord_add_multiple_reactions: addMultipleReactionsHandler,
    discord_remove_reaction: removeReactionHandler,
    discord_delete_message: deleteMessageHandler,
    discord_create_webhook: createWebhookHandler,
    discord_send_webhook_message: sendWebhookMessageHandler,
    discord_edit_webhook: editWebhookHandler,
    discord_delete_webhook: deleteWebhookHandler,
    discord_create_category: createCategoryHandler,
    discord_edit_category: editCategoryHandler,
    discord_delete_category: deleteCategoryHandler
} as const;

type ToolName = keyof typeof TOOL_HANDLERS;

export class StreamableHttpTransport implements MCPTransport {
    private app: express.Application;
    private server: Server | null = null;
    private httpServer: any = null;
    private transport: StreamableHTTPServerTransport | null = null;
    private toolContext: ReturnType<typeof createToolContext> | null = null;
    private sessionId: string = '';

    constructor(private port: number = 8080) {
        this.app = express();
        this.app.use(express.json());
        this.setupEndpoints();
        this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        info(`Created HTTP transport with session ID: ${this.sessionId}`);
    }

    private setupEndpoints() {
        // Handler for POST requests
        this.app.post('/mcp', (req: Request, res: Response) => {
            info('Received MCP request: ' + JSON.stringify(req.body));
            this.handleMcpRequest(req, res).catch(error => {
                error('Unhandled error in MCP request: ' + String(error));
            });
        });

        // Handler for GET requests (for health checks and server info)
        this.app.get('/mcp', (req: Request, res: Response) => {
            info('Received GET request to /mcp');
            // Parse query parameters as configuration
            const queryParams = req.query;
            
            // For GET requests, return server information
            res.json(createSuccessResponse({
                protocolVersion: "2025-03-26",
                serverInfo: {
                    name: "MCP-Discord",
                    version: "1.2.0"
                },
                status: "ready",
                config: queryParams
            }));
        });

        // Handler for DELETE requests (for cleanup if needed)
        this.app.delete('/mcp', (req: Request, res: Response) => {
            info('Received DELETE request to /mcp');
            res.json(createSuccessResponse({ message: "Server reset acknowledged" }));
        });

        // Handler for other methods
        this.app.all('/mcp', (req: Request, res: Response) => {
            if (!['POST', 'GET', 'DELETE'].includes(req.method)) {
                res.status(405).json(createErrorResponse(`Method ${req.method} not allowed. Use POST, GET, or DELETE.`, -32000, null));
            }
        });
    }

    private async checkClientReadiness(toolName: string, requestId: string | null): Promise<boolean> {
        if (!this.toolContext) {
            return false;
        }

        if (toolName.startsWith('discord_')) {
            const clientCheck = await checkAndReconnectClient(this.toolContext.client, requestId);
            return clientCheck.isReady;
        }
        
        return true;
    }

    private async executeDiscordTool(toolName: ToolName, args: any): Promise<any> {
        if (!this.toolContext) {
            throw new Error('Tool context not initialized');
        }

        const handler = TOOL_HANDLERS[toolName];
        if (!handler) {
            throw new Error(`Unknown tool: ${toolName}`);
        }

        return await handler(args, this.toolContext);
    }

    private async handleMcpRequest(req: Request, res: Response) {
        try {
            if (!this.server) {
                return res.json(createErrorResponse('Server not initialized', -32603, req.body?.id || null));
            }
            
            info(`Request body (session ${this.sessionId}): ${JSON.stringify(req.body)}`);
            
            const method = req.body.method;
            if (!method) {
                return res.status(400).json(createErrorResponse('Invalid Request: No method specified', -32600, req.body?.id || null));
            }
            
            const params = req.body.params || {};
            const requestId = req.body?.id || null;
            
            // Make sure toolContext is available for tool methods
            if (!this.toolContext && method !== 'list_tools' && method !== 'initialize') {
                return res.status(400).json(createErrorResponse('Tool context not initialized. Service may need to be restarted.', -32603, requestId));
            }
            
            let result;
            
            try {
                switch (method) {
                    case 'initialize':
                        result = {
                            protocolVersion: "2025-03-26",
                            capabilities: {
                                tools: { listChanged: false },
                                logging: {}
                            },
                            serverInfo: {
                                name: "MCP-Discord",
                                version: "1.2.0"
                            }
                        };
                        break;
                    
                    case 'notifications/initialized':
                        info("Client initialized. Starting normal operations.");
                        return res.json(createSuccessResponse(null, requestId));
                        
                    case 'tools/list':
                    case 'list_tools':
                        result = { tools: toolList };
                        break;
                        
                    case 'tools/call':
                        const toolName = params.name as ToolName;
                        const toolArgs = params.arguments || {};
                        
                        if (!(await this.checkClientReadiness(toolName, requestId))) {
                            const clientCheck = await checkAndReconnectClient(this.toolContext!.client, requestId);
                            if (!clientCheck.isReady && clientCheck.errorResponse) {
                                return res.json(clientCheck.errorResponse);
                            }
                        }
                        
                        if (toolName in TOOL_HANDLERS) {
                            result = await this.executeDiscordTool(toolName, toolArgs);
                        } else {
                            return res.status(400).json(createErrorResponse(`Unknown tool: ${toolName}`, -32601, requestId));
                        }
                        break;
                        
                    // Handle legacy method calls for backward compatibility
                    default:
                        if (method.startsWith('discord_') && method in TOOL_HANDLERS) {
                            const toolName = method as ToolName;
                            
                            if (!(await this.checkClientReadiness(toolName, requestId))) {
                                const clientCheck = await checkAndReconnectClient(this.toolContext!.client, requestId);
                                if (!clientCheck.isReady && clientCheck.errorResponse) {
                                    return res.json(clientCheck.errorResponse);
                                }
                            }
                            
                            result = await this.executeDiscordTool(toolName, params);
                        } else if (method === 'ping') {
                            info(`Returning empty response for ping request`);
                            result = {};
                        } else {
                            return res.status(400).json(createErrorResponse(`Method not found: ${method}`, -32601, requestId));
                        }
                }
                
                info(`Request for ${method} handled successfully`);
                
                // Handle tool response format
                if (result && typeof result === 'object' && 'content' in result) {
                    if ('isError' in result && result.isError) {
                        error(`Tool error response: ${JSON.stringify(result)}`);
                        return res.json({
                            jsonrpc: '2.0',
                            id: requestId,
                            error: {
                                code: -32603,
                                message: Array.isArray(result.content) 
                                    ? result.content.map((item: any) => item.text).join(' ') 
                                    : 'Tool execution error'
                            }
                        });
                    }
                }
                
                const finalResponse = createSuccessResponse(result, requestId);
                info(`Sending response (session ${this.sessionId}): ${JSON.stringify(finalResponse)}`);
                return res.json(finalResponse);
                
            } catch (err) {
                error('Error processing tool request: ' + String(err));
                
                // Handle validation errors
                if (err && typeof err === 'object' && 'name' in err && err.name === 'ZodError') {
                    return res.json(createErrorResponse(
                        `Invalid parameters: ${err && typeof err === 'object' && 'message' in err ? String((err as any).message) : 'Unknown validation error'}`, 
                        -32602, 
                        requestId
                    ));
                }
                
                return res.json(createErrorResponse(
                    err instanceof Error ? err.message : 'Unknown error', 
                    -32603, 
                    requestId
                ));
            }
            
        } catch (err) {
            error('Error handling MCP request: ' + String(err));
            if (!res.headersSent) {
                res.json(createErrorResponse(
                    err instanceof Error ? err.message : 'Internal server error', 
                    -32603, 
                    req.body?.id || null
                ));
            }
        }
    }

    async start(server: Server): Promise<void> {
        this.server = server;
        info('Starting HTTP transport with server: ' + String(!!this.server));
        
        // Try to get client from the DiscordMCPServer instance
        if (server) {
            const anyServer = server as any;
            let client: Client | undefined;
            
            if (anyServer._context?.client) {
                client = anyServer._context.client;
                info('Found client in server._context');
            } else if (anyServer.client instanceof Client) {
                client = anyServer.client;
                info('Found client directly on server object');
            } else if (anyServer._parent?.client instanceof Client) {
                client = anyServer._parent.client;
                info('Found client in server._parent');
            }
            
            if (client) {
                this.toolContext = createToolContext(client);
                info('Tool context initialized with Discord client');
            } else {
                info('Creating new Discord client for transport');
                const newClient = new Client({
                    intents: [
                        GatewayIntentBits.Guilds,
                        GatewayIntentBits.GuildMessages,
                        GatewayIntentBits.MessageContent,
                        GatewayIntentBits.GuildMessageReactions
                    ]
                });
                this.toolContext = createToolContext(newClient);
                info('Tool context initialized with new Discord client');
            }
        }
        
        // Create a stateless transport
        this.transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined
        });
        
        await this.server.connect(this.transport);
        info('Transport connected');

        return new Promise((resolve) => {
            this.httpServer = this.app.listen(this.port, '0.0.0.0', () => {
                info(`MCP Server listening on 0.0.0.0:${this.port}`);
                resolve();
            });
        });
    }

    async stop(): Promise<void> {
        try {
            if (this.transport) {
                await this.transport.close();
                this.transport = null;
            }
            
            if (this.httpServer) {
                await new Promise<void>((resolve) => {
                    this.httpServer.close(() => {
                        info('HTTP server closed');
                        resolve();
                    });
                });
                this.httpServer = null;
            }
        } catch (err) {
            error(`Error stopping HTTP transport: ${err instanceof Error ? err.message : String(err)}`);
            throw err;
        }
    }
} 