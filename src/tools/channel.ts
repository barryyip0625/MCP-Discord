import { z } from "zod";
import { ChannelType } from "discord.js";
import { ToolContext, ToolResponse } from "./types.js";
import { 
  CreateTextChannelSchema, 
  DeleteChannelSchema, 
  ReadMessagesSchema,
  GetServerInfoSchema
} from "../schemas.js";

  // Text channel creation handler
export async function createTextChannelHandler(
  args: unknown, 
  context: ToolContext
): Promise<ToolResponse> {
  const { guildId, channelName, topic } = CreateTextChannelSchema.parse(args);
  try {
    if (!context.client.isReady()) {
      return {
        content: [{ type: "text", text: "Discord client not logged in. Please use discord_login tool first." }],
        isError: true
      };
    }

    const guild = await context.client.guilds.fetch(guildId);
    if (!guild) {
      return {
        content: [{ type: "text", text: `Cannot find guild with ID: ${guildId}` }],
        isError: true
      };
    }

    // Create the text channel
    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      topic: topic
    });

    return {
      content: [{ 
        type: "text", 
        text: `Successfully created text channel "${channelName}" with ID: ${channel.id}` 
      }]
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Failed to create text channel: ${error}` }],
      isError: true
    };
  }
}

// Channel deletion handler
export async function deleteChannelHandler(
  args: unknown, 
  context: ToolContext
): Promise<ToolResponse> {
  const { channelId, reason } = DeleteChannelSchema.parse(args);
  try {
    if (!context.client.isReady()) {
      return {
        content: [{ type: "text", text: "Discord client not logged in. Please use discord_login tool first." }],
        isError: true
      };
    }

    const channel = await context.client.channels.fetch(channelId);
    if (!channel) {
      return {
        content: [{ type: "text", text: `Cannot find channel with ID: ${channelId}` }],
        isError: true
      };
    }

    // Check if channel can be deleted (has delete method)
    if (!('delete' in channel)) {
      return {
        content: [{ type: "text", text: `This channel type does not support deletion or the bot lacks permissions` }],
        isError: true
      };
    }

    // Delete the channel
    await channel.delete(reason || "Channel deleted via API");

    return {
      content: [{ 
        type: "text", 
        text: `Successfully deleted channel with ID: ${channelId}` 
      }]
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Failed to delete channel: ${error}` }],
      isError: true
    };
  }
}

// Message reading handler
export async function readMessagesHandler(
  args: unknown, 
  context: ToolContext
): Promise<ToolResponse> {
  const { channelId, limit } = ReadMessagesSchema.parse(args);
  try {
    if (!context.client.isReady()) {
      return {
        content: [{ type: "text", text: "Discord client not logged in. Please use discord_login tool first." }],
        isError: true
      };
    }

    const channel = await context.client.channels.fetch(channelId);
    if (!channel) {
      return {
        content: [{ type: "text", text: `Cannot find channel with ID: ${channelId}` }],
        isError: true
      };
    }

    // Check if channel has messages (text channel, thread, etc.)
    if (!channel.isTextBased() || !('messages' in channel)) {
      return {
        content: [{ type: "text", text: `Channel type does not support reading messages` }],
        isError: true
      };
    }

    // Fetch messages
    const messages = await channel.messages.fetch({ limit });
    
    if (messages.size === 0) {
      return {
        content: [{ type: "text", text: `No messages found in channel` }]
      };
    }

    // Format messages 
    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      content: msg.content,
      author: {
        id: msg.author.id,
        username: msg.author.username,
        bot: msg.author.bot
      },
      timestamp: msg.createdAt,
      attachments: msg.attachments.size,
      embeds: msg.embeds.length,
      replyTo: msg.reference ? msg.reference.messageId : null
    })).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return {
      content: [{ 
        type: "text", 
        text: JSON.stringify({
          channelId,
          messageCount: formattedMessages.length,
          messages: formattedMessages
        }, null, 2) 
      }]
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Failed to read messages: ${error}` }],
      isError: true
    };
  }
}

// Server information handler
export async function getServerInfoHandler(
  args: unknown, 
  context: ToolContext
): Promise<ToolResponse> {
  const { guildId } = GetServerInfoSchema.parse(args);
  try {
    if (!context.client.isReady()) {
      return {
        content: [{ type: "text", text: "Discord client not logged in. Please use discord_login tool first." }],
        isError: true
      };
    }

    const guild = await context.client.guilds.fetch(guildId);
    if (!guild) {
      return {
        content: [{ type: "text", text: `Cannot find guild with ID: ${guildId}` }],
        isError: true
      };
    }

    // Fetch additional guild data
    await guild.fetch();
    
    // Fetch channel information
    const channels = await guild.channels.fetch();
    
    // Categorize channels by type
    const channelsByType = {
      text: channels.filter(c => c?.type === ChannelType.GuildText).size,
      voice: channels.filter(c => c?.type === ChannelType.GuildVoice).size,
      category: channels.filter(c => c?.type === ChannelType.GuildCategory).size,
      forum: channels.filter(c => c?.type === ChannelType.GuildForum).size,
      announcement: channels.filter(c => c?.type === ChannelType.GuildAnnouncement).size,
      stage: channels.filter(c => c?.type === ChannelType.GuildStageVoice).size,
      total: channels.size
    };
    
    // Fetch member count
    const approximateMemberCount = guild.approximateMemberCount || "unknown";
    
    // Format guild information
    const guildInfo = {
      id: guild.id,
      name: guild.name,
      description: guild.description,
      icon: guild.iconURL(),
      owner: guild.ownerId,
      createdAt: guild.createdAt,
      memberCount: approximateMemberCount,
      channels: channelsByType,
      features: guild.features,
      premium: {
        tier: guild.premiumTier,
        subscriptions: guild.premiumSubscriptionCount
      }
    };

    return {
      content: [{ type: "text", text: JSON.stringify(guildInfo, null, 2) }]
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Failed to fetch server info: ${error}` }],
      isError: true
    };
  }
} 