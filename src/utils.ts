import { Client } from "discord.js";
import { error, info } from './logger.js';

export interface ClientCheckResult {
  isReady: boolean;
  errorResponse?: any;
}

/**
 * Checks if Discord client is ready and attempts reconnection if needed
 * Returns ready status and error response if not ready
 */
export async function checkAndReconnectClient(
  client: Client, 
  requestId: string | null = null
): Promise<ClientCheckResult> {
  // Check if client is logged in
  if (!client.isReady()) {
    error(`Client not ready, client state: ${JSON.stringify({
      isReady: client.isReady(),
      hasToken: !!client.token,
      user: client.user ? {
        id: client.user.id,
        tag: client.user.tag,
      } : null
    })}`);
    
    // Check if we have a token but not ready - try to force reconnect
    if (client.token) {
      info("Has token but not ready - attempting to force reconnect");
      try {
        // Attempt to force login with existing token
        await client.login(client.token);
        info(`Force reconnect successful: ${client.isReady()}`);
        
        // If still not ready after reconnect, return error
        if (!client.isReady()) {
          return {
            isReady: false,
            errorResponse: {
              jsonrpc: '2.0',
              error: {
                code: -32603,
                message: 'Discord client reconnect failed.',
              },
              id: requestId,
            }
          };
        }
        
        // Successfully reconnected
        info("Reconnected successfully");
        return { isReady: true };
        
      } catch (reconnectError) {
        error(`Reconnect failed: ${reconnectError instanceof Error ? reconnectError.message : String(reconnectError)}`);
        return {
          isReady: false,
          errorResponse: {
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: 'Discord client reconnect failed.',
            },
            id: requestId,
          }
        };
      }
    } else {
      return {
        isReady: false,
        errorResponse: {
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Discord client not logged in.',
          },
          id: requestId,
        }
      };
    }
  }
  
  return { isReady: true };
}

/**
 * Creates a standardized JSON-RPC error response
 */
export function createErrorResponse(message: string, code: number = -32603, id: string | null = null) {
  return {
    jsonrpc: '2.0',
    error: {
      code,
      message,
    },
    id,
  };
}

/**
 * Creates a standardized JSON-RPC success response
 */
export function createSuccessResponse(result: any, id: string | null = null) {
  return {
    jsonrpc: '2.0',
    result,
    id,
  };
} 