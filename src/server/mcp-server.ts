/**
 * MCP Server implementation for Copilot Studio Direct Line integration
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { DirectLineClient } from '../services/directline-client.js';
import type { TokenManager } from '../services/token-manager.js';
import type { ConversationManager } from '../services/conversation-manager.js';
import {
  validateToolArgs,
  SendMessageArgsSchema,
  StartConversationArgsSchema,
  EndConversationArgsSchema,
  GetConversationHistoryArgsSchema,
} from './tool-schemas.js';
import { createSuccessResponse, transformErrorToMCPResponse } from './mcp-response.js';

/**
 * MCP Server for Copilot Studio Agent integration
 */
export class CopilotStudioMCPServer {
  private server: Server;
  private client: DirectLineClient;
  private tokenManager: TokenManager;
  private conversationManager: ConversationManager;
  private isRunning: boolean = false;

  /**
   * Create a new MCP server instance
   * @param client - Direct Line client
   * @param tokenManager - Token manager
   * @param conversationManager - Conversation manager
   */
  constructor(
    client: DirectLineClient,
    tokenManager: TokenManager,
    conversationManager: ConversationManager
  ) {
    this.client = client;
    this.tokenManager = tokenManager;
    this.conversationManager = conversationManager;

    // Initialize MCP server
    this.server = new Server(
      {
        name: 'copilot-studio-direct-line',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  /**
   * Set up MCP protocol handlers
   */
  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'send_message',
            description: 'Send a message to the Copilot Studio Agent',
            inputSchema: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  description: 'The message text to send',
                },
                conversationId: {
                  type: 'string',
                  description: 'Optional conversation ID to continue existing conversation',
                },
              },
              required: ['message'],
            },
          },
          {
            name: 'start_conversation',
            description: 'Start a new conversation with the Copilot Studio Agent',
            inputSchema: {
              type: 'object',
              properties: {
                initialMessage: {
                  type: 'string',
                  description: 'Optional first message to send',
                },
              },
            },
          },
          {
            name: 'end_conversation',
            description: 'End an existing conversation and clean up resources',
            inputSchema: {
              type: 'object',
              properties: {
                conversationId: {
                  type: 'string',
                  description: 'Conversation ID to terminate',
                },
              },
              required: ['conversationId'],
            },
          },
          {
            name: 'get_conversation_history',
            description: 'Retrieve message history for a conversation',
            inputSchema: {
              type: 'object',
              properties: {
                conversationId: {
                  type: 'string',
                  description: 'Conversation ID',
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of messages to return',
                },
              },
              required: ['conversationId'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      console.log(`[MCP] Tool called: ${name}`, args);

      try {
        switch (name) {
          case 'send_message':
            return await this.handleSendMessage(args || {});
          case 'start_conversation':
            return await this.handleStartConversation(args || {});
          case 'end_conversation':
            return await this.handleEndConversation(args || {});
          case 'get_conversation_history':
            return await this.handleGetConversationHistory(args || {});
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        console.error(`[MCP] Tool error: ${name}`, error);
        return transformErrorToMCPResponse(error);
      }
    });

    console.log('[MCP] Server handlers configured');
  }

  /**
   * Handle send_message tool
   */
  private async handleSendMessage(args: Record<string, unknown>) {
    // Validate input arguments
    const { message, conversationId } = validateToolArgs(SendMessageArgsSchema, args);

    try {
      let convId = conversationId;
      let convState;

      // Get or create conversation
      if (convId) {
        convState = this.conversationManager.getConversation(convId);
        if (!convState) {
          throw new Error(`Conversation ${convId} not found or expired`);
        }
      } else {
        // Create new conversation with unique client ID
        const clientId = `mcp-client-${Date.now()}`;
        convState = await this.conversationManager.createConversation(clientId);
        convId = convState.conversationId;
      }

      // Send message to Direct Line
      const activityId = await this.client.sendActivity(
        {
          conversationId: convId,
          activity: {
            type: 'message',
            from: { id: convState.clientId, name: 'MCP User' },
            text: message,
            timestamp: new Date().toISOString(),
          },
        },
        convState.token
      );

      // Poll for response (with timeout)
      const startTime = Date.now();
      const timeout = 30000; // 30 seconds
      let botResponse = '';

      while (Date.now() - startTime < timeout) {
        // Wait a bit before polling
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Get activities
        const activitySet = await this.client.getActivities(
          {
            conversationId: convId,
            watermark: convState.watermark,
          },
          convState.token
        );

        // Update watermark
        if (activitySet.watermark) {
          this.conversationManager.updateWatermark(convId, activitySet.watermark);
        }

        // Look for bot responses
        const botActivities = activitySet.activities.filter(
          (a) => a.type === 'message' && a.from?.id !== convState.clientId
        );

        if (botActivities.length > 0) {
          // Add to history
          botActivities.forEach((activity) => {
            this.conversationManager.addToHistory(convId!, activity);
          });

          // Get the latest bot message
          const latestBot = botActivities[botActivities.length - 1];
          botResponse = latestBot.text || '[No text response]';
          break;
        }
      }

      if (!botResponse) {
        botResponse = '[No response received within timeout period]';
      }

      return createSuccessResponse({
        conversationId: convId,
        response: botResponse,
        activityId,
      });
    } catch (error) {
      throw new Error(
        `Failed to send message: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Handle start_conversation tool
   */
  private async handleStartConversation(args: Record<string, unknown>) {
    // Validate input arguments
    const { initialMessage } = validateToolArgs(StartConversationArgsSchema, args);

    try {
      // Create new conversation with unique client ID
      const clientId = `mcp-client-${Date.now()}`;
      const convState = await this.conversationManager.createConversation(clientId);

      let result: { conversationId: string; status: string; response?: string; activityId?: string } = {
        conversationId: convState.conversationId,
        status: 'started',
      };

      // If initial message provided, send it
      if (initialMessage && typeof initialMessage === 'string') {
        const activityId = await this.client.sendActivity(
          {
            conversationId: convState.conversationId,
            activity: {
              type: 'message',
              from: { id: clientId, name: 'MCP User' },
              text: initialMessage,
              timestamp: new Date().toISOString(),
            },
          },
          convState.token
        );

        // Poll for response
        const startTime = Date.now();
        const timeout = 30000;
        let botResponse = '';

        while (Date.now() - startTime < timeout) {
          await new Promise((resolve) => setTimeout(resolve, 1000));

          const activitySet = await this.client.getActivities(
            {
              conversationId: convState.conversationId,
              watermark: convState.watermark,
            },
            convState.token
          );

          if (activitySet.watermark) {
            this.conversationManager.updateWatermark(convState.conversationId, activitySet.watermark);
          }

          const botActivities = activitySet.activities.filter(
            (a) => a.type === 'message' && a.from?.id !== clientId
          );

          if (botActivities.length > 0) {
            botActivities.forEach((activity) => {
              this.conversationManager.addToHistory(convState.conversationId, activity);
            });

            const latestBot = botActivities[botActivities.length - 1];
            botResponse = latestBot.text || '[No text response]';
            break;
          }
        }

        result.response = botResponse || '[No response received within timeout period]';
        result.activityId = activityId;
      }

      return createSuccessResponse(result);
    } catch (error) {
      throw new Error(
        `Failed to start conversation: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Handle end_conversation tool
   */
  private async handleEndConversation(args: Record<string, unknown>) {
    // Validate input arguments
    const { conversationId } = validateToolArgs(EndConversationArgsSchema, args);

    try {
      // Check if conversation exists
      const convState = this.conversationManager.getConversation(conversationId);
      if (!convState) {
        throw new Error(`Conversation ${conversationId} not found or already ended`);
      }

      // End the conversation
      this.conversationManager.endConversation(conversationId);

      return createSuccessResponse({
        conversationId,
        status: 'ended',
        messageCount: convState.messageHistory.length,
      });
    } catch (error) {
      throw new Error(
        `Failed to end conversation: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Handle get_conversation_history tool
   */
  private async handleGetConversationHistory(args: Record<string, unknown>) {
    // Validate input arguments
    const { conversationId, limit } = validateToolArgs(GetConversationHistoryArgsSchema, args);

    try {
      // Get conversation state
      const convState = this.conversationManager.getConversation(conversationId);
      if (!convState) {
        throw new Error(`Conversation ${conversationId} not found or expired`);
      }

      // Get message history
      let history = convState.messageHistory;

      // Apply limit if specified
      if (limit && limit > 0) {
        history = history.slice(-limit);
      }

      // Format activities for response
      const formattedHistory = history.map((activity) => ({
        id: activity.id,
        type: activity.type,
        timestamp: activity.timestamp,
        from: activity.from,
        text: activity.text,
        attachments: activity.attachments,
      }));

      return createSuccessResponse({
        conversationId,
        messageCount: formattedHistory.length,
        totalMessages: convState.messageHistory.length,
        messages: formattedHistory,
      });
    } catch (error) {
      throw new Error(
        `Failed to get conversation history: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    this.isRunning = true;

    console.log('[MCP] Server started on stdio transport');
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    await this.server.close();
    this.isRunning = false;

    console.log('[MCP] Server stopped');
  }

  /**
   * Check if server is running
   */
  isServerRunning(): boolean {
    return this.isRunning;
  }
}
