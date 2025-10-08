/**
 * Error transformation utilities for MCP responses
 */

import { AxiosError } from 'axios';
import {
  ApplicationError,
  AuthenticationError,
  AuthorizationError,
  OAuthError,
  TokenRefreshError,
  NetworkError,
  RateLimitError,
  ServiceUnavailableError,
  TimeoutError,
  CircuitBreakerError as CircuitBreakerAppError,
  ConfigurationError,
  ValidationError,
  ErrorCategory,
  ErrorSeverity,
} from '../types/errors.js';
import { CircuitBreakerError } from './circuit-breaker.js';

/**
 * MCP error response format
 */
export interface MCPError {
  code: string;
  message: string;
  data?: {
    severity?: string;
    retryable?: boolean;
    recoveryAction?: string;
    timestamp?: string;
    [key: string]: unknown;
  };
}

/**
 * Transform any error to MCP-compatible format
 *
 * @param error - Error to transform
 * @param context - Additional context to include
 * @returns MCP error object
 */
export function transformToMCPError(error: unknown, context?: Record<string, unknown>): MCPError {
  // If it's already an ApplicationError, use its built-in transformation
  if (error instanceof ApplicationError) {
    const mcpError = error.toMCPError();
    return {
      ...mcpError,
      data: {
        ...(mcpError.data || {}),
        ...context,
      },
    };
  }

  // Handle CircuitBreakerError from circuit-breaker.ts
  if (error instanceof CircuitBreakerError) {
    return {
      code: ErrorCategory.CIRCUIT_BREAKER,
      message: 'Service temporarily unavailable due to circuit breaker',
      data: {
        severity: ErrorSeverity.HIGH,
        retryable: false,
        recoveryAction: 'Wait for circuit breaker to recover before retrying',
        timestamp: new Date().toISOString(),
        state: error.state,
        metrics: error.metrics,
        ...context,
      },
    };
  }

  // Handle AxiosError (HTTP client errors)
  if (error instanceof AxiosError) {
    return transformAxiosError(error, context);
  }

  // Handle generic Error
  if (error instanceof Error) {
    return {
      code: ErrorCategory.UNKNOWN,
      message: error.message || 'An unexpected error occurred',
      data: {
        severity: ErrorSeverity.MEDIUM,
        retryable: false,
        recoveryAction: 'Contact support if the issue persists',
        timestamp: new Date().toISOString(),
        errorName: error.name,
        ...context,
      },
    };
  }

  // Handle non-Error objects
  return {
    code: ErrorCategory.UNKNOWN,
    message: String(error) || 'An unexpected error occurred',
    data: {
      severity: ErrorSeverity.MEDIUM,
      retryable: false,
      recoveryAction: 'Contact support if the issue persists',
      timestamp: new Date().toISOString(),
      ...context,
    },
  };
}

/**
 * Transform AxiosError to MCP format
 *
 * @param error - Axios error
 * @param context - Additional context
 * @returns MCP error object
 */
function transformAxiosError(error: AxiosError, context?: Record<string, unknown>): MCPError {
  const status = error.response?.status;
  const statusText = error.response?.statusText;
  const responseData = error.response?.data as Record<string, unknown> | undefined;

  // Handle authentication errors (401)
  if (status === 401) {
    const authError = new AuthenticationError(
      `Authentication failed: ${statusText || 'Unauthorized'}`,
      {
        status,
        url: error.config?.url,
        method: error.config?.method,
        responseData,
      }
    );
    return authError.toMCPError();
  }

  // Handle authorization errors (403)
  if (status === 403) {
    const authzError = new AuthorizationError(
      `Authorization failed: ${statusText || 'Forbidden'}`,
      {
        status,
        url: error.config?.url,
        method: error.config?.method,
        responseData,
      }
    );
    return authzError.toMCPError();
  }

  // Handle rate limiting (429)
  if (status === 429) {
    const retryAfter = error.response?.headers?.['retry-after'];
    const retrySeconds = retryAfter ? parseInt(retryAfter, 10) : undefined;

    const rateLimitError = new RateLimitError(
      'Rate limit exceeded',
      retrySeconds,
      {
        status,
        url: error.config?.url,
        method: error.config?.method,
        responseData,
      }
    );
    return rateLimitError.toMCPError();
  }

  // Handle service unavailable (503)
  if (status === 503) {
    const serviceError = new ServiceUnavailableError(
      `Service unavailable: ${statusText || 'Service Unavailable'}`,
      {
        status,
        url: error.config?.url,
        method: error.config?.method,
        responseData,
      }
    );
    return serviceError.toMCPError();
  }

  // Handle server errors (5xx)
  if (status && status >= 500) {
    return {
      code: ErrorCategory.SERVICE_UNAVAILABLE,
      message: `Server error: ${statusText || 'Internal Server Error'}`,
      data: {
        severity: ErrorSeverity.HIGH,
        retryable: true,
        recoveryAction: 'Retry after a brief delay - automatic retries in progress',
        timestamp: new Date().toISOString(),
        status,
        url: error.config?.url,
        method: error.config?.method,
        responseData,
        ...context,
      },
    };
  }

  // Handle network errors (no response)
  if (!error.response) {
    const networkError = new NetworkError(
      error.message || 'Network error occurred',
      {
        url: error.config?.url,
        method: error.config?.method,
        code: error.code,
      }
    );
    return networkError.toMCPError();
  }

  // Handle client errors (4xx)
  if (status && status >= 400) {
    return {
      code: ErrorCategory.VALIDATION,
      message: `Client error: ${statusText || 'Bad Request'}`,
      data: {
        severity: ErrorSeverity.LOW,
        retryable: false,
        recoveryAction: 'Check request parameters and try again',
        timestamp: new Date().toISOString(),
        status,
        url: error.config?.url,
        method: error.config?.method,
        responseData,
        ...context,
      },
    };
  }

  // Fallback for other errors
  return {
    code: ErrorCategory.UNKNOWN,
    message: error.message || 'HTTP request failed',
    data: {
      severity: ErrorSeverity.MEDIUM,
      retryable: false,
      recoveryAction: 'Contact support if the issue persists',
      timestamp: new Date().toISOString(),
      status,
      url: error.config?.url,
      method: error.config?.method,
      responseData,
      ...context,
    },
  };
}

/**
 * Transform OAuth-specific errors with enhanced context
 *
 * @param error - Error from OAuth flow
 * @param flowContext - OAuth flow context (auth code, token refresh, etc.)
 * @returns MCP error object with OAuth context
 */
export function transformOAuthError(
  error: unknown,
  flowContext: {
    flow: 'authorization' | 'token_exchange' | 'token_refresh';
    step?: string;
  }
): MCPError {
  // Check if error contains OAuth error information
  const errorData = error as {
    error?: string;
    error_description?: string;
    error_uri?: string;
  };

  if (errorData.error) {
    const oauthError = new OAuthError(
      `OAuth ${flowContext.flow} failed${flowContext.step ? ` at ${flowContext.step}` : ''}`,
      errorData.error,
      errorData.error_description,
      {
        flow: flowContext.flow,
        step: flowContext.step,
        error_uri: errorData.error_uri,
      }
    );
    return oauthError.toMCPError();
  }

  // Handle token refresh failures specifically
  if (flowContext.flow === 'token_refresh') {
    const refreshError = new TokenRefreshError(
      error instanceof Error ? error.message : 'Token refresh failed',
      {
        flow: flowContext.flow,
        step: flowContext.step,
      },
      error instanceof Error ? error : undefined
    );
    return refreshError.toMCPError();
  }

  // Fall back to general transformation
  return transformToMCPError(error, flowContext);
}

/**
 * Check if an error is retryable based on its MCP representation
 *
 * @param mcpError - MCP error object
 * @returns True if error is retryable
 */
export function isRetryableMCPError(mcpError: MCPError): boolean {
  return mcpError.data?.retryable === true;
}

/**
 * Extract recovery action from MCP error
 *
 * @param mcpError - MCP error object
 * @returns Recovery action string or undefined
 */
export function getRecoveryAction(mcpError: MCPError): string | undefined {
  return mcpError.data?.recoveryAction as string | undefined;
}

/**
 * Create a user-friendly error message from MCP error
 *
 * @param mcpError - MCP error object
 * @returns User-friendly message
 */
export function formatUserMessage(mcpError: MCPError): string {
  const recoveryAction = getRecoveryAction(mcpError);
  const baseMessage = mcpError.message;

  if (recoveryAction) {
    return `${baseMessage}\n\nSuggested action: ${recoveryAction}`;
  }

  return baseMessage;
}
