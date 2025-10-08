/**
 * Server-Sent Events (SSE) type definitions for real-time MCP communication
 */

/**
 * SSE Event types
 */
export type SSEEventType =
  | 'auth-status'
  | 'conversation-update'
  | 'tool-response'
  | 'heartbeat'
  | 'error'
  | 'connected';

/**
 * Base SSE event structure
 */
export interface SSEEvent<T = unknown> {
  id?: string;
  event: SSEEventType;
  data: T;
  timestamp: number;
}

/**
 * Authentication status event data
 */
export interface AuthStatusEventData {
  authenticated: boolean;
  userId?: string;
  email?: string;
  name?: string;
  expiresAt?: number;
  requiresRefresh?: boolean;
}

/**
 * Conversation update event data
 */
export interface ConversationUpdateEventData {
  conversationId: string;
  action: 'started' | 'message' | 'ended';
  message?: {
    id: string;
    text: string;
    from: 'user' | 'bot';
    timestamp: number;
  };
  userId?: string;
}

/**
 * Tool response event data
 */
export interface ToolResponseEventData {
  toolName: string;
  conversationId?: string;
  success: boolean;
  result?: unknown;
  error?: string;
  duration?: number;
  userId?: string;
}

/**
 * Heartbeat event data
 */
export interface HeartbeatEventData {
  timestamp: number;
  activeConnections: number;
}

/**
 * Error event data
 */
export interface ErrorEventData {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Connected event data
 */
export interface ConnectedEventData {
  clientId: string;
  timestamp: number;
  authenticated: boolean;
}

/**
 * SSE connection metadata
 */
export interface SSEConnection {
  id: string;
  userId?: string;
  ipAddress: string;
  userAgent: string;
  connectedAt: number;
  lastHeartbeat: number;
  authenticated: boolean;
}

/**
 * SSE configuration
 */
export interface SSEConfig {
  heartbeatInterval: number; // milliseconds
  connectionTimeout: number; // milliseconds
  maxConnections: number;
  maxConnectionsPerUser: number;
}
