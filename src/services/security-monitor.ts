/**
 * Security monitoring and intrusion detection service
 */

import type {
  SecurityAuditEvent,
  SecurityEventType,
} from '../middleware/security.js';

/**
 * Threat level classification
 */
export type ThreatLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Security incident type
 */
export type IncidentType =
  | 'brute_force'
  | 'sql_injection'
  | 'xss_attempt'
  | 'path_traversal'
  | 'rate_limit_abuse'
  | 'unauthorized_access'
  | 'token_theft'
  | 'suspicious_pattern'
  | 'data_exfiltration';

/**
 * Security incident
 */
export interface SecurityIncident {
  id: string;
  type: IncidentType;
  threatLevel: ThreatLevel;
  timestamp: number;
  sourceIP: string;
  userAgent?: string;
  userId?: string;
  description: string;
  details: Record<string, unknown>;
  resolved: boolean;
  resolvedAt?: number;
  responseAction?: string;
}

/**
 * Threat pattern
 */
interface ThreatPattern {
  type: IncidentType;
  pattern: RegExp | ((event: SecurityAuditEvent) => boolean);
  threatLevel: ThreatLevel;
  description: string;
}

/**
 * IP tracking for threat detection
 */
interface IPThreatTracking {
  failedAttempts: number;
  suspiciousEvents: number;
  lastEventAt: number;
  firstSeenAt: number;
  blockedUntil?: number;
}

/**
 * Security monitoring service configuration
 */
export interface SecurityMonitorConfig {
  maxFailedAttempts?: number;
  suspiciousActivityThreshold?: number;
  blockDuration?: number; // milliseconds
  enableAutoBlock?: boolean;
  alertWebhookUrl?: string;
}

/**
 * Security Monitor - Detects and responds to security threats
 */
export class SecurityMonitor {
  private config: Required<SecurityMonitorConfig>;
  private incidents: SecurityIncident[] = [];
  private ipTracking: Map<string, IPThreatTracking> = new Map();
  private blockedIPs: Set<string> = new Set();
  private threatPatterns: ThreatPattern[] = [];
  private incidentCounter: number = 0;
  private alertHandlers: Array<(incident: SecurityIncident) => void> = [];

  /**
   * Create a new security monitor
   * @param config - Configuration options
   */
  constructor(config?: SecurityMonitorConfig) {
    this.config = {
      maxFailedAttempts: config?.maxFailedAttempts || 5,
      suspiciousActivityThreshold: config?.suspiciousActivityThreshold || 10,
      blockDuration: config?.blockDuration || 15 * 60 * 1000, // 15 minutes
      enableAutoBlock: config?.enableAutoBlock !== false,
      alertWebhookUrl: config?.alertWebhookUrl || '',
    };

    this.initializeThreatPatterns();
    this.startCleanupTimer();
  }

  /**
   * Initialize threat detection patterns
   */
  private initializeThreatPatterns(): void {
    // Brute force detection
    this.threatPatterns.push({
      type: 'brute_force',
      pattern: (event: SecurityAuditEvent) =>
        event.event === 'authentication_failure' && this.getIPFailureCount(event.ipAddress) >= 3,
      threatLevel: 'high',
      description: 'Multiple failed authentication attempts detected',
    });

    // SQL injection patterns
    this.threatPatterns.push({
      type: 'sql_injection',
      pattern: /(\bor\b|\band\b).*?=.*?=|union.*?select|select.*?from|drop.*?table/i,
      threatLevel: 'critical',
      description: 'SQL injection attempt detected',
    });

    // XSS patterns
    this.threatPatterns.push({
      type: 'xss_attempt',
      pattern: /<script|javascript:|on\w+\s*=/i,
      threatLevel: 'high',
      description: 'Cross-site scripting (XSS) attempt detected',
    });

    // Path traversal patterns
    this.threatPatterns.push({
      type: 'path_traversal',
      pattern: /\.\.\//,
      threatLevel: 'high',
      description: 'Path traversal attempt detected',
    });

    // Suspicious activity pattern
    this.threatPatterns.push({
      type: 'suspicious_pattern',
      pattern: (event: SecurityAuditEvent) =>
        event.event === 'suspicious_activity',
      threatLevel: 'medium',
      description: 'Suspicious activity pattern detected',
    });
  }

  /**
   * Process security event
   * @param event - Security audit event
   */
  processEvent(event: SecurityAuditEvent): void {
    const ipAddress = event.ipAddress;

    // Update IP tracking
    this.updateIPTracking(ipAddress, event);

    // Check if IP is blocked
    if (this.isIPBlocked(ipAddress)) {
      console.warn(`[SecurityMonitor] Blocked IP ${ipAddress} attempted access`);
      return;
    }

    // Detect threats
    this.detectThreats(event);

    // Check for brute force
    if (event.event === 'authentication_failure') {
      this.handleAuthenticationFailure(event);
    }

    // Check for rate limit violations
    if (event.event === 'rate_limit_exceeded') {
      this.handleRateLimitViolation(event);
    }
  }

  /**
   * Detect threats in security event
   * @param event - Security audit event
   */
  private detectThreats(event: SecurityAuditEvent): void {
    for (const pattern of this.threatPatterns) {
      let matched = false;

      if (typeof pattern.pattern === 'function') {
        matched = pattern.pattern(event);
      } else if (pattern.pattern instanceof RegExp) {
        // Check event details for pattern matches
        const details = JSON.stringify(event.details || {});
        matched = pattern.pattern.test(details);
      }

      if (matched) {
        this.createIncident({
          type: pattern.type,
          threatLevel: pattern.threatLevel,
          sourceIP: event.ipAddress,
          userAgent: event.userAgent,
          userId: event.userId,
          description: pattern.description,
          details: {
            event: event.event,
            correlationId: event.correlationId,
            eventDetails: event.details,
          },
        });
      }
    }
  }

  /**
   * Handle authentication failure
   * @param event - Security event
   */
  private handleAuthenticationFailure(event: SecurityAuditEvent): void {
    const tracking = this.ipTracking.get(event.ipAddress);
    if (!tracking) return;

    tracking.failedAttempts++;

    if (tracking.failedAttempts >= this.config.maxFailedAttempts) {
      this.createIncident({
        type: 'brute_force',
        threatLevel: 'high',
        sourceIP: event.ipAddress,
        userAgent: event.userAgent,
        userId: event.userId,
        description: `Brute force attack detected: ${tracking.failedAttempts} failed attempts`,
        details: {
          failedAttempts: tracking.failedAttempts,
          firstSeenAt: tracking.firstSeenAt,
        },
      });

      if (this.config.enableAutoBlock) {
        this.blockIP(event.ipAddress, this.config.blockDuration);
      }
    }
  }

  /**
   * Handle rate limit violation
   * @param event - Security event
   */
  private handleRateLimitViolation(event: SecurityAuditEvent): void {
    const tracking = this.ipTracking.get(event.ipAddress);
    if (!tracking) return;

    tracking.suspiciousEvents++;

    const violations = (event.details?.violations as number) || 0;

    if (violations >= 5) {
      this.createIncident({
        type: 'rate_limit_abuse',
        threatLevel: 'medium',
        sourceIP: event.ipAddress,
        userAgent: event.userAgent,
        userId: event.userId,
        description: `Rate limit abuse detected: ${violations} violations`,
        details: {
          violations,
          count: event.details?.count,
          limit: event.details?.limit,
        },
      });

      if (this.config.enableAutoBlock && violations >= 10) {
        this.blockIP(event.ipAddress, this.config.blockDuration);
      }
    }
  }

  /**
   * Create security incident
   * @param incident - Partial incident data
   */
  private createIncident(incident: Omit<SecurityIncident, 'id' | 'timestamp' | 'resolved'>): void {
    const fullIncident: SecurityIncident = {
      id: this.generateIncidentId(),
      timestamp: Date.now(),
      resolved: false,
      ...incident,
    };

    this.incidents.push(fullIncident);

    // Keep only last 10000 incidents
    if (this.incidents.length > 10000) {
      this.incidents = this.incidents.slice(-10000);
    }

    console.warn(
      `[SecurityMonitor] ${fullIncident.threatLevel.toUpperCase()} THREAT: ${fullIncident.description} (${fullIncident.sourceIP})`
    );

    // Notify alert handlers
    this.alertHandlers.forEach((handler) => handler(fullIncident));

    // Send webhook alert for high/critical threats
    if (['high', 'critical'].includes(fullIncident.threatLevel) && this.config.alertWebhookUrl) {
      this.sendWebhookAlert(fullIncident);
    }
  }

  /**
   * Update IP tracking
   * @param ipAddress - IP address
   * @param event - Security event
   */
  private updateIPTracking(ipAddress: string, event: SecurityAuditEvent): void {
    let tracking = this.ipTracking.get(ipAddress);

    if (!tracking) {
      tracking = {
        failedAttempts: 0,
        suspiciousEvents: 0,
        lastEventAt: Date.now(),
        firstSeenAt: Date.now(),
      };
      this.ipTracking.set(ipAddress, tracking);
    }

    tracking.lastEventAt = Date.now();

    // Reset counters on successful login
    if (event.event === 'login_success') {
      tracking.failedAttempts = 0;
      tracking.suspiciousEvents = 0;
    }
  }

  /**
   * Get failure count for IP
   * @param ipAddress - IP address
   * @returns Failure count
   */
  private getIPFailureCount(ipAddress: string): number {
    return this.ipTracking.get(ipAddress)?.failedAttempts || 0;
  }

  /**
   * Block IP address
   * @param ipAddress - IP to block
   * @param duration - Block duration in milliseconds
   */
  blockIP(ipAddress: string, duration: number): void {
    this.blockedIPs.add(ipAddress);

    const tracking = this.ipTracking.get(ipAddress);
    if (tracking) {
      tracking.blockedUntil = Date.now() + duration;
    }

    console.warn(`[SecurityMonitor] Blocked IP ${ipAddress} for ${duration}ms`);

    // Auto-unblock after duration
    setTimeout(() => {
      this.unblockIP(ipAddress);
    }, duration);
  }

  /**
   * Unblock IP address
   * @param ipAddress - IP to unblock
   */
  unblockIP(ipAddress: string): void {
    this.blockedIPs.delete(ipAddress);

    const tracking = this.ipTracking.get(ipAddress);
    if (tracking) {
      tracking.blockedUntil = undefined;
    }

    console.log(`[SecurityMonitor] Unblocked IP ${ipAddress}`);
  }

  /**
   * Check if IP is blocked
   * @param ipAddress - IP to check
   * @returns True if blocked
   */
  isIPBlocked(ipAddress: string): boolean {
    const tracking = this.ipTracking.get(ipAddress);

    if (tracking?.blockedUntil && Date.now() < tracking.blockedUntil) {
      return true;
    }

    return this.blockedIPs.has(ipAddress);
  }

  /**
   * Get all incidents
   * @param filter - Optional filter
   * @returns Filtered incidents
   */
  getIncidents(filter?: {
    type?: IncidentType;
    threatLevel?: ThreatLevel;
    resolved?: boolean;
    since?: number;
  }): SecurityIncident[] {
    let filtered = this.incidents;

    if (filter) {
      if (filter.type) {
        filtered = filtered.filter((i) => i.type === filter.type);
      }
      if (filter.threatLevel) {
        filtered = filtered.filter((i) => i.threatLevel === filter.threatLevel);
      }
      if (filter.resolved !== undefined) {
        filtered = filtered.filter((i) => i.resolved === filter.resolved);
      }
      if (filter.since !== undefined) {
        filtered = filtered.filter((i) => i.timestamp >= filter.since!);
      }
    }

    return filtered;
  }

  /**
   * Resolve incident
   * @param incidentId - Incident ID
   * @param responseAction - Response action taken
   */
  resolveIncident(incidentId: string, responseAction: string): void {
    const incident = this.incidents.find((i) => i.id === incidentId);

    if (incident) {
      incident.resolved = true;
      incident.resolvedAt = Date.now();
      incident.responseAction = responseAction;
      console.log(`[SecurityMonitor] Resolved incident ${incidentId}: ${responseAction}`);
    }
  }

  /**
   * Register alert handler
   * @param handler - Alert handler function
   */
  onAlert(handler: (incident: SecurityIncident) => void): void {
    this.alertHandlers.push(handler);
  }

  /**
   * Send webhook alert
   * @param incident - Security incident
   */
  private async sendWebhookAlert(incident: SecurityIncident): Promise<void> {
    if (!this.config.alertWebhookUrl) return;

    try {
      await fetch(this.config.alertWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          severity: incident.threatLevel,
          type: incident.type,
          message: incident.description,
          timestamp: incident.timestamp,
          source_ip: incident.sourceIP,
          details: incident.details,
        }),
      });
    } catch (error) {
      console.error('[SecurityMonitor] Failed to send webhook alert:', error);
    }
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    // Clean up old tracking data every hour
    setInterval(() => {
      const now = Date.now();
      const oneHourAgo = now - 60 * 60 * 1000;

      for (const [ip, tracking] of this.ipTracking.entries()) {
        if (tracking.lastEventAt < oneHourAgo) {
          this.ipTracking.delete(ip);
        }
      }
    }, 60 * 60 * 1000);
  }

  /**
   * Generate incident ID
   * @returns Unique incident ID
   */
  private generateIncidentId(): string {
    return `incident-${Date.now()}-${++this.incidentCounter}`;
  }

  /**
   * Get security metrics
   */
  getMetrics(): {
    totalIncidents: number;
    unresolvedIncidents: number;
    blockedIPs: number;
    trackedIPs: number;
    incidentsByThreatLevel: Record<ThreatLevel, number>;
    incidentsByType: Record<string, number>;
  } {
    const incidentsByThreatLevel: Record<ThreatLevel, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    const incidentsByType: Record<string, number> = {};

    for (const incident of this.incidents) {
      incidentsByThreatLevel[incident.threatLevel]++;
      incidentsByType[incident.type] = (incidentsByType[incident.type] || 0) + 1;
    }

    return {
      totalIncidents: this.incidents.length,
      unresolvedIncidents: this.incidents.filter((i) => !i.resolved).length,
      blockedIPs: this.blockedIPs.size,
      trackedIPs: this.ipTracking.size,
      incidentsByThreatLevel,
      incidentsByType,
    };
  }
}
