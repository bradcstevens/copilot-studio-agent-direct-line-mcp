/**
 * Token management with caching and automatic refresh
 */

import type { DirectLineClient } from './directline-client.js';
import type { DirectLineToken } from '../types/directline.js';

/**
 * Token cache entry
 */
interface TokenCacheEntry {
  token: string;
  conversationId?: string;
  expiresAt: number; // Unix timestamp in milliseconds
  createdAt: number;
}

/**
 * Token manager metrics
 */
export interface TokenMetrics {
  generateCount: number;
  generateSuccessCount: number;
  generateFailureCount: number;
  cacheHits: number;
  cacheMisses: number;
  refreshCount: number;
  lastGeneratedAt?: number;
}

/**
 * Token Manager for Direct Line tokens
 * Handles caching, validation, and automatic refresh
 */
export class TokenManager {
  private cache: Map<string, TokenCacheEntry> = new Map();
  private client: DirectLineClient;
  private refreshTimers: Map<string, NodeJS.Timeout> = new Map();
  private refreshMargin: number = 5 * 60 * 1000; // 5 minutes in ms
  private metrics: TokenMetrics = {
    generateCount: 0,
    generateSuccessCount: 0,
    generateFailureCount: 0,
    cacheHits: 0,
    cacheMisses: 0,
    refreshCount: 0,
  };

  /**
   * Create a new TokenManager
   * @param client - Direct Line client
   * @param refreshMargin - Time before expiration to refresh (ms), default 5 minutes
   */
  constructor(client: DirectLineClient, refreshMargin?: number) {
    this.client = client;
    if (refreshMargin !== undefined) {
      this.refreshMargin = refreshMargin;
    }
  }

  /**
   * Get a valid token (from cache or generate new)
   * @param key - Cache key (default: 'default')
   * @returns Token string
   */
  async getToken(key: string = 'default'): Promise<string> {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached && this.isTokenValid(cached)) {
      this.metrics.cacheHits++;
      return cached.token;
    }

    this.metrics.cacheMisses++;

    // Generate new token
    return await this.generateAndCacheToken(key);
  }

  /**
   * Generate a new token and cache it
   * @param key - Cache key
   * @returns Token string
   */
  private async generateAndCacheToken(key: string): Promise<string> {
    this.metrics.generateCount++;

    try {
      const response = await this.client.generateToken();

      this.metrics.generateSuccessCount++;
      this.metrics.lastGeneratedAt = Date.now();

      // Cache the token
      const entry: TokenCacheEntry = {
        token: response.token,
        conversationId: response.conversationId,
        expiresAt: Date.now() + response.expires_in * 1000,
        createdAt: Date.now(),
      };

      this.setToken(key, entry);

      // Schedule proactive refresh
      this.scheduleRefresh(key, entry);

      return response.token;
    } catch (error) {
      this.metrics.generateFailureCount++;
      console.error('[TokenManager] Token generation failed:', error);
      throw error;
    }
  }

  /**
   * Set a token in cache
   * @param key - Cache key
   * @param entry - Token cache entry
   */
  private setToken(key: string, entry: TokenCacheEntry): void {
    this.cache.set(key, entry);
  }

  /**
   * Check if a token is still valid
   * @param entry - Token cache entry
   * @returns True if token is valid
   */
  private isTokenValid(entry: TokenCacheEntry): boolean {
    return Date.now() < entry.expiresAt;
  }

  /**
   * Schedule proactive token refresh
   * @param key - Cache key
   * @param entry - Token cache entry
   */
  private scheduleRefresh(key: string, entry: TokenCacheEntry): void {
    // Clear existing timer if any
    const existingTimer = this.refreshTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Calculate when to refresh (5 minutes before expiration)
    const refreshAt = entry.expiresAt - this.refreshMargin;
    const delay = Math.max(0, refreshAt - Date.now());

    const timer = setTimeout(async () => {
      console.log(`[TokenManager] Proactively refreshing token for key: ${key}`);
      this.metrics.refreshCount++;

      try {
        await this.generateAndCacheToken(key);
      } catch (error) {
        console.error('[TokenManager] Proactive refresh failed:', error);
      }
    }, delay);

    this.refreshTimers.set(key, timer);
  }

  /**
   * Clear a token from cache
   * @param key - Cache key
   */
  clearToken(key: string = 'default'): void {
    this.cache.delete(key);

    const timer = this.refreshTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.refreshTimers.delete(key);
    }
  }

  /**
   * Clear all tokens from cache
   */
  clearAll(): void {
    this.cache.clear();

    for (const timer of this.refreshTimers.values()) {
      clearTimeout(timer);
    }
    this.refreshTimers.clear();
  }

  /**
   * Get current metrics
   * @returns Token metrics
   */
  getMetrics(): Readonly<TokenMetrics> {
    return { ...this.metrics };
  }

  /**
   * Get cache size
   * @returns Number of cached tokens
   */
  getCacheSize(): number {
    return this.cache.size;
  }
}
