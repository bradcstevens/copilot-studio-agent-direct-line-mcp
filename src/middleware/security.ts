/**
 * Security middleware for token validation, authentication, and audit logging
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { SessionManager } from '../services/session-manager.js';
import type { EntraIDClient } from '../services/entraid-client.js';
import type { SessionData } from '../types/session.js';

/**
 * Token validation result
 */
export interface TokenValidationResult {
  valid: boolean;
  payload?: any;
  error?: string;
}

/**
 * Security event types
 */
export type SecurityEventType =
  | 'login_success'
  | 'login_failure'
  | 'token_refresh'
  | 'authentication_failure'
  | 'suspicious_activity'
  | 'token_revoked'
  | 'rate_limit_exceeded';

/**
 * Security audit event
 */
export interface SecurityAuditEvent {
  timestamp: number;
  event: SecurityEventType;
  userId?: string;
  ipAddress: string;
  userAgent: string;
  details?: Record<string, unknown>;
  correlationId: string;
}

/**
 * Token blacklist entry
 */
interface BlacklistEntry {
  token: string;
  reason: string;
  expiresAt: number;
}

/**
 * Rate limit entry
 */
interface RateLimitEntry {
  count: number;
  resetAt: number;
  violations: number;
}

/**
 * TokenValidator - Comprehensive token validation for JWT and Entra ID tokens
 */
export class TokenValidator {
  private jwtSecret: string;
  private blacklist: Map<string, BlacklistEntry> = new Map();

  /**
   * Create a new TokenValidator
   * @param jwtSecret - Secret for JWT validation
   */
  constructor(jwtSecret: string) {
    this.jwtSecret = jwtSecret;

    // Periodic cleanup of expired blacklist entries
    setInterval(() => this.cleanupBlacklist(), 60 * 60 * 1000); // 1 hour
  }

  /**
   * Validate JWT token
   * @param token - JWT token to validate
   * @returns Validation result
   */
  validateJWT(token: string): TokenValidationResult {
    try {
      // Check if token is blacklisted
      if (this.isBlacklisted(token)) {
        return {
          valid: false,
          error: 'Token has been revoked',
        };
      }

      const payload = jwt.verify(token, this.jwtSecret);

      return {
        valid: true,
        payload,
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return {
          valid: false,
          error: 'Token expired',
        };
      }

      if (error instanceof jwt.JsonWebTokenError) {
        return {
          valid: false,
          error: 'Invalid token signature',
        };
      }

      return {
        valid: false,
        error: `Token validation failed: ${error}`,
      };
    }
  }

  /**
   * Validate Entra ID token
   * Note: This is a simplified version. In production, verify against Microsoft's public keys
   * @param token - Entra ID token
   * @returns Validation result
   */
  validateEntraToken(token: string): TokenValidationResult {
    try {
      // Check if token is blacklisted
      if (this.isBlacklisted(token)) {
        return {
          valid: false,
          error: 'Token has been revoked',
        };
      }

      // Decode without verification (for demo purposes)
      // In production, verify against Microsoft's JWKS
      const decoded = jwt.decode(token, { complete: true });

      if (!decoded) {
        return {
          valid: false,
          error: 'Failed to decode token',
        };
      }

      // Basic validation
      const payload = decoded.payload as any;

      // Check expiration
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        return {
          valid: false,
          error: 'Token expired',
        };
      }

      return {
        valid: true,
        payload,
      };
    } catch (error) {
      return {
        valid: false,
        error: `Entra ID token validation failed: ${error}`,
      };
    }
  }

  /**
   * Get token claims
   * @param token - Token to decode
   * @returns Token claims
   */
  getTokenClaims(token: string): any | null {
    try {
      return jwt.decode(token);
    } catch (error) {
      console.error('[TokenValidator] Failed to decode token:', error);
      return null;
    }
  }

  /**
   * Blacklist a token
   * @param token - Token to blacklist
   * @param reason - Reason for blacklisting
   * @param expiresAt - Expiration timestamp
   */
  blacklistToken(token: string, reason: string, expiresAt: number): void {
    this.blacklist.set(token, {
      token,
      reason,
      expiresAt,
    });
  }

  /**
   * Check if token is blacklisted
   * @param token - Token to check
   * @returns True if blacklisted
   */
  isBlacklisted(token: string): boolean {
    const entry = this.blacklist.get(token);

    if (!entry) {
      return false;
    }

    // Check if entry has expired
    if (Date.now() >= entry.expiresAt) {
      this.blacklist.delete(token);
      return false;
    }

    return true;
  }

  /**
   * Clean up expired blacklist entries
   */
  private cleanupBlacklist(): void {
    const now = Date.now();

    for (const [token, entry] of this.blacklist.entries()) {
      if (now >= entry.expiresAt) {
        this.blacklist.delete(token);
      }
    }
  }

  /**
   * Get blacklist size
   */
  getBlacklistSize(): number {
    return this.blacklist.size;
  }
}

/**
 * Security middleware factory
 */
export class SecurityMiddleware {
  private tokenValidator: TokenValidator;
  private sessionManager: SessionManager;
  private entraidClient: EntraIDClient;
  private auditLogs: SecurityAuditEvent[] = [];
  private rateLimits: Map<string, RateLimitEntry> = new Map();
  private suspiciousActivity: Map<string, number> = new Map();

  /**
   * Create security middleware
   * @param tokenValidator - Token validator instance
   * @param sessionManager - Session manager instance
   * @param entraidClient - Entra ID client instance
   */
  constructor(
    tokenValidator: TokenValidator,
    sessionManager: SessionManager,
    entraidClient: EntraIDClient
  ) {
    this.tokenValidator = tokenValidator;
    this.sessionManager = sessionManager;
    this.entraidClient = entraidClient;

    // Periodic cleanup
    setInterval(() => this.cleanupRateLimits(), 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Require authentication middleware
   */
  requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const correlationId = this.generateCorrelationId();
      (req as any).correlationId = correlationId;

      // Extract session from Express session or Authorization header
      const sessionId = (req.session as any)?.sessionId;
      const sessionToken = (req.session as any)?.sessionToken;

      if (!sessionId || !sessionToken) {
        this.logSecurityEvent({
          timestamp: Date.now(),
          event: 'authentication_failure',
          ipAddress: req.ip || '',
          userAgent: req.get('user-agent') || '',
          correlationId,
          details: { reason: 'No session credentials' },
        });

        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      // Validate session
      const validation = await this.sessionManager.validateSession(
        sessionId,
        sessionToken,
        req.ip || '',
        req.get('user-agent') || ''
      );

      if (!validation.valid || !validation.session) {
        this.logSecurityEvent({
          timestamp: Date.now(),
          event: 'authentication_failure',
          ipAddress: req.ip || '',
          userAgent: req.get('user-agent') || '',
          correlationId,
          details: { reason: validation.error || 'Invalid session' },
        });

        res.status(401).json({ error: 'Invalid or expired session' });
        return;
      }

      // Attach session to request
      (req as any).mcpSession = validation.session;
      (req as any).requiresRefresh = validation.requiresRefresh;

      next();
    } catch (error) {
      console.error('[SecurityMiddleware] requireAuth failed:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  };

  /**
   * Require valid token middleware with automatic refresh
   */
  requireValidToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const session: SessionData = (req as any).mcpSession;
      const correlationId: string = (req as any).correlationId;

      if (!session) {
        res.status(401).json({ error: 'No session found' });
        return;
      }

      const { tokenMetadata } = session;
      const now = Date.now();
      const expiresIn = tokenMetadata.expiresAt - now;

      // Check if token needs refresh (within 5 minutes of expiration)
      if (expiresIn < 5 * 60 * 1000 && tokenMetadata.refreshToken) {
        try {
          // Refresh the token
          const authResult = await this.entraidClient.refreshAccessToken(
            tokenMetadata.refreshToken
          );

          // Update session with new tokens
          await this.sessionManager.updateSession(session.sessionId, {
            tokenMetadata: {
              ...tokenMetadata,
              accessToken: authResult.accessToken,
              refreshToken: (authResult as any).refreshToken || tokenMetadata.refreshToken,
              expiresAt: authResult.expiresOn ? authResult.expiresOn.getTime() : now + 3600000,
            },
          });

          this.logSecurityEvent({
            timestamp: Date.now(),
            event: 'token_refresh',
            userId: session.userContext.userId,
            ipAddress: req.ip || '',
            userAgent: req.get('user-agent') || '',
            correlationId,
          });

          // Update request with new token
          (req as any).mcpSession.tokenMetadata = {
            ...tokenMetadata,
            accessToken: authResult.accessToken,
            refreshToken: (authResult as any).refreshToken || tokenMetadata.refreshToken,
            expiresAt: authResult.expiresOn ? authResult.expiresOn.getTime() : now + 3600000,
          };
        } catch (error) {
          console.error('[SecurityMiddleware] Token refresh failed:', error);
          res.status(401).json({ error: 'Token refresh failed' });
          return;
        }
      } else if (expiresIn < 0) {
        // Token already expired
        res.status(401).json({ error: 'Access token expired' });
        return;
      }

      next();
    } catch (error) {
      console.error('[SecurityMiddleware] requireValidToken failed:', error);
      res.status(500).json({ error: 'Token validation failed' });
    }
  };

  /**
   * Audit logging middleware
   */
  auditLog = (req: Request, res: Response, next: NextFunction): void => {
    const start = Date.now();
    const correlationId = (req as any).correlationId || this.generateCorrelationId();
    (req as any).correlationId = correlationId;

    // Log on response finish
    res.on('finish', () => {
      const duration = Date.now() - start;
      const session: SessionData | undefined = (req as any).mcpSession;

      this.logSecurityEvent({
        timestamp: Date.now(),
        event: res.statusCode >= 400 ? 'authentication_failure' : 'login_success',
        userId: session?.userContext.userId,
        ipAddress: req.ip || '',
        userAgent: req.get('user-agent') || '',
        correlationId,
        details: {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
        },
      });
    });

    next();
  };

  /**
   * Rate limiting middleware (per user)
   */
  rateLimitPerUser = (maxRequests: number = 100, windowMs: number = 60000) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const session: SessionData | undefined = (req as any).mcpSession;
      const userId = session?.userContext.userId || req.ip || 'anonymous';

      const now = Date.now();
      let entry = this.rateLimits.get(userId);

      if (!entry || now >= entry.resetAt) {
        // Reset rate limit
        entry = {
          count: 0,
          resetAt: now + windowMs,
          violations: 0,
        };
        this.rateLimits.set(userId, entry);
      }

      entry.count++;

      if (entry.count > maxRequests) {
        entry.violations++;

        this.logSecurityEvent({
          timestamp: Date.now(),
          event: 'rate_limit_exceeded',
          userId: session?.userContext.userId,
          ipAddress: req.ip || '',
          userAgent: req.get('user-agent') || '',
          correlationId: (req as any).correlationId,
          details: {
            count: entry.count,
            limit: maxRequests,
            violations: entry.violations,
          },
        });

        res.status(429).json({
          error: 'Too many requests',
          retryAfter: Math.ceil((entry.resetAt - now) / 1000),
        });
        return;
      }

      next();
    };
  };

  /**
   * Suspicious activity detection middleware
   */
  detectSuspiciousActivity = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const ipAddress = req.ip || '';
    const now = Date.now();

    // Track failed authentication attempts
    if (res.statusCode === 401 || res.statusCode === 403) {
      const attempts = this.suspiciousActivity.get(ipAddress) || 0;
      this.suspiciousActivity.set(ipAddress, attempts + 1);

      // Alert on multiple failures
      if (attempts + 1 >= 5) {
        this.logSecurityEvent({
          timestamp: now,
          event: 'suspicious_activity',
          ipAddress,
          userAgent: req.get('user-agent') || '',
          correlationId: (req as any).correlationId,
          details: {
            reason: 'Multiple failed authentication attempts',
            attempts: attempts + 1,
          },
        });

        // Temporary lockout
        setTimeout(() => {
          this.suspiciousActivity.delete(ipAddress);
        }, 15 * 60 * 1000); // 15 minutes
      }
    }

    next();
  };

  /**
   * Log security event
   */
  private logSecurityEvent(event: SecurityAuditEvent): void {
    this.auditLogs.push(event);

    // Keep only last 10000 events in memory
    if (this.auditLogs.length > 10000) {
      this.auditLogs = this.auditLogs.slice(-10000);
    }

    // Log to console (in production, send to logging service)
    console.log(
      `[Security] ${event.event} - User: ${event.userId || 'anonymous'} - IP: ${event.ipAddress} - Correlation: ${event.correlationId}`
    );
  }

  /**
   * Get audit logs
   */
  getAuditLogs(filter?: {
    userId?: string;
    event?: SecurityEventType;
    since?: number;
  }): SecurityAuditEvent[] {
    let logs = this.auditLogs;

    if (filter) {
      if (filter.userId) {
        logs = logs.filter((log) => log.userId === filter.userId);
      }
      if (filter.event) {
        logs = logs.filter((log) => log.event === filter.event);
      }
      if (filter.since !== undefined) {
        logs = logs.filter((log) => log.timestamp >= filter.since!);
      }
    }

    return logs;
  }

  /**
   * Generate correlation ID
   */
  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up expired rate limits
   */
  private cleanupRateLimits(): void {
    const now = Date.now();

    for (const [userId, entry] of this.rateLimits.entries()) {
      if (now >= entry.resetAt) {
        this.rateLimits.delete(userId);
      }
    }
  }

  /**
   * Get security metrics
   */
  getMetrics(): {
    auditLogCount: number;
    rateLimitCount: number;
    suspiciousIPs: number;
    blacklistedTokens: number;
  } {
    return {
      auditLogCount: this.auditLogs.length,
      rateLimitCount: this.rateLimits.size,
      suspiciousIPs: this.suspiciousActivity.size,
      blacklistedTokens: this.tokenValidator.getBlacklistSize(),
    };
  }
}
