/**
 * Session management system with pluggable storage backends
 */

import type {
  ISessionStore,
  SessionData,
  SessionConfig,
  SessionMetrics,
  SessionValidationResult,
  SessionAuditLog,
} from '../types/session.js';
import { randomBytes, createHash } from 'crypto';

/**
 * Session Manager - Core session management with pluggable storage backends
 */
export class SessionManager {
  private store: ISessionStore;
  private config: SessionConfig;
  private cleanupTimer?: NodeJS.Timeout;
  private auditLogs: SessionAuditLog[] = [];
  private metrics: SessionMetrics = {
    totalSessions: 0,
    activeSessions: 0,
    expiredSessions: 0,
    createdCount: 0,
    deletedCount: 0,
    validationCount: 0,
    validationFailureCount: 0,
  };

  /**
   * Create a new SessionManager
   * @param store - Storage backend implementation
   * @param config - Session configuration
   */
  constructor(store: ISessionStore, config: SessionConfig) {
    this.store = store;
    this.config = config;

    // Start automatic cleanup
    this.startCleanup();
  }

  /**
   * Create a new session
   * @param sessionData - Session data
   * @returns Session ID
   */
  async createSession(sessionData: Omit<SessionData, 'sessionId' | 'sessionToken'>): Promise<{
    sessionId: string;
    sessionToken: string;
  }> {
    try {
      // Generate secure session ID and token
      const sessionId = this.generateSessionId();
      const sessionToken = this.generateSessionToken();

      const completeSessionData: SessionData = {
        ...sessionData,
        sessionId,
        sessionToken,
        expiresAt: Date.now() + (this.config.sessionTimeout || 24 * 60 * 60 * 1000),
        createdAt: Date.now(),
      };

      // Check concurrent session limit
      if (this.config.maxConcurrentSessions) {
        await this.enforceConcurrentSessionLimit(
          sessionData.userContext.userId,
          this.config.maxConcurrentSessions
        );
      }

      await this.store.create(completeSessionData);

      this.metrics.createdCount++;
      this.metrics.activeSessions++;
      this.metrics.totalSessions++;

      // Audit log
      this.addAuditLog({
        timestamp: Date.now(),
        sessionId,
        userId: sessionData.userContext.userId,
        event: 'created',
        ipAddress: sessionData.security.ipAddress,
        userAgent: sessionData.security.userAgent,
      });

      return { sessionId, sessionToken };
    } catch (error) {
      console.error('[SessionManager] Session creation failed:', error);
      throw new Error(`Failed to create session: ${error}`);
    }
  }

  /**
   * Validate and retrieve session
   * @param sessionId - Session ID
   * @param sessionToken - Session token for validation
   * @param ipAddress - Client IP address
   * @param userAgent - Client user agent
   * @returns Validation result
   */
  async validateSession(
    sessionId: string,
    sessionToken: string,
    ipAddress: string,
    userAgent: string
  ): Promise<SessionValidationResult> {
    this.metrics.validationCount++;

    try {
      const session = await this.store.get(sessionId);

      if (!session) {
        this.metrics.validationFailureCount++;
        return { valid: false, error: 'Session not found' };
      }

      // Validate session token
      if (session.sessionToken !== sessionToken) {
        this.metrics.validationFailureCount++;
        this.addAuditLog({
          timestamp: Date.now(),
          sessionId,
          userId: session.userContext.userId,
          event: 'hijack_detected',
          ipAddress,
          userAgent,
          details: { reason: 'Invalid session token' },
        });
        return { valid: false, error: 'Invalid session token' };
      }

      // Check expiration
      if (Date.now() >= session.expiresAt) {
        this.metrics.validationFailureCount++;
        this.metrics.expiredSessions++;
        await this.store.delete(sessionId);
        return { valid: false, error: 'Session expired' };
      }

      // Check for session hijacking (IP/UA changes)
      const hijackDetected = this.detectSessionHijacking(session, ipAddress, userAgent);
      if (hijackDetected) {
        this.metrics.validationFailureCount++;
        this.addAuditLog({
          timestamp: Date.now(),
          sessionId,
          userId: session.userContext.userId,
          event: 'hijack_detected',
          ipAddress,
          userAgent,
          details: {
            originalIp: session.security.ipAddress,
            originalUserAgent: session.security.userAgent,
          },
        });
        return { valid: false, error: 'Session security violation detected' };
      }

      // Update last accessed time
      await this.store.update(sessionId, {
        security: {
          ...session.security,
          lastAccessedAt: Date.now(),
          accessCount: session.security.accessCount + 1,
        },
      });

      // Check if token refresh is needed (within 5 minutes of expiration)
      const requiresRefresh = session.tokenMetadata.expiresAt - Date.now() < 5 * 60 * 1000;

      this.addAuditLog({
        timestamp: Date.now(),
        sessionId,
        userId: session.userContext.userId,
        event: 'validated',
        ipAddress,
        userAgent,
      });

      return { valid: true, session, requiresRefresh };
    } catch (error) {
      console.error('[SessionManager] Session validation failed:', error);
      this.metrics.validationFailureCount++;
      return { valid: false, error: `Validation error: ${error}` };
    }
  }

  /**
   * Update session data
   * @param sessionId - Session ID
   * @param updates - Partial session data to update
   */
  async updateSession(sessionId: string, updates: Partial<SessionData>): Promise<void> {
    try {
      await this.store.update(sessionId, updates);
    } catch (error) {
      console.error('[SessionManager] Session update failed:', error);
      throw new Error(`Failed to update session: ${error}`);
    }
  }

  /**
   * Terminate session
   * @param sessionId - Session ID
   */
  async terminateSession(sessionId: string): Promise<void> {
    try {
      const session = await this.store.get(sessionId);

      if (session) {
        this.addAuditLog({
          timestamp: Date.now(),
          sessionId,
          userId: session.userContext.userId,
          event: 'terminated',
          ipAddress: session.security.ipAddress,
          userAgent: session.security.userAgent,
        });
      }

      await this.store.delete(sessionId);
      this.metrics.deletedCount++;
      this.metrics.activeSessions--;
    } catch (error) {
      console.error('[SessionManager] Session termination failed:', error);
      throw new Error(`Failed to terminate session: ${error}`);
    }
  }

  /**
   * Regenerate session ID (for session fixation protection)
   * @param oldSessionId - Current session ID
   * @returns New session data
   */
  async regenerateSessionId(oldSessionId: string): Promise<{
    sessionId: string;
    sessionToken: string;
  }> {
    try {
      const session = await this.store.get(oldSessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Generate new session ID and token
      const newSessionId = this.generateSessionId();
      const newSessionToken = this.generateSessionToken();

      // Create new session with updated ID/token
      const newSession: SessionData = {
        ...session,
        sessionId: newSessionId,
        sessionToken: newSessionToken,
      };

      await this.store.create(newSession);
      await this.store.delete(oldSessionId);

      return { sessionId: newSessionId, sessionToken: newSessionToken };
    } catch (error) {
      console.error('[SessionManager] Session regeneration failed:', error);
      throw new Error(`Failed to regenerate session: ${error}`);
    }
  }

  /**
   * Get user's active sessions
   * @param userId - User ID
   * @returns Array of sessions
   */
  async getUserSessions(userId: string): Promise<SessionData[]> {
    try {
      return await this.store.getUserSessions(userId);
    } catch (error) {
      console.error('[SessionManager] Get user sessions failed:', error);
      throw new Error(`Failed to get user sessions: ${error}`);
    }
  }

  /**
   * Enforce concurrent session limit for a user
   * @param userId - User ID
   * @param maxSessions - Maximum allowed sessions
   */
  private async enforceConcurrentSessionLimit(
    userId: string,
    maxSessions: number
  ): Promise<void> {
    const userSessions = await this.store.getUserSessions(userId);

    if (userSessions.length >= maxSessions) {
      // Remove oldest session
      const oldestSession = userSessions.sort((a, b) => a.createdAt - b.createdAt)[0];
      await this.store.delete(oldestSession.sessionId);
    }
  }

  /**
   * Detect potential session hijacking
   * @param session - Session data
   * @param currentIp - Current IP address
   * @param currentUserAgent - Current user agent
   * @returns True if hijacking detected
   */
  private detectSessionHijacking(
    session: SessionData,
    currentIp: string,
    currentUserAgent: string
  ): boolean {
    // Simple detection: IP or user agent changed
    // In production, use more sophisticated fingerprinting
    return (
      session.security.ipAddress !== currentIp ||
      session.security.userAgent !== currentUserAgent
    );
  }

  /**
   * Generate secure session ID
   * @returns Session ID
   */
  private generateSessionId(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Generate secure session token (JWT-like)
   * @returns Session token
   */
  private generateSessionToken(): string {
    // In production, use proper JWT signing
    const payload = {
      iat: Date.now(),
      jti: randomBytes(16).toString('hex'),
    };
    return Buffer.from(JSON.stringify(payload)).toString('base64url');
  }

  /**
   * Start automatic cleanup of expired sessions
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(async () => {
      try {
        const cleaned = await this.store.cleanup();
        this.metrics.expiredSessions += cleaned;
        this.metrics.activeSessions -= cleaned;
        this.metrics.lastCleanupAt = Date.now();
      } catch (error) {
        console.error('[SessionManager] Cleanup failed:', error);
      }
    }, this.config.cleanupInterval);
  }

  /**
   * Stop automatic cleanup
   */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Add audit log entry
   * @param log - Audit log entry
   */
  private addAuditLog(log: SessionAuditLog): void {
    this.auditLogs.push(log);

    // Keep only last 1000 logs in memory
    if (this.auditLogs.length > 1000) {
      this.auditLogs = this.auditLogs.slice(-1000);
    }
  }

  /**
   * Get audit logs
   * @param filters - Optional filters
   * @returns Array of audit logs
   */
  getAuditLogs(filters?: {
    sessionId?: string;
    userId?: string;
    event?: SessionAuditLog['event'];
    since?: number;
  }): SessionAuditLog[] {
    let logs = this.auditLogs;

    if (filters) {
      if (filters.sessionId) {
        logs = logs.filter((log) => log.sessionId === filters.sessionId);
      }
      if (filters.userId) {
        logs = logs.filter((log) => log.userId === filters.userId);
      }
      if (filters.event) {
        logs = logs.filter((log) => log.event === filters.event);
      }
      if (filters.since !== undefined) {
        logs = logs.filter((log) => log.timestamp >= filters.since!);
      }
    }

    return logs;
  }

  /**
   * Get current metrics
   * @returns Session metrics
   */
  getMetrics(): Readonly<SessionMetrics> {
    return { ...this.metrics };
  }
}
