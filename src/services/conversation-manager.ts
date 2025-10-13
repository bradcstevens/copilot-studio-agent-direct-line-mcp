/**
 * Conversation state management and lifecycle tracking
 */

import type { DirectLineClient } from './directline-client.js';
import type { TokenManager } from './token-manager.js';
import type { Activity } from '../types/directline.js';

/**
 * Conversation state
 */
export interface ConversationState {
  conversationId: string;
  token: string;
  clientId: string;
  watermark?: string;
  createdAt: number;
  lastActivity: number;
  messageHistory: Activity[];
}

/**
 * Conversation metrics
 */
export interface ConversationMetrics {
  totalCreated: number;
  activeCount: number;
  cleanedUp: number;
  averageLifetime: number;
}

/**
 * Conversation Manager for tracking and managing conversation state
 */
export class ConversationManager {
  private conversations: Map<string, ConversationState> = new Map();
  private timeoutTimers: Map<string, NodeJS.Timeout> = new Map();
  private client: DirectLineClient;
  private tokenManager: TokenManager;
  private idleTimeout: number = 30 * 60 * 1000; // 30 minutes
  private metrics: ConversationMetrics = {
    totalCreated: 0,
    activeCount: 0,
    cleanedUp: 0,
    averageLifetime: 0,
  };

  /**
   * Create a new ConversationManager
   * @param client - Direct Line client
   * @param tokenManager - Token manager
   * @param idleTimeout - Idle timeout in milliseconds (default: 30 minutes)
   */
  constructor(client: DirectLineClient, tokenManager: TokenManager, idleTimeout?: number) {
    this.client = client;
    this.tokenManager = tokenManager;
    if (idleTimeout !== undefined) {
      this.idleTimeout = idleTimeout;
    }
  }

  /**
   * Create a new conversation
   * @param clientId - MCP client ID
   * @returns Conversation state
   */
  async createConversation(clientId: string): Promise<ConversationState> {
    // Get token from token manager
    const token = await this.tokenManager.getToken(clientId);

    // Start conversation with Direct Line
    const conversation = await this.client.startConversation(token);

    // Create state
    const state: ConversationState = {
      conversationId: conversation.conversationId,
      token: conversation.token,
      clientId,
      watermark: undefined,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      messageHistory: [],
    };

    // Store state
    this.conversations.set(conversation.conversationId, state);

    // Update metrics
    this.metrics.totalCreated++;
    this.metrics.activeCount = this.conversations.size;

    // Schedule cleanup
    this.scheduleCleanup(conversation.conversationId);

    console.error(`[ConversationManager] Created conversation ${conversation.conversationId} for client ${clientId}`);

    return state;
  }

  /**
   * Get conversation state
   * @param conversationId - Conversation ID
   * @returns Conversation state or undefined
   */
  getConversation(conversationId: string): ConversationState | undefined {
    const state = this.conversations.get(conversationId);
    if (state) {
      // Update last activity timestamp
      state.lastActivity = Date.now();
      // Reschedule cleanup
      this.scheduleCleanup(conversationId);
    }
    return state;
  }

  /**
   * Update conversation watermark
   * @param conversationId - Conversation ID
   * @param watermark - New watermark
   */
  updateWatermark(conversationId: string, watermark: string): void {
    const state = this.conversations.get(conversationId);
    if (state) {
      state.watermark = watermark;
      state.lastActivity = Date.now();
    }
  }

  /**
   * Add message to history
   * @param conversationId - Conversation ID
   * @param activity - Activity to add
   */
  addToHistory(conversationId: string, activity: Activity): void {
    const state = this.conversations.get(conversationId);
    if (state) {
      state.messageHistory.push(activity);
      state.lastActivity = Date.now();
    }
  }

  /**
   * Get all conversations for a client
   * @param clientId - MCP client ID
   * @returns Array of conversation states
   */
  getClientConversations(clientId: string): ConversationState[] {
    return Array.from(this.conversations.values()).filter((c) => c.clientId === clientId);
  }

  /**
   * End a conversation and cleanup
   * @param conversationId - Conversation ID
   */
  endConversation(conversationId: string): void {
    const state = this.conversations.get(conversationId);
    if (!state) return;

    const lifetime = Date.now() - state.createdAt;

    // Update metrics
    this.metrics.cleanedUp++;
    this.metrics.activeCount = this.conversations.size - 1;
    this.metrics.averageLifetime =
      (this.metrics.averageLifetime * (this.metrics.cleanedUp - 1) + lifetime) /
      this.metrics.cleanedUp;

    // Clear timeout
    const timer = this.timeoutTimers.get(conversationId);
    if (timer) {
      clearTimeout(timer);
      this.timeoutTimers.delete(conversationId);
    }

    // Remove conversation
    this.conversations.delete(conversationId);

    console.error(
      `[ConversationManager] Ended conversation ${conversationId} (lifetime: ${(lifetime / 1000).toFixed(0)}s)`
    );
  }

  /**
   * Schedule automatic cleanup for idle timeout
   * @param conversationId - Conversation ID
   */
  private scheduleCleanup(conversationId: string): void {
    // Clear existing timer
    const existingTimer = this.timeoutTimers.get(conversationId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Schedule new cleanup
    const timer = setTimeout(() => {
      console.error(`[ConversationManager] Auto-cleanup conversation ${conversationId} (idle timeout)`);
      this.endConversation(conversationId);
    }, this.idleTimeout);

    this.timeoutTimers.set(conversationId, timer);
  }

  /**
   * Get current metrics
   * @returns Conversation metrics
   */
  getMetrics(): Readonly<ConversationMetrics> {
    return { ...this.metrics };
  }

  /**
   * Get active conversation count
   * @returns Number of active conversations
   */
  getActiveCount(): number {
    return this.conversations.size;
  }

  /**
   * Cleanup all conversations
   */
  cleanupAll(): void {
    for (const conversationId of this.conversations.keys()) {
      this.endConversation(conversationId);
    }
  }
}
