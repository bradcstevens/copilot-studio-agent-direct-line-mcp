/**
 * Comprehensive error handling types and classes
 */

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'LOW', // Minor issues, can continue
  MEDIUM = 'MEDIUM', // Degraded functionality
  HIGH = 'HIGH', // Critical errors, cannot continue
  CRITICAL = 'CRITICAL', // System-wide failure
}

/**
 * Error categories for classification
 */
export enum ErrorCategory {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  RATE_LIMIT = 'RATE_LIMIT',
  TIMEOUT = 'TIMEOUT',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  CONFIGURATION = 'CONFIGURATION',
  CIRCUIT_BREAKER = 'CIRCUIT_BREAKER',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Retry strategy options
 */
export interface RetryStrategy {
  maxRetries: number;
  initialDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number; // exponential backoff factor
  retryableStatuses?: number[]; // HTTP status codes that should trigger retry
}

/**
 * Error context information
 */
export interface ErrorContext {
  category: ErrorCategory;
  severity: ErrorSeverity;
  retryable: boolean;
  retryStrategy?: RetryStrategy;
  userMessage?: string; // User-friendly message
  recoveryAction?: string; // Suggested recovery action
  metadata?: Record<string, unknown>;
}

/**
 * Base application error with enhanced context
 */
export class ApplicationError extends Error {
  public readonly context: ErrorContext;
  public readonly timestamp: Date;
  public readonly originalError?: Error;

  constructor(message: string, context: Partial<ErrorContext> = {}, originalError?: Error) {
    super(message);
    this.name = 'ApplicationError';
    this.timestamp = new Date();
    this.originalError = originalError;

    // Default context values
    this.context = {
      category: context.category || ErrorCategory.UNKNOWN,
      severity: context.severity || ErrorSeverity.MEDIUM,
      retryable: context.retryable ?? false,
      retryStrategy: context.retryStrategy,
      userMessage: context.userMessage,
      recoveryAction: context.recoveryAction,
      metadata: context.metadata,
    };
  }

  /**
   * Convert error to MCP-compatible error object
   */
  toMCPError(): {
    code: string;
    message: string;
    data?: {
      severity?: string;
      retryable?: boolean;
      recoveryAction?: string;
      timestamp?: string;
      [key: string]: unknown;
    };
  } {
    return {
      code: this.context.category,
      message: this.context.userMessage || this.message,
      data: {
        severity: this.context.severity,
        retryable: this.context.retryable,
        recoveryAction: this.context.recoveryAction,
        timestamp: this.timestamp.toISOString(),
        ...(this.context.metadata || {}),
      },
    };
  }
}

/**
 * Authentication-specific errors (401 Unauthorized)
 */
export class AuthenticationError extends ApplicationError {
  constructor(message: string, metadata?: Record<string, unknown>, originalError?: Error) {
    super(
      message,
      {
        category: ErrorCategory.AUTHENTICATION,
        severity: ErrorSeverity.HIGH,
        retryable: false,
        userMessage: 'Authentication failed. Please log in again.',
        recoveryAction: 'Re-authenticate using the OAuth flow',
        metadata,
      },
      originalError
    );
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization-specific errors (403 Forbidden)
 */
export class AuthorizationError extends ApplicationError {
  constructor(message: string, metadata?: Record<string, unknown>, originalError?: Error) {
    super(
      message,
      {
        category: ErrorCategory.AUTHORIZATION,
        severity: ErrorSeverity.HIGH,
        retryable: false,
        userMessage: 'You do not have permission to access this resource.',
        recoveryAction: 'Request appropriate permissions or contact an administrator',
        metadata,
      },
      originalError
    );
    this.name = 'AuthorizationError';
  }
}

/**
 * OAuth-specific errors
 */
export class OAuthError extends ApplicationError {
  public readonly oauthErrorCode?: string;
  public readonly oauthErrorDescription?: string;

  constructor(
    message: string,
    oauthErrorCode?: string,
    oauthErrorDescription?: string,
    metadata?: Record<string, unknown>,
    originalError?: Error
  ) {
    const retryable = OAuthError.isRetryable(oauthErrorCode);
    const recoveryAction = OAuthError.getRecoveryAction(oauthErrorCode);

    super(
      message,
      {
        category: ErrorCategory.AUTHENTICATION,
        severity: ErrorSeverity.HIGH,
        retryable,
        retryStrategy: retryable
          ? {
              maxRetries: 3,
              initialDelay: 1000,
              maxDelay: 10000,
              backoffMultiplier: 2,
            }
          : undefined,
        userMessage: oauthErrorDescription || 'OAuth authentication failed',
        recoveryAction,
        metadata: {
          ...metadata,
          oauthErrorCode,
          oauthErrorDescription,
        },
      },
      originalError
    );
    this.name = 'OAuthError';
    this.oauthErrorCode = oauthErrorCode;
    this.oauthErrorDescription = oauthErrorDescription;
  }

  /**
   * Determine if OAuth error is retryable
   */
  private static isRetryable(errorCode?: string): boolean {
    if (!errorCode) return false;

    const retryableErrors = [
      'temporarily_unavailable',
      'server_error',
      'service_unavailable',
      'timeout',
    ];

    return retryableErrors.includes(errorCode);
  }

  /**
   * Get recovery action for OAuth error
   */
  private static getRecoveryAction(errorCode?: string): string {
    const recoveryActions: Record<string, string> = {
      invalid_grant: 'Re-authenticate - your session has expired',
      invalid_client: 'Check OAuth client configuration',
      unauthorized_client: 'Verify application permissions in Azure portal',
      access_denied: 'User denied authorization - retry or contact administrator',
      temporarily_unavailable: 'Wait and retry - authentication service is temporarily down',
      server_error: 'Wait and retry - server encountered an error',
      invalid_scope: 'Check requested OAuth scopes in configuration',
    };

    return recoveryActions[errorCode || ''] || 'Re-authenticate to resolve the issue';
  }
}

/**
 * Token refresh-specific errors
 */
export class TokenRefreshError extends ApplicationError {
  constructor(message: string, metadata?: Record<string, unknown>, originalError?: Error) {
    super(
      message,
      {
        category: ErrorCategory.AUTHENTICATION,
        severity: ErrorSeverity.HIGH,
        retryable: true,
        retryStrategy: {
          maxRetries: 3,
          initialDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2,
        },
        userMessage: 'Session refresh failed. You may need to log in again.',
        recoveryAction: 'Retry token refresh or re-authenticate if retries fail',
        metadata,
      },
      originalError
    );
    this.name = 'TokenRefreshError';
  }
}

/**
 * Network-related errors
 */
export class NetworkError extends ApplicationError {
  constructor(message: string, metadata?: Record<string, unknown>, originalError?: Error) {
    super(
      message,
      {
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        retryable: true,
        retryStrategy: {
          maxRetries: 5,
          initialDelay: 1000,
          maxDelay: 30000,
          backoffMultiplier: 2,
        },
        userMessage: 'Network connection issue. Retrying...',
        recoveryAction: 'Check network connectivity and retry',
        metadata,
      },
      originalError
    );
    this.name = 'NetworkError';
  }
}

/**
 * Rate limit errors
 */
export class RateLimitError extends ApplicationError {
  public readonly retryAfter?: number; // seconds

  constructor(
    message: string,
    retryAfter?: number,
    metadata?: Record<string, unknown>,
    originalError?: Error
  ) {
    const retryDelay = (retryAfter || 60) * 1000; // Convert to milliseconds

    super(
      message,
      {
        category: ErrorCategory.RATE_LIMIT,
        severity: ErrorSeverity.MEDIUM,
        retryable: true,
        retryStrategy: {
          maxRetries: 3,
          initialDelay: retryDelay,
          maxDelay: retryDelay,
          backoffMultiplier: 1, // Fixed delay based on Retry-After header
        },
        userMessage: `Rate limit exceeded. Please wait ${retryAfter || 60} seconds.`,
        recoveryAction: `Wait ${retryAfter || 60} seconds before retrying`,
        metadata: {
          ...metadata,
          retryAfter,
        },
      },
      originalError
    );
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Service unavailable errors (503)
 */
export class ServiceUnavailableError extends ApplicationError {
  constructor(message: string, metadata?: Record<string, unknown>, originalError?: Error) {
    super(
      message,
      {
        category: ErrorCategory.SERVICE_UNAVAILABLE,
        severity: ErrorSeverity.HIGH,
        retryable: true,
        retryStrategy: {
          maxRetries: 5,
          initialDelay: 5000,
          maxDelay: 60000,
          backoffMultiplier: 2,
        },
        userMessage: 'Service is temporarily unavailable. Retrying...',
        recoveryAction: 'Wait for service to recover, automatic retries in progress',
        metadata,
      },
      originalError
    );
    this.name = 'ServiceUnavailableError';
  }
}

/**
 * Timeout errors
 */
export class TimeoutError extends ApplicationError {
  constructor(message: string, metadata?: Record<string, unknown>, originalError?: Error) {
    super(
      message,
      {
        category: ErrorCategory.TIMEOUT,
        severity: ErrorSeverity.MEDIUM,
        retryable: true,
        retryStrategy: {
          maxRetries: 3,
          initialDelay: 2000,
          maxDelay: 15000,
          backoffMultiplier: 2,
        },
        userMessage: 'Request timed out. Retrying...',
        recoveryAction: 'Retry with automatic timeout handling',
        metadata,
      },
      originalError
    );
    this.name = 'TimeoutError';
  }
}

/**
 * Circuit breaker errors
 */
export class CircuitBreakerError extends ApplicationError {
  constructor(message: string, metadata?: Record<string, unknown>) {
    super(message, {
      category: ErrorCategory.CIRCUIT_BREAKER,
      severity: ErrorSeverity.HIGH,
      retryable: false,
      userMessage: 'Service is experiencing issues. Please try again later.',
      recoveryAction: 'Wait for circuit breaker to recover before retrying',
      metadata,
    });
    this.name = 'CircuitBreakerError';
  }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends ApplicationError {
  constructor(message: string, metadata?: Record<string, unknown>, originalError?: Error) {
    super(
      message,
      {
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.CRITICAL,
        retryable: false,
        userMessage: 'Application configuration error. Please contact support.',
        recoveryAction: 'Check environment configuration and restart application',
        metadata,
      },
      originalError
    );
    this.name = 'ConfigurationError';
  }
}

/**
 * Validation errors
 */
export class ValidationError extends ApplicationError {
  constructor(message: string, metadata?: Record<string, unknown>, originalError?: Error) {
    super(
      message,
      {
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        retryable: false,
        userMessage: 'Invalid input provided.',
        recoveryAction: 'Check input and try again',
        metadata,
      },
      originalError
    );
    this.name = 'ValidationError';
  }
}
