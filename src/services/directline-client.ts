/**
 * Direct Line 3.0 API client
 */

import type { AxiosInstance } from 'axios';
import type {
  DirectLineToken,
  Conversation,
  Activity,
  ActivitySet,
  SendActivityOptions,
  GetActivitiesOptions,
} from '../types/directline.js';
import { createHttpClient } from './http-client.js';
import { CircuitBreaker } from '../utils/circuit-breaker.js';

/**
 * Direct Line Client for interacting with Microsoft Bot Framework Direct Line API
 */
export class DirectLineClient {
  private client: AxiosInstance;
  private secret: string;
  private circuitBreaker: CircuitBreaker;

  /**
   * Create a new Direct Line client
   * @param secret - Direct Line secret key
   */
  constructor(secret: string) {
    this.secret = secret;
    this.client = createHttpClient();
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      failureWindow: 30000,
      recoveryTimeout: 60000,
      successThreshold: 3,
    });
  }

  /**
   * Generate a new Direct Line token from secret
   * @returns Token response with conversationId and token
   * @throws Error if token generation fails
   */
  async generateToken(): Promise<DirectLineToken> {
    return this.circuitBreaker.execute(async () => {
      try {
        const response = await this.client.post<DirectLineToken>(
          '/tokens/generate',
          {},
          {
            headers: {
              Authorization: `Bearer ${this.secret}`,
            },
          }
        );

        return response.data;
      } catch (error) {
        console.error('[DirectLine] Token generation failed:', error);
        throw new Error(`Failed to generate Direct Line token: ${error}`);
      }
    });
  }

  /**
   * Start a new conversation
   * @param token - Optional Direct Line token (generates new one if not provided)
   * @returns Conversation details
   * @throws Error if conversation creation fails
   */
  async startConversation(token?: string): Promise<Conversation> {
    return this.circuitBreaker.execute(async () => {
      try {
        const authToken = token || (await this.generateToken()).token;

        const response = await this.client.post<Conversation>(
          '/conversations',
          {},
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );

        return response.data;
      } catch (error) {
        console.error('[DirectLine] Conversation creation failed:', error);
        throw new Error(`Failed to start conversation: ${error}`);
      }
    });
  }

  /**
   * Send an activity (message) to a conversation
   * @param options - Send activity options
   * @param token - Direct Line token
   * @returns Activity ID
   * @throws Error if sending fails
   */
  async sendActivity(options: SendActivityOptions, token: string): Promise<string> {
    return this.circuitBreaker.execute(async () => {
      try {
        const { conversationId, activity } = options;

        const response = await this.client.post<{ id: string }>(
          `/conversations/${conversationId}/activities`,
          {
            type: 'message',
            from: { id: 'user' },
            ...activity,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        return response.data.id;
      } catch (error) {
        console.error('[DirectLine] Send activity failed:', error);
        throw new Error(`Failed to send activity: ${error}`);
      }
    });
  }

  /**
   * Get activities from a conversation
   * @param options - Get activities options
   * @param token - Direct Line token
   * @returns Activity set with watermark
   * @throws Error if retrieval fails
   */
  async getActivities(options: GetActivitiesOptions, token: string): Promise<ActivitySet> {
    return this.circuitBreaker.execute(async () => {
      try {
        const { conversationId, watermark } = options;
        const url = watermark
          ? `/conversations/${conversationId}/activities?watermark=${watermark}`
          : `/conversations/${conversationId}/activities`;

        const response = await this.client.get<ActivitySet>(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        return response.data;
      } catch (error) {
        console.error('[DirectLine] Get activities failed:', error);
        throw new Error(`Failed to get activities: ${error}`);
      }
    });
  }

  /**
   * Get circuit breaker metrics
   * @returns Circuit breaker metrics
   */
  getCircuitBreakerMetrics() {
    return this.circuitBreaker.getMetrics();
  }
}
