/**
 * SSE Client with automatic reconnection and exponential backoff
 * This client can be used in browser or Node.js environments
 */

import type {
  SSEEventType,
  AuthStatusEventData,
  ConversationUpdateEventData,
  ToolResponseEventData,
  HeartbeatEventData,
  ErrorEventData,
  ConnectedEventData,
} from '../types/sse-events.js';

/**
 * SSE Event handler callback
 */
export type SSEEventHandler<T = unknown> = (data: T, event: MessageEvent) => void;

/**
 * SSE Client configuration
 */
export interface SSEClientConfig {
  url: string;
  initialReconnectDelay?: number; // milliseconds
  maxReconnectDelay?: number; // milliseconds
  reconnectDecayRate?: number; // exponential backoff multiplier
  maxReconnectAttempts?: number;
  withCredentials?: boolean;
}

/**
 * SSE Client with automatic reconnection
 */
export class SSEClient {
  private config: Required<SSEClientConfig>;
  private eventSource: EventSource | null = null;
  private reconnectAttempts: number = 0;
  private reconnectTimer?: NodeJS.Timeout | number;
  private currentReconnectDelay: number;
  private isConnected: boolean = false;
  private isClosed: boolean = false;
  private eventHandlers: Map<SSEEventType, Set<SSEEventHandler>> = new Map();
  private connectionHandlers: Set<() => void> = new Set();
  private disconnectionHandlers: Set<() => void> = new Set();
  private errorHandlers: Set<(error: Error) => void> = new Set();

  /**
   * Create a new SSE client
   * @param config - Client configuration
   */
  constructor(config: SSEClientConfig) {
    this.config = {
      url: config.url,
      initialReconnectDelay: config.initialReconnectDelay || 1000, // 1 second
      maxReconnectDelay: config.maxReconnectDelay || 30000, // 30 seconds
      reconnectDecayRate: config.reconnectDecayRate || 1.5,
      maxReconnectAttempts: config.maxReconnectAttempts || Infinity,
      withCredentials: config.withCredentials !== false,
    };

    this.currentReconnectDelay = this.config.initialReconnectDelay;
  }

  /**
   * Connect to SSE stream
   */
  connect(): void {
    if (this.isClosed) {
      console.warn('[SSEClient] Cannot connect - client is closed');
      return;
    }

    if (this.eventSource) {
      console.warn('[SSEClient] Already connected or connecting');
      return;
    }

    try {
      // Create EventSource
      this.eventSource = new EventSource(this.config.url, {
        withCredentials: this.config.withCredentials,
      });

      // Setup event listeners
      this.setupEventListeners();

      console.log('[SSEClient] Connecting to SSE stream:', this.config.url);
    } catch (error) {
      console.error('[SSEClient] Failed to create EventSource:', error);
      this.handleError(error as Error);
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from SSE stream
   */
  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer as number);
      this.reconnectTimer = undefined;
    }

    this.isConnected = false;
    console.log('[SSEClient] Disconnected from SSE stream');
  }

  /**
   * Close the client permanently
   */
  close(): void {
    this.isClosed = true;
    this.disconnect();
    this.eventHandlers.clear();
    this.connectionHandlers.clear();
    this.disconnectionHandlers.clear();
    this.errorHandlers.clear();
    console.log('[SSEClient] Client closed');
  }

  /**
   * Register event handler for specific event type
   * @param eventType - SSE event type
   * @param handler - Event handler callback
   */
  on<T = unknown>(eventType: SSEEventType, handler: SSEEventHandler<T>): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    this.eventHandlers.get(eventType)!.add(handler as SSEEventHandler);
  }

  /**
   * Remove event handler
   * @param eventType - SSE event type
   * @param handler - Event handler callback
   */
  off<T = unknown>(eventType: SSEEventType, handler: SSEEventHandler<T>): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.delete(handler as SSEEventHandler);
    }
  }

  /**
   * Register connection handler
   * @param handler - Connection callback
   */
  onConnect(handler: () => void): void {
    this.connectionHandlers.add(handler);
  }

  /**
   * Register disconnection handler
   * @param handler - Disconnection callback
   */
  onDisconnect(handler: () => void): void {
    this.disconnectionHandlers.add(handler);
  }

  /**
   * Register error handler
   * @param handler - Error callback
   */
  onError(handler: (error: Error) => void): void {
    this.errorHandlers.add(handler);
  }

  /**
   * Check if client is connected
   */
  isClientConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get current reconnect attempt count
   */
  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  /**
   * Setup EventSource listeners
   */
  private setupEventListeners(): void {
    if (!this.eventSource) return;

    // Handle connection open
    this.eventSource.onopen = () => {
      console.log('[SSEClient] SSE connection established');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.currentReconnectDelay = this.config.initialReconnectDelay;

      // Notify connection handlers
      this.connectionHandlers.forEach((handler) => handler());
    };

    // Handle errors
    this.eventSource.onerror = (event) => {
      console.error('[SSEClient] SSE connection error:', event);
      this.isConnected = false;

      const error = new Error('SSE connection error');
      this.handleError(error);

      // Reconnect on error
      if (!this.isClosed) {
        this.disconnect();
        this.scheduleReconnect();
      }
    };

    // Setup typed event listeners
    this.eventSource.addEventListener('connected', (event) => {
      this.handleTypedEvent<ConnectedEventData>('connected', event as MessageEvent);
    });

    this.eventSource.addEventListener('auth-status', (event) => {
      this.handleTypedEvent<AuthStatusEventData>('auth-status', event as MessageEvent);
    });

    this.eventSource.addEventListener('conversation-update', (event) => {
      this.handleTypedEvent<ConversationUpdateEventData>('conversation-update', event as MessageEvent);
    });

    this.eventSource.addEventListener('tool-response', (event) => {
      this.handleTypedEvent<ToolResponseEventData>('tool-response', event as MessageEvent);
    });

    this.eventSource.addEventListener('heartbeat', (event) => {
      this.handleTypedEvent<HeartbeatEventData>('heartbeat', event as MessageEvent);
    });

    this.eventSource.addEventListener('error', (event) => {
      this.handleTypedEvent<ErrorEventData>('error', event as unknown as MessageEvent);
    });
  }

  /**
   * Handle typed SSE event
   * @param eventType - Event type
   * @param event - Message event
   */
  private handleTypedEvent<T>(eventType: SSEEventType, event: MessageEvent): void {
    try {
      const data: T = JSON.parse(event.data);
      const handlers = this.eventHandlers.get(eventType);

      if (handlers) {
        handlers.forEach((handler) => handler(data, event));
      }
    } catch (error) {
      console.error(`[SSEClient] Failed to parse ${eventType} event:`, error);
    }
  }

  /**
   * Handle error
   * @param error - Error object
   */
  private handleError(error: Error): void {
    this.errorHandlers.forEach((handler) => handler(error));
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.isClosed) return;

    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('[SSEClient] Max reconnect attempts reached, giving up');
      this.handleError(new Error('Max reconnect attempts reached'));
      return;
    }

    this.reconnectAttempts++;

    console.log(
      `[SSEClient] Scheduling reconnect attempt ${this.reconnectAttempts} in ${this.currentReconnectDelay}ms`
    );

    this.reconnectTimer = setTimeout(() => {
      console.log(`[SSEClient] Reconnecting (attempt ${this.reconnectAttempts})...`);
      this.connect();

      // Increase delay for next attempt (exponential backoff)
      this.currentReconnectDelay = Math.min(
        this.currentReconnectDelay * this.config.reconnectDecayRate,
        this.config.maxReconnectDelay
      );
    }, this.currentReconnectDelay);

    // Notify disconnection handlers
    this.disconnectionHandlers.forEach((handler) => handler());
  }
}

/**
 * Create SSE client with default configuration
 * @param url - SSE endpoint URL
 * @param config - Optional configuration
 * @returns SSE client instance
 */
export function createSSEClient(
  url: string,
  config?: Omit<SSEClientConfig, 'url'>
): SSEClient {
  return new SSEClient({ url, ...config });
}
