import { DiscordLoginSchema } from '../schemas.js';
import { ToolHandler } from './types.js';

export const loginHandler: ToolHandler = async (args, { client }) => {
  DiscordLoginSchema.parse(args);
  
  try {
    // Check if client is already logged in
    if (client.isReady()) {
      return {
        content: [{ type: "text", text: `Already logged in as: ${client.user?.tag}` }]
      };
    }
    
    // loginHandler doesn't directly handle token, it needs to be set before invocation
    if (!client.token) {
      return {
        content: [{ type: "text", text: "Discord token not configured. Cannot log in." }],
        isError: true
      };
    }
    
    await client.login(client.token);
    return {
      content: [{ type: "text", text: `Successfully logged in to Discord: ${client.user?.tag}` }]
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Login failed: ${error}` }],
      isError: true
    };
  }
}; 