/**
 * Enhanced MCP Server with authentication support and dual transport modes
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { DirectLineClient } from '../services/directline-client.js';
import type { TokenManager } from '../services/token-manager.js';
import type { ConversationManager } from '../services/conversation-manager.js';
import type { UserContext } from '../types/session.js';
import type { EntraIDClient } from '../services/entraid-client.js';
import type { SessionManager } from '../services/session-manager.js';
import {
  validateToolArgs,
  SendMessageArgsSchema,
  StartConversationArgsSchema,
  EndConversationArgsSchema,
  GetConversationHistoryArgsSchema,
} from './tool-schemas.js';
import { createSuccessResponse, transformErrorToMCPResponse } from './mcp-response.js';

/**
 * Transport mode
 */
export type TransportMode = 'stdio' | 'http';

/**
 * Enhanced MCP Server configuration
 */
export interface MCPServerConfig {
  transportMode: TransportMode;
  requireAuth?: boolean; // Only for HTTP mode
  entraidClient?: EntraIDClient; // OAuth client for HTTP mode
  sessionManager?: SessionManager; // Session manager for HTTP mode
}

/**
 * User-conversation mapping for isolation
 */
interface UserConversationMapping {
  userId: string;
  conversationIds: Set<string>;
}

/**
 * Audit log entry
 */
interface AuditLogEntry {
  timestamp: number;
  userId?: string;
  action: string;
  conversationId?: string;
  details?: Record<string, unknown>;
}

/**
 * Enhanced MCP Server for Copilot Studio with authentication support
 */
export class EnhancedMCPServer {
  private server: Server;
  private client: DirectLineClient;
  private tokenManager: TokenManager;
  private conversationManager: ConversationManager;
  private config: MCPServerConfig;
  private isRunning: boolean = false;
  private userConversations: Map<string, UserConversationMapping> = new Map();
  private auditLogs: AuditLogEntry[] = [];

  /**
   * Create a new enhanced MCP server instance
   * @param client - Direct Line client
   * @param tokenManager - Token manager
   * @param conversationManager - Conversation manager
   * @param config - Server configuration
   */
  constructor(
    client: DirectLineClient,
    tokenManager: TokenManager,
    conversationManager: ConversationManager,
    config: MCPServerConfig = { transportMode: 'stdio' }
  ) {
    this.client = client;
    this.tokenManager = tokenManager;
    this.conversationManager = conversationManager;
    this.config = config;

    // Initialize MCP server
    this.server = new Server(
      {
        name: 'copilot-studio-agent-direct-line-mcp',
        version: '2.0.0',
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
      const userContext = (request as any).userContext as UserContext | undefined;

      console.log(
        `[MCP] Tool called: ${name} by user: ${userContext?.userId || 'anonymous'}`,
        args
      );

      try {
        switch (name) {
          case 'send_message':
            return await this.handleSendMessage(args || {}, userContext);
          case 'start_conversation':
            return await this.handleStartConversation(args || {}, userContext);
          case 'end_conversation':
            return await this.handleEndConversation(args || {}, userContext);
          case 'get_conversation_history':
            return await this.handleGetConversationHistory(args || {}, userContext);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        console.error(`[MCP] Tool error: ${name}`, error);
        this.logAudit({
          timestamp: Date.now(),
          userId: userContext?.userId,
          action: `${name}_error`,
          details: { error: error instanceof Error ? error.message : String(error) },
        });
        return transformErrorToMCPResponse(error);
      }
    });

    console.log(`[MCP] Server handlers configured for ${this.config.transportMode} transport`);
  }

  /**
   * Handle send_message tool with user context
   */
  private async handleSendMessage(args: Record<string, unknown>, userContext?: UserContext) {
    const { message, conversationId } = validateToolArgs(SendMessageArgsSchema, args);

    // Validate permissions if user context exists
    if (userContext && conversationId) {
      this.validateUserConversationAccess(userContext.userId, conversationId);
    }

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
        // Create new conversation with user-specific client ID
        const clientId = userContext
          ? `user-${userContext.userId}-${Date.now()}`
          : `mcp-client-${Date.now()}`;
        convState = await this.conversationManager.createConversation(clientId);
        convId = convState.conversationId;

        // Associate conversation with user
        if (userContext) {
          this.associateConversationWithUser(userContext.userId, convId);
        }
      }

      // Send message to Direct Line with user metadata
      const activityId = await this.client.sendActivity(
        {
          conversationId: convId,
          activity: {
            type: 'message',
            from: {
              id: convState.clientId,
              name: userContext?.name || 'MCP User',
            },
            text: message,
            timestamp: new Date().toISOString(),
            // Add user metadata to activity
            channelData: userContext
              ? {
                  userId: userContext.userId,
                  userEmail: userContext.email,
                  tenantId: userContext.tenantId,
                }
              : undefined,
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
            conversationId: convId,
            watermark: convState.watermark,
          },
          convState.token
        );

        if (activitySet.watermark) {
          this.conversationManager.updateWatermark(convId, activitySet.watermark);
        }

        const botActivities = activitySet.activities.filter(
          (a) => a.type === 'message' && a.from?.id !== convState.clientId
        );

        if (botActivities.length > 0) {
          botActivities.forEach((activity) => {
            this.conversationManager.addToHistory(convId!, activity);
          });

          const latestBot = botActivities[botActivities.length - 1];
          botResponse = latestBot.text || '[No text response]';
          break;
        }
      }

      if (!botResponse) {
        botResponse = '[No response received within timeout period]';
      }

      // Audit log
      this.logAudit({
        timestamp: Date.now(),
        userId: userContext?.userId,
        action: 'send_message',
        conversationId: convId,
        details: { activityId },
      });

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
   * Handle start_conversation tool with user context
   */
  private async handleStartConversation(
    args: Record<string, unknown>,
    userContext?: UserContext
  ) {
    const { initialMessage } = validateToolArgs(StartConversationArgsSchema, args);

    try {
      // Create new conversation with user-specific client ID
      const clientId = userContext
        ? `user-${userContext.userId}-${Date.now()}`
        : `mcp-client-${Date.now()}`;
      const convState = await this.conversationManager.createConversation(clientId);

      // Associate conversation with user
      if (userContext) {
        this.associateConversationWithUser(userContext.userId, convState.conversationId);
      }

      let result: {
        conversationId: string;
        status: string;
        response?: string;
        activityId?: string;
      } = {
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
              from: { id: clientId, name: userContext?.name || 'MCP User' },
              text: initialMessage,
              timestamp: new Date().toISOString(),
              channelData: userContext
                ? {
                    userId: userContext.userId,
                    userEmail: userContext.email,
                    tenantId: userContext.tenantId,
                  }
                : undefined,
            },
          },
          convState.token
        );

        // Poll for response (same logic as send_message)
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

      // Audit log
      this.logAudit({
        timestamp: Date.now(),
        userId: userContext?.userId,
        action: 'start_conversation',
        conversationId: convState.conversationId,
      });

      return createSuccessResponse(result);
    } catch (error) {
      throw new Error(
        `Failed to start conversation: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Handle end_conversation tool with user context
   */
  private async handleEndConversation(args: Record<string, unknown>, userContext?: UserContext) {
    const { conversationId } = validateToolArgs(EndConversationArgsSchema, args);

    // Validate permissions if user context exists
    if (userContext) {
      this.validateUserConversationAccess(userContext.userId, conversationId);
    }

    try {
      const convState = this.conversationManager.getConversation(conversationId);
      if (!convState) {
        throw new Error(`Conversation ${conversationId} not found or already ended`);
      }

      // End the conversation
      this.conversationManager.endConversation(conversationId);

      // Remove from user mapping
      if (userContext) {
        this.removeUserConversation(userContext.userId, conversationId);
      }

      // Audit log
      this.logAudit({
        timestamp: Date.now(),
        userId: userContext?.userId,
        action: 'end_conversation',
        conversationId,
        details: { messageCount: convState.messageHistory.length },
      });

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
   * Handle get_conversation_history tool with user context
   */
  private async handleGetConversationHistory(
    args: Record<string, unknown>,
    userContext?: UserContext
  ) {
    const { conversationId, limit } = validateToolArgs(GetConversationHistoryArgsSchema, args);

    // Validate permissions if user context exists
    if (userContext) {
      this.validateUserConversationAccess(userContext.userId, conversationId);
    }

    try {
      const convState = this.conversationManager.getConversation(conversationId);
      if (!convState) {
        throw new Error(`Conversation ${conversationId} not found or expired`);
      }

      let history = convState.messageHistory;

      if (limit && limit > 0) {
        history = history.slice(-limit);
      }

      const formattedHistory = history.map((activity) => ({
        id: activity.id,
        type: activity.type,
        timestamp: activity.timestamp,
        from: activity.from,
        text: activity.text,
        attachments: activity.attachments,
      }));

      // Audit log
      this.logAudit({
        timestamp: Date.now(),
        userId: userContext?.userId,
        action: 'get_conversation_history',
        conversationId,
        details: { messageCount: formattedHistory.length },
      });

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
   * Associate conversation with user for isolation
   */
  private associateConversationWithUser(userId: string, conversationId: string): void {
    let userMapping = this.userConversations.get(userId);

    if (!userMapping) {
      userMapping = {
        userId,
        conversationIds: new Set(),
      };
      this.userConversations.set(userId, userMapping);
    }

    userMapping.conversationIds.add(conversationId);
  }

  /**
   * Remove conversation from user mapping
   */
  private removeUserConversation(userId: string, conversationId: string): void {
    const userMapping = this.userConversations.get(userId);

    if (userMapping) {
      userMapping.conversationIds.delete(conversationId);

      if (userMapping.conversationIds.size === 0) {
        this.userConversations.delete(userId);
      }
    }
  }

  /**
   * Validate user has access to conversation
   */
  private validateUserConversationAccess(userId: string, conversationId: string): void {
    const userMapping = this.userConversations.get(userId);

    if (!userMapping || !userMapping.conversationIds.has(conversationId)) {
      throw new Error(`Access denied: User ${userId} does not have access to conversation ${conversationId}`);
    }
  }

  /**
   * Get user's conversations
   */
  getUserConversations(userId: string): string[] {
    const userMapping = this.userConversations.get(userId);
    return userMapping ? Array.from(userMapping.conversationIds) : [];
  }

  /**
   * Log audit entry
   */
  private logAudit(entry: AuditLogEntry): void {
    this.auditLogs.push(entry);

    // Keep only last 10000 logs in memory
    if (this.auditLogs.length > 10000) {
      this.auditLogs = this.auditLogs.slice(-10000);
    }

    console.log(
      `[Audit] ${entry.action} - User: ${entry.userId || 'anonymous'} - Conv: ${entry.conversationId || 'N/A'}`
    );
  }

  /**
   * Get audit logs
   */
  getAuditLogs(filter?: { userId?: string; action?: string; since?: number }): AuditLogEntry[] {
    let logs = this.auditLogs;

    if (filter) {
      if (filter.userId) {
        logs = logs.filter((log) => log.userId === filter.userId);
      }
      if (filter.action) {
        logs = logs.filter((log) => log.action === filter.action);
      }
      if (filter.since !== undefined) {
        logs = logs.filter((log) => log.timestamp >= filter.since!);
      }
    }

    return logs;
  }

  /**
   * Handle SSE connection (GET /mcp)
   */
  async handleSSEConnection(req: IncomingMessage, res: ServerResponse): Promise<void> {
    console.log('[MCP] Creating SSE transport for new connection');

    // Create SSE transport
    const transport = new SSEServerTransport('/mcp', res);

    // Connect server to transport
    await this.server.connect(transport);

    // Start the SSE stream
    await transport.start();

    console.log(`[MCP] SSE connection established, session: ${transport.sessionId}`);
  }

  /**
   * Handle SSE message (POST /mcp)
   */
  async handleSSEMessage(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // Parse request body
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks).toString('utf-8');
    const parsedBody = JSON.parse(body);

    console.log('[MCP] Received SSE message:', parsedBody.method || 'unknown method');

    // Create temporary transport just to handle this message
    const transport = new SSEServerTransport('/mcp', res);
    await transport.handlePostMessage(req, res, parsedBody);
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    this.isRunning = true;

    console.log(`[MCP] Enhanced server started on ${this.config.transportMode} transport`);
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    await this.server.close();
    this.isRunning = false;

    console.log('[MCP] Enhanced server stopped');
  }

  /**
   * Check if server is running
   */
  isServerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get server statistics
   */
  getStatistics(): {
    totalUsers: number;
    totalConversations: number;
    auditLogCount: number;
    transportMode: TransportMode;
  } {
    return {
      totalUsers: this.userConversations.size,
      totalConversations: Array.from(this.userConversations.values()).reduce(
        (sum, mapping) => sum + mapping.conversationIds.size,
        0
      ),
      auditLogCount: this.auditLogs.length,
      transportMode: this.config.transportMode,
    };
  }
}
