/**
 * Browser-compatible SSE Client with automatic reconnection
 * This file can be included directly in HTML via script tag
 */

(function (global) {
  'use strict';

  /**
   * SSE Client with automatic reconnection and exponential backoff
   */
  class SSEClient {
    /**
     * Create a new SSE client
     * @param {Object} config - Client configuration
     * @param {string} config.url - SSE endpoint URL
     * @param {number} [config.initialReconnectDelay=1000] - Initial reconnect delay in ms
     * @param {number} [config.maxReconnectDelay=30000] - Maximum reconnect delay in ms
     * @param {number} [config.reconnectDecayRate=1.5] - Exponential backoff multiplier
     * @param {number} [config.maxReconnectAttempts=Infinity] - Maximum reconnect attempts
     * @param {boolean} [config.withCredentials=true] - Include credentials in requests
     */
    constructor(config) {
      this.config = {
        url: config.url,
        initialReconnectDelay: config.initialReconnectDelay || 1000,
        maxReconnectDelay: config.maxReconnectDelay || 30000,
        reconnectDecayRate: config.reconnectDecayRate || 1.5,
        maxReconnectAttempts: config.maxReconnectAttempts || Infinity,
        withCredentials: config.withCredentials !== false,
      };

      this.eventSource = null;
      this.reconnectAttempts = 0;
      this.reconnectTimer = null;
      this.currentReconnectDelay = this.config.initialReconnectDelay;
      this.isConnected = false;
      this.isClosed = false;
      this.eventHandlers = new Map();
      this.connectionHandlers = [];
      this.disconnectionHandlers = [];
      this.errorHandlers = [];
    }

    /**
     * Connect to SSE stream
     */
    connect() {
      if (this.isClosed) {
        console.warn('[SSEClient] Cannot connect - client is closed');
        return;
      }

      if (this.eventSource) {
        console.warn('[SSEClient] Already connected or connecting');
        return;
      }

      try {
        this.eventSource = new EventSource(this.config.url, {
          withCredentials: this.config.withCredentials,
        });

        this.setupEventListeners();
        console.log('[SSEClient] Connecting to SSE stream:', this.config.url);
      } catch (error) {
        console.error('[SSEClient] Failed to create EventSource:', error);
        this.handleError(error);
        this.scheduleReconnect();
      }
    }

    /**
     * Disconnect from SSE stream
     */
    disconnect() {
      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
      }

      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      this.isConnected = false;
      console.log('[SSEClient] Disconnected from SSE stream');
    }

    /**
     * Close the client permanently
     */
    close() {
      this.isClosed = true;
      this.disconnect();
      this.eventHandlers.clear();
      this.connectionHandlers = [];
      this.disconnectionHandlers = [];
      this.errorHandlers = [];
      console.log('[SSEClient] Client closed');
    }

    /**
     * Register event handler for specific event type
     * @param {string} eventType - SSE event type
     * @param {Function} handler - Event handler callback
     */
    on(eventType, handler) {
      if (!this.eventHandlers.has(eventType)) {
        this.eventHandlers.set(eventType, []);
      }
      this.eventHandlers.get(eventType).push(handler);
    }

    /**
     * Remove event handler
     * @param {string} eventType - SSE event type
     * @param {Function} handler - Event handler callback
     */
    off(eventType, handler) {
      const handlers = this.eventHandlers.get(eventType);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    }

    /**
     * Register connection handler
     * @param {Function} handler - Connection callback
     */
    onConnect(handler) {
      this.connectionHandlers.push(handler);
    }

    /**
     * Register disconnection handler
     * @param {Function} handler - Disconnection callback
     */
    onDisconnect(handler) {
      this.disconnectionHandlers.push(handler);
    }

    /**
     * Register error handler
     * @param {Function} handler - Error callback
     */
    onError(handler) {
      this.errorHandlers.push(handler);
    }

    /**
     * Check if client is connected
     * @returns {boolean}
     */
    isClientConnected() {
      return this.isConnected;
    }

    /**
     * Get current reconnect attempt count
     * @returns {number}
     */
    getReconnectAttempts() {
      return this.reconnectAttempts;
    }

    /**
     * Setup EventSource listeners
     */
    setupEventListeners() {
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
      const eventTypes = [
        'connected',
        'auth-status',
        'conversation-update',
        'tool-response',
        'heartbeat',
        'error',
      ];

      eventTypes.forEach((eventType) => {
        this.eventSource.addEventListener(eventType, (event) => {
          this.handleTypedEvent(eventType, event);
        });
      });
    }

    /**
     * Handle typed SSE event
     * @param {string} eventType - Event type
     * @param {MessageEvent} event - Message event
     */
    handleTypedEvent(eventType, event) {
      try {
        const data = JSON.parse(event.data);
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
     * @param {Error} error - Error object
     */
    handleError(error) {
      this.errorHandlers.forEach((handler) => handler(error));
    }

    /**
     * Schedule reconnection with exponential backoff
     */
    scheduleReconnect() {
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
   * @param {string} url - SSE endpoint URL
   * @param {Object} [config] - Optional configuration
   * @returns {SSEClient} SSE client instance
   */
  function createSSEClient(url, config = {}) {
    return new SSEClient({ url, ...config });
  }

  // Export for different module systems
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SSEClient, createSSEClient };
  } else if (typeof define === 'function' && define.amd) {
    define([], function () {
      return { SSEClient, createSSEClient };
    });
  } else {
    global.SSEClient = SSEClient;
    global.createSSEClient = createSSEClient;
  }
})(typeof window !== 'undefined' ? window : global);
