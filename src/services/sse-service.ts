/**
 * Server-Sent Events (SSE) service for real-time MCP communication
 */

import type { Response } from 'express';
import type {
  SSEEvent,
  SSEEventType,
  SSEConnection,
  SSEConfig,
  AuthStatusEventData,
  ConversationUpdateEventData,
  ToolResponseEventData,
  HeartbeatEventData,
  ErrorEventData,
  ConnectedEventData,
} from '../types/sse-events.js';
import { randomBytes } from 'crypto';

/**
 * SSE Manager - Handles Server-Sent Events connections and broadcasting
 */
export class SSEService {
  private connections: Map<string, SSEConnection & { response: Response }> = new Map();
  private userConnections: Map<string, Set<string>> = new Map();
  private heartbeatTimer?: NodeJS.Timeout;
  private cleanupTimer?: NodeJS.Timeout;
  private config: SSEConfig;
  private eventCounter: number = 0;

  /**
   * Create a new SSE service
   * @param config - SSE configuration
   */
  constructor(config?: Partial<SSEConfig>) {
    this.config = {
      heartbeatInterval: config?.heartbeatInterval || 30000, // 30 seconds
      connectionTimeout: config?.connectionTimeout || 120000, // 2 minutes
      maxConnections: config?.maxConnections || 1000,
      maxConnectionsPerUser: config?.maxConnectionsPerUser || 5,
    };

    this.startHeartbeat();
    this.startCleanup();
  }

  /**
   * Create a new SSE connection
   * @param res - Express response object
   * @param userId - Optional user ID for authenticated connections
   * @param ipAddress - Client IP address
   * @param userAgent - Client user agent
   * @returns Connection ID
   */
  createConnection(
    res: Response,
    ipAddress: string,
    userAgent: string,
    userId?: string
  ): string | null {
    // Check connection limits
    if (this.connections.size >= this.config.maxConnections) {
      console.warn('[SSEService] Max connections reached, rejecting new connection');
      return null;
    }

    if (userId) {
      const userConns = this.userConnections.get(userId);
      if (userConns && userConns.size >= this.config.maxConnectionsPerUser) {
        console.warn(
          `[SSEService] Max connections per user reached for user ${userId}, rejecting new connection`
        );
        return null;
      }
    }

    // Generate connection ID
    const connectionId = this.generateConnectionId();

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering in nginx

    // Create connection metadata
    const connection: SSEConnection & { response: Response } = {
      id: connectionId,
      userId,
      ipAddress,
      userAgent,
      connectedAt: Date.now(),
      lastHeartbeat: Date.now(),
      authenticated: !!userId,
      response: res,
    };

    // Store connection
    this.connections.set(connectionId, connection);

    if (userId) {
      if (!this.userConnections.has(userId)) {
        this.userConnections.set(userId, new Set());
      }
      this.userConnections.get(userId)!.add(connectionId);
    }

    // Handle client disconnect
    res.on('close', () => {
      this.removeConnection(connectionId);
    });

    console.log(
      `[SSEService] New SSE connection established: ${connectionId} (user: ${userId || 'anonymous'})`
    );

    // Send connected event
    this.sendToConnection(connectionId, {
      event: 'connected',
      data: {
        clientId: connectionId,
        timestamp: Date.now(),
        authenticated: !!userId,
      } as ConnectedEventData,
      timestamp: Date.now(),
    });

    return connectionId;
  }

  /**
   * Remove a connection
   * @param connectionId - Connection ID
   */
  removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Remove from user connections index
    if (connection.userId) {
      const userConns = this.userConnections.get(connection.userId);
      if (userConns) {
        userConns.delete(connectionId);
        if (userConns.size === 0) {
          this.userConnections.delete(connection.userId);
        }
      }
    }

    // Close response if still open
    if (!connection.response.closed) {
      connection.response.end();
    }

    this.connections.delete(connectionId);

    console.log(
      `[SSEService] SSE connection closed: ${connectionId} (user: ${connection.userId || 'anonymous'})`
    );
  }

  /**
   * Send event to a specific connection
   * @param connectionId - Connection ID
   * @param event - SSE event to send
   */
  sendToConnection<T>(connectionId: string, event: SSEEvent<T>): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection || connection.response.closed) {
      return false;
    }

    try {
      const formatted = this.formatSSEEvent(event);
      connection.response.write(formatted);
      connection.lastHeartbeat = Date.now();
      return true;
    } catch (error) {
      console.error(`[SSEService] Failed to send event to ${connectionId}:`, error);
      this.removeConnection(connectionId);
      return false;
    }
  }

  /**
   * Broadcast event to all connections
   * @param event - SSE event to broadcast
   */
  broadcast<T>(event: SSEEvent<T>): void {
    for (const connectionId of this.connections.keys()) {
      this.sendToConnection(connectionId, event);
    }
  }

  /**
   * Broadcast event to all connections for a specific user
   * @param userId - User ID
   * @param event - SSE event to broadcast
   */
  broadcastToUser<T>(userId: string, event: SSEEvent<T>): void {
    const userConns = this.userConnections.get(userId);
    if (!userConns) return;

    for (const connectionId of userConns) {
      this.sendToConnection(connectionId, event);
    }
  }

  /**
   * Send authentication status update
   * @param connectionId - Connection ID (or userId for broadcast)
   * @param data - Auth status data
   * @param broadcast - Broadcast to all user connections
   */
  sendAuthStatus(
    connectionId: string,
    data: AuthStatusEventData,
    broadcast: boolean = false
  ): void {
    const event: SSEEvent<AuthStatusEventData> = {
      id: this.generateEventId(),
      event: 'auth-status',
      data,
      timestamp: Date.now(),
    };

    if (broadcast) {
      const connection = this.connections.get(connectionId);
      if (connection?.userId) {
        this.broadcastToUser(connection.userId, event);
      }
    } else {
      this.sendToConnection(connectionId, event);
    }
  }

  /**
   * Send conversation update
   * @param userId - User ID (or connectionId if not authenticated)
   * @param data - Conversation update data
   */
  sendConversationUpdate(userId: string, data: ConversationUpdateEventData): void {
    const event: SSEEvent<ConversationUpdateEventData> = {
      id: this.generateEventId(),
      event: 'conversation-update',
      data,
      timestamp: Date.now(),
    };

    // Try to send to user connections
    const userConns = this.userConnections.get(userId);
    if (userConns) {
      this.broadcastToUser(userId, event);
    } else {
      // Fallback to connection ID
      this.sendToConnection(userId, event);
    }
  }

  /**
   * Send tool response
   * @param userId - User ID (or connectionId if not authenticated)
   * @param data - Tool response data
   */
  sendToolResponse(userId: string, data: ToolResponseEventData): void {
    const event: SSEEvent<ToolResponseEventData> = {
      id: this.generateEventId(),
      event: 'tool-response',
      data,
      timestamp: Date.now(),
    };

    // Try to send to user connections
    const userConns = this.userConnections.get(userId);
    if (userConns) {
      this.broadcastToUser(userId, event);
    } else {
      // Fallback to connection ID
      this.sendToConnection(userId, event);
    }
  }

  /**
   * Send error event
   * @param connectionId - Connection ID
   * @param data - Error data
   */
  sendError(connectionId: string, data: ErrorEventData): void {
    const event: SSEEvent<ErrorEventData> = {
      id: this.generateEventId(),
      event: 'error',
      data,
      timestamp: Date.now(),
    };

    this.sendToConnection(connectionId, event);
  }

  /**
   * Format SSE event for transmission
   * @param event - SSE event
   * @returns Formatted SSE string
   */
  private formatSSEEvent<T>(event: SSEEvent<T>): string {
    let formatted = '';

    // Add event ID if present
    if (event.id) {
      formatted += `id: ${event.id}\n`;
    }

    // Add event type
    formatted += `event: ${event.event}\n`;

    // Add data (must be on separate lines for multiline data)
    const dataStr = JSON.stringify(event.data);
    formatted += `data: ${dataStr}\n`;

    // Add blank line to signal end of event
    formatted += '\n';

    return formatted;
  }

  /**
   * Start heartbeat mechanism
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      const heartbeatEvent: SSEEvent<HeartbeatEventData> = {
        event: 'heartbeat',
        data: {
          timestamp: Date.now(),
          activeConnections: this.connections.size,
        },
        timestamp: Date.now(),
      };

      this.broadcast(heartbeatEvent);
    }, this.config.heartbeatInterval);
  }

  /**
   * Start connection cleanup mechanism
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      const timeout = this.config.connectionTimeout;

      for (const [connectionId, connection] of this.connections.entries()) {
        if (now - connection.lastHeartbeat > timeout) {
          console.log(`[SSEService] Connection ${connectionId} timed out, removing`);
          this.removeConnection(connectionId);
        }
      }
    }, 60000); // Run cleanup every minute
  }

  /**
   * Generate unique connection ID
   */
  private generateConnectionId(): string {
    return `sse-${Date.now()}-${randomBytes(8).toString('hex')}`;
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `${Date.now()}-${++this.eventCounter}`;
  }

  /**
   * Get connection count
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Get user connection count
   */
  getUserConnectionCount(userId: string): number {
    return this.userConnections.get(userId)?.size || 0;
  }

  /**
   * Get connection metadata
   */
  getConnection(connectionId: string): SSEConnection | undefined {
    const conn = this.connections.get(connectionId);
    if (!conn) return undefined;

    // Return without response object
    const { response, ...metadata } = conn;
    return metadata;
  }

  /**
   * Stop the SSE service
   */
  stop(): void {
    // Clear timers
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    // Close all connections
    for (const connectionId of this.connections.keys()) {
      this.removeConnection(connectionId);
    }

    console.log('[SSEService] SSE service stopped');
  }
}
