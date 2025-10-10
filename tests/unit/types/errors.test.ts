/**
 * Tests for error handling types and classes
 */

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
  CircuitBreakerError,
  ConfigurationError,
  ValidationError,
  ErrorCategory,
  ErrorSeverity,
} from '../../../src/types/errors.js';

describe('ApplicationError', () => {
  it('should create error with default context', () => {
    const error = new ApplicationError('Test error');

    expect(error.message).toBe('Test error');
    expect(error.name).toBe('ApplicationError');
    expect(error.context.category).toBe(ErrorCategory.UNKNOWN);
    expect(error.context.severity).toBe(ErrorSeverity.MEDIUM);
    expect(error.context.retryable).toBe(false);
    expect(error.timestamp).toBeInstanceOf(Date);
  });

  it('should create error with custom context', () => {
    const error = new ApplicationError('Custom error', {
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.HIGH,
      retryable: true,
      userMessage: 'User-friendly message',
      recoveryAction: 'Try again',
      metadata: { attemptNumber: 3 },
    });

    expect(error.context.category).toBe(ErrorCategory.NETWORK);
    expect(error.context.severity).toBe(ErrorSeverity.HIGH);
    expect(error.context.retryable).toBe(true);
    expect(error.context.userMessage).toBe('User-friendly message');
    expect(error.context.recoveryAction).toBe('Try again');
    expect(error.context.metadata).toEqual({ attemptNumber: 3 });
  });

  it('should convert to MCP error format', () => {
    const error = new ApplicationError('Test error', {
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.LOW,
      retryable: false,
      userMessage: 'Invalid input',
      recoveryAction: 'Check your input',
    });

    const mcpError = error.toMCPError();

    expect(mcpError.code).toBe(ErrorCategory.VALIDATION);
    expect(mcpError.message).toBe('Invalid input');
    expect(mcpError.data).toMatchObject({
      severity: ErrorSeverity.LOW,
      retryable: false,
      recoveryAction: 'Check your input',
    });
    expect(mcpError.data?.timestamp).toBeTruthy();
  });
});

describe('AuthenticationError', () => {
  it('should create auth error with correct defaults', () => {
    const error = new AuthenticationError('Auth failed');

    expect(error.name).toBe('AuthenticationError');
    expect(error.context.category).toBe(ErrorCategory.AUTHENTICATION);
    expect(error.context.severity).toBe(ErrorSeverity.HIGH);
    expect(error.context.retryable).toBe(false);
    expect(error.context.userMessage).toBe('Authentication failed. Please log in again.');
    expect(error.context.recoveryAction).toBe('Re-authenticate using the OAuth flow');
  });

  it('should include metadata', () => {
    const error = new AuthenticationError('Auth failed', {
      status: 401,
      url: '/api/token',
    });

    expect(error.context.metadata).toMatchObject({
      status: 401,
      url: '/api/token',
    });
  });
});

describe('AuthorizationError', () => {
  it('should create authz error with correct defaults', () => {
    const error = new AuthorizationError('Access denied');

    expect(error.name).toBe('AuthorizationError');
    expect(error.context.category).toBe(ErrorCategory.AUTHORIZATION);
    expect(error.context.severity).toBe(ErrorSeverity.HIGH);
    expect(error.context.retryable).toBe(false);
    expect(error.context.userMessage).toBe('You do not have permission to access this resource.');
  });
});

describe('OAuthError', () => {
  it('should create OAuth error with error code', () => {
    const error = new OAuthError(
      'OAuth failed',
      'invalid_grant',
      'The provided authorization grant is invalid'
    );

    expect(error.name).toBe('OAuthError');
    expect(error.oauthErrorCode).toBe('invalid_grant');
    expect(error.oauthErrorDescription).toBe('The provided authorization grant is invalid');
    expect(error.context.category).toBe(ErrorCategory.AUTHENTICATION);
  });

  it('should mark retryable errors correctly', () => {
    const retryableError = new OAuthError('Server error', 'server_error');
    expect(retryableError.context.retryable).toBe(true);
    expect(retryableError.context.retryStrategy).toBeTruthy();

    const nonRetryableError = new OAuthError('Invalid grant', 'invalid_grant');
    expect(nonRetryableError.context.retryable).toBe(false);
  });

  it('should provide appropriate recovery actions', () => {
    const invalidGrantError = new OAuthError('Invalid grant', 'invalid_grant');
    expect(invalidGrantError.context.recoveryAction).toBe('Re-authenticate - your session has expired');

    const accessDeniedError = new OAuthError('Access denied', 'access_denied');
    expect(accessDeniedError.context.recoveryAction).toBe('User denied authorization - retry or contact administrator');
  });
});

describe('TokenRefreshError', () => {
  it('should create token refresh error with retry strategy', () => {
    const error = new TokenRefreshError('Token refresh failed');

    expect(error.name).toBe('TokenRefreshError');
    expect(error.context.retryable).toBe(true);
    expect(error.context.retryStrategy).toBeTruthy();
    expect(error.context.retryStrategy?.maxRetries).toBe(3);
    expect(error.context.retryStrategy?.initialDelay).toBe(1000);
  });
});

describe('NetworkError', () => {
  it('should create network error with retry strategy', () => {
    const error = new NetworkError('Connection failed');

    expect(error.name).toBe('NetworkError');
    expect(error.context.category).toBe(ErrorCategory.NETWORK);
    expect(error.context.retryable).toBe(true);
    expect(error.context.retryStrategy?.maxRetries).toBe(5);
  });
});

describe('RateLimitError', () => {
  it('should create rate limit error with retry-after', () => {
    const error = new RateLimitError('Too many requests', 60);

    expect(error.name).toBe('RateLimitError');
    expect(error.retryAfter).toBe(60);
    expect(error.context.retryable).toBe(true);
    expect(error.context.retryStrategy?.initialDelay).toBe(60000); // 60 seconds in ms
    expect(error.context.userMessage).toContain('60 seconds');
  });

  it('should use default retry-after if not provided', () => {
    const error = new RateLimitError('Too many requests');

    expect(error.retryAfter).toBeUndefined();
    expect(error.context.retryStrategy?.initialDelay).toBe(60000); // Default 60 seconds
  });
});

describe('ServiceUnavailableError', () => {
  it('should create service unavailable error', () => {
    const error = new ServiceUnavailableError('Service down');

    expect(error.name).toBe('ServiceUnavailableError');
    expect(error.context.category).toBe(ErrorCategory.SERVICE_UNAVAILABLE);
    expect(error.context.severity).toBe(ErrorSeverity.HIGH);
    expect(error.context.retryable).toBe(true);
  });
});

describe('TimeoutError', () => {
  it('should create timeout error', () => {
    const error = new TimeoutError('Request timed out');

    expect(error.name).toBe('TimeoutError');
    expect(error.context.category).toBe(ErrorCategory.TIMEOUT);
    expect(error.context.retryable).toBe(true);
  });
});

describe('CircuitBreakerError', () => {
  it('should create circuit breaker error', () => {
    const error = new CircuitBreakerError('Circuit open');

    expect(error.name).toBe('CircuitBreakerError');
    expect(error.context.category).toBe(ErrorCategory.CIRCUIT_BREAKER);
    expect(error.context.severity).toBe(ErrorSeverity.HIGH);
    expect(error.context.retryable).toBe(false);
  });
});

describe('ConfigurationError', () => {
  it('should create configuration error', () => {
    const error = new ConfigurationError('Invalid config');

    expect(error.name).toBe('ConfigurationError');
    expect(error.context.category).toBe(ErrorCategory.CONFIGURATION);
    expect(error.context.severity).toBe(ErrorSeverity.CRITICAL);
    expect(error.context.retryable).toBe(false);
  });
});

describe('ValidationError', () => {
  it('should create validation error', () => {
    const error = new ValidationError('Invalid input');

    expect(error.name).toBe('ValidationError');
    expect(error.context.category).toBe(ErrorCategory.VALIDATION);
    expect(error.context.severity).toBe(ErrorSeverity.LOW);
    expect(error.context.retryable).toBe(false);
  });
});
