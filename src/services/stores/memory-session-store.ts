/**
 * In-memory session storage with TTL cleanup
 * Suitable for development and single-instance deployments
 */

import type { ISessionStore, SessionData } from '../../types/session.js';

/**
 * Memory-based session store using Map with TTL cleanup
 */
export class MemorySessionStore implements ISessionStore {
  private sessions: Map<string, SessionData> = new Map();
  private userSessionIndex: Map<string, Set<string>> = new Map();
  private cleanupTimer?: NodeJS.Timeout;
  private cleanupInterval: number;

  /**
   * Create a new MemorySessionStore
   * @param cleanupInterval - Cleanup interval in milliseconds (default: 60000 = 1 minute)
   */
  constructor(cleanupInterval: number = 60000) {
    this.cleanupInterval = cleanupInterval;
    this.startCleanup();
  }

  /**
   * Create a new session
   * @param sessionData - Session data to store
   * @returns Session ID
   */
  async create(sessionData: SessionData): Promise<string> {
    this.sessions.set(sessionData.sessionId, sessionData);

    // Update user session index
    const userId = sessionData.userContext.userId;
    if (!this.userSessionIndex.has(userId)) {
      this.userSessionIndex.set(userId, new Set());
    }
    this.userSessionIndex.get(userId)!.add(sessionData.sessionId);

    return sessionData.sessionId;
  }

  /**
   * Get session by ID
   * @param sessionId - Session ID
   * @returns Session data or null if not found
   */
  async get(sessionId: string): Promise<SessionData | null> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    // Check if expired
    if (Date.now() >= session.expiresAt) {
      await this.delete(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Update existing session
   * @param sessionId - Session ID
   * @param updates - Partial session data to update
   */
  async update(sessionId: string, updates: Partial<SessionData>): Promise<void> {
    const existing = this.sessions.get(sessionId);

    if (!existing) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Merge updates
    const updated: SessionData = {
      ...existing,
      ...updates,
      // Ensure nested objects are properly merged
      userContext: updates.userContext
        ? { ...existing.userContext, ...updates.userContext }
        : existing.userContext,
      tokenMetadata: updates.tokenMetadata
        ? { ...existing.tokenMetadata, ...updates.tokenMetadata }
        : existing.tokenMetadata,
      security: updates.security
        ? { ...existing.security, ...updates.security }
        : existing.security,
    };

    this.sessions.set(sessionId, updated);

    // Update user index if userId changed
    if (updates.userContext?.userId && updates.userContext.userId !== existing.userContext.userId) {
      // Remove from old user index
      const oldUserId = existing.userContext.userId;
      const oldUserSessions = this.userSessionIndex.get(oldUserId);
      if (oldUserSessions) {
        oldUserSessions.delete(sessionId);
        if (oldUserSessions.size === 0) {
          this.userSessionIndex.delete(oldUserId);
        }
      }

      // Add to new user index
      const newUserId = updates.userContext.userId;
      if (!this.userSessionIndex.has(newUserId)) {
        this.userSessionIndex.set(newUserId, new Set());
      }
      this.userSessionIndex.get(newUserId)!.add(sessionId);
    }
  }

  /**
   * Delete session by ID
   * @param sessionId - Session ID
   */
  async delete(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);

    if (session) {
      // Remove from user index
      const userId = session.userContext.userId;
      const userSessions = this.userSessionIndex.get(userId);
      if (userSessions) {
        userSessions.delete(sessionId);
        if (userSessions.size === 0) {
          this.userSessionIndex.delete(userId);
        }
      }
    }

    this.sessions.delete(sessionId);
  }

  /**
   * Clean up expired sessions
   * @returns Number of sessions cleaned up
   */
  async cleanup(): Promise<number> {
    let cleanedCount = 0;
    const now = Date.now();

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now >= session.expiresAt) {
        await this.delete(sessionId);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Get all active sessions for a user
   * @param userId - User ID
   * @returns Array of session data
   */
  async getUserSessions(userId: string): Promise<SessionData[]> {
    const sessionIds = this.userSessionIndex.get(userId);

    if (!sessionIds || sessionIds.size === 0) {
      return [];
    }

    const sessions: SessionData[] = [];
    const now = Date.now();

    for (const sessionId of sessionIds) {
      const session = this.sessions.get(sessionId);
      if (session && now < session.expiresAt) {
        sessions.push(session);
      }
    }

    return sessions;
  }

  /**
   * Get session count
   * @returns Total number of active sessions
   */
  async getSessionCount(): Promise<number> {
    return this.sessions.size;
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(async () => {
      try {
        const cleaned = await this.cleanup();
        if (cleaned > 0) {
          console.error(`[MemorySessionStore] Cleaned up ${cleaned} expired sessions`);
        }
      } catch (error) {
        console.error('[MemorySessionStore] Cleanup error:', error);
      }
    }, this.cleanupInterval);

    // Don't keep process alive just for cleanup
    this.cleanupTimer.unref();
  }

  /**
   * Stop automatic cleanup timer
   */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Get memory usage statistics
   * @returns Memory usage info
   */
  getMemoryStats(): {
    sessionCount: number;
    userCount: number;
    estimatedMemoryBytes: number;
  } {
    const sessionCount = this.sessions.size;
    const userCount = this.userSessionIndex.size;

    // Rough estimation: each session ~2KB
    const estimatedMemoryBytes = sessionCount * 2048;

    return {
      sessionCount,
      userCount,
      estimatedMemoryBytes,
    };
  }

  /**
   * Clear all sessions (for testing)
   */
  async clearAll(): Promise<void> {
    this.sessions.clear();
    this.userSessionIndex.clear();
  }
}
