import { SendMessageSchema } from '../schemas.js';
import { ToolHandler } from './types.js';

export const sendMessageHandler: ToolHandler = async (args, { client }) => {
  const { channelId, message } = SendMessageSchema.parse(args);
  
  try {
    if (!client.isReady()) {
      return {
        content: [{ type: "text", text: "Discord client not logged in. Please use discord_login tool first." }],
        isError: true
      };
    }

    const channel = await client.channels.fetch(channelId);
    if (!channel || !channel.isTextBased()) {
      return {
        content: [{ type: "text", text: `Cannot find text channel ID: ${channelId}` }],
        isError: true
      };
    }

    // Ensure channel is text-based and can send messages
    if ('send' in channel) {
      await channel.send(message);
      return {
        content: [{ type: "text", text: `Message successfully sent to channel ID: ${channelId}` }]
      };
    } else {
      return {
        content: [{ type: "text", text: `This channel type does not support sending messages` }],
        isError: true
      };
    }
  } catch (error) {
    return {
      content: [{ type: "text", text: `Send message failed: ${error}` }],
      isError: true
    };
  }
}; 