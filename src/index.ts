import { Client, GatewayIntentBits } from "discord.js";
import { config as dotenvConfig } from 'dotenv';
import { DiscordMCPServer } from './server.js';
import { StdioTransport, StreamableHttpTransport } from './transport.js';
import { info, error } from './logger.js';

// Load environment variables from .env file if exists
dotenvConfig();

// Export default function as expected by Smithery CLI
export default function({ sessionId, config: smitheryConfig }: { sessionId: string, config: any }) {
    info(`Starting MCP Discord server with session ID: ${sessionId}`);
    
    // Configuration with priority: Smithery config -> environment variables -> command line arguments
    const serverConfig = {
        DISCORD_TOKEN: (() => {
            try {
                // First try Smithery config
                if (smitheryConfig?.discordToken) {
                    return smitheryConfig.discordToken;
                }
                
                // Then try command line arguments
                const configIndex = process.argv.indexOf('--config');
                if (configIndex !== -1 && configIndex + 1 < process.argv.length) {
                    const configArg = process.argv[configIndex + 1];
                    if (typeof configArg === 'string') {
                        try {
                            const parsedConfig = JSON.parse(configArg);
                            return parsedConfig.DISCORD_TOKEN;
                        } catch (err) {
                            return configArg;
                        }
                    }
                }
                // Finally try environment variable
                return process.env.DISCORD_TOKEN;
            } catch (err) {
                error('Error parsing config: ' + String(err));
                return null;
            }
        })(),
        TRANSPORT: (() => {
            const transportIndex = process.argv.indexOf('--transport');
            if (transportIndex !== -1 && transportIndex + 1 < process.argv.length) {
                return process.argv[transportIndex + 1];
            }
            return 'shttp'; // Default to shttp for Smithery
        })(),
        HTTP_PORT: (() => {
            // Check for PORT environment variable first (Smithery requirement)
            if (process.env.PORT) {
                return parseInt(process.env.PORT);
            }
            const portIndex = process.argv.indexOf('--port');
            if (portIndex !== -1 && portIndex + 1 < process.argv.length) {
                return parseInt(process.argv[portIndex + 1]);
            }
            return 8080;
        })()
    };

    // Create Discord client
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent
        ]
    });

    // Save token to client for login handler
    if (serverConfig.DISCORD_TOKEN) {
        client.token = serverConfig.DISCORD_TOKEN;
    }

    // Auto-login on startup if token is available
    const autoLogin = async () => {
        const token = serverConfig.DISCORD_TOKEN;
        if (token) {
            try {
                await client.login(token);
                info('Successfully logged in to Discord');
            } catch (err: any) {
                if (typeof err.message === 'string' && err.message.includes('Privileged intent provided is not enabled or whitelisted')) {
                    error('Login failed: One or more privileged intents are not enabled in the Discord Developer Portal. Please enable the required intents.');
                } else {
                    error('Auto-login failed: ' + String(err));
                }
            }
        } else {
            info("No Discord token found in config, skipping auto-login");
        }
    };

    // Initialize transport based on configuration
    const initializeTransport = () => {
        switch (serverConfig.TRANSPORT.toLowerCase()) {
            case 'http':
            case 'shttp':
                info(`Initializing HTTP transport on 0.0.0.0:${serverConfig.HTTP_PORT}`);
                return new StreamableHttpTransport(serverConfig.HTTP_PORT);
            case 'stdio':
                info('Initializing stdio transport');
                return new StdioTransport();
            default:
                error(`Unknown transport type: ${serverConfig.TRANSPORT}. Falling back to shttp.`);
                return new StreamableHttpTransport(serverConfig.HTTP_PORT);
        }
    };

    // Main async function to handle startup
    const startServer = async () => {
        try {
            // Start auto-login process
            await autoLogin();

            // Create and start MCP server with selected transport
            const transport = initializeTransport();
            const mcpServer = new DiscordMCPServer(client, transport);

            await mcpServer.start();
            info('MCP server started successfully');
            
            // Keep the Node.js process running for HTTP transport
            if (serverConfig.TRANSPORT.toLowerCase() === 'http' || serverConfig.TRANSPORT.toLowerCase() === 'shttp') {
                // Send a heartbeat every 30 seconds to keep the process alive
                setInterval(() => {
                    info('MCP server is running');
                }, 30000);
                
                // Handle termination signals
                const shutdown = async () => {
                    info('Shutting down server...');
                    await mcpServer.stop();
                    process.exit(0);
                };
                
                process.on('SIGINT', shutdown);
                process.on('SIGTERM', shutdown);
                
                info('Server running in keep-alive mode.');
            }
            
            return mcpServer;
        } catch (err) {
            error('Failed to start MCP server: ' + String(err));
            throw err;
        }
    };

    // Start the server
    return startServer();
}