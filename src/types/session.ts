/**
 * Session management types and interfaces
 */

import type { AuthenticationResult } from '@azure/msal-node';

/**
 * User context stored in session
 */
export interface UserContext {
  userId: string;
  email?: string;
  name?: string;
  tenantId?: string;
  roles?: string[];
}

/**
 * Token metadata
 */
export interface TokenMetadata {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt: number;
  scopes: string[];
}

/**
 * Security tracking information
 */
export interface SecurityTracking {
  ipAddress: string;
  userAgent: string;
  createdAt: number;
  lastAccessedAt: number;
  accessCount: number;
  fingerprint?: string;
}

/**
 * Complete session data structure
 */
export interface SessionData {
  sessionId: string;
  sessionToken: string; // JWT session token
  userContext: UserContext;
  tokenMetadata: TokenMetadata;
  security: SecurityTracking;
  expiresAt: number;
  createdAt: number;
}

/**
 * Session store interface - all storage backends must implement this
 */
export interface ISessionStore {
  /**
   * Create a new session
   * @param sessionData - Session data to store
   * @returns Session ID
   */
  create(sessionData: SessionData): Promise<string>;

  /**
   * Get session by ID
   * @param sessionId - Session ID
   * @returns Session data or null if not found
   */
  get(sessionId: string): Promise<SessionData | null>;

  /**
   * Update existing session
   * @param sessionId - Session ID
   * @param sessionData - Updated session data
   */
  update(sessionId: string, sessionData: Partial<SessionData>): Promise<void>;

  /**
   * Delete session by ID
   * @param sessionId - Session ID
   */
  delete(sessionId: string): Promise<void>;

  /**
   * Clean up expired sessions
   * @returns Number of sessions cleaned up
   */
  cleanup(): Promise<number>;

  /**
   * Get all active sessions for a user
   * @param userId - User ID
   * @returns Array of session data
   */
  getUserSessions(userId: string): Promise<SessionData[]>;

  /**
   * Get session count
   * @returns Total number of active sessions
   */
  getSessionCount(): Promise<number>;
}

/**
 * Session configuration options
 */
export interface SessionConfig {
  storageBackend?: 'memory' | 'file' | 'redis';
  sessionTimeout?: number; // milliseconds
  cleanupInterval?: number; // milliseconds
  maxConcurrentSessions?: number; // per user
  allowMultipleSessions?: boolean; // allow multiple sessions per user
  maxSessionsPerUser?: number; // maximum sessions per user
  encryptionKey?: string; // for file storage
  redisConfig?: {
    host: string;
    port: number;
    password?: string;
    keyPrefix?: string;
    cluster?: boolean;
    clusterNodes?: Array<{ host: string; port: number }>;
  };
  fileConfig?: {
    storageDir: string;
  };
}

/**
 * Session metrics for monitoring
 */
export interface SessionMetrics {
  totalSessions: number;
  activeSessions: number;
  expiredSessions: number;
  createdCount: number;
  deletedCount: number;
  validationCount: number;
  validationFailureCount: number;
  lastCleanupAt?: number;
}

/**
 * Session validation result
 */
export interface SessionValidationResult {
  valid: boolean;
  session?: SessionData;
  error?: string;
  requiresRefresh?: boolean;
}

/**
 * Audit log entry for session events
 */
export interface SessionAuditLog {
  timestamp: number;
  sessionId: string;
  userId: string;
  event: 'created' | 'validated' | 'refreshed' | 'expired' | 'terminated' | 'hijack_detected';
  ipAddress: string;
  userAgent: string;
  details?: Record<string, unknown>;
}
