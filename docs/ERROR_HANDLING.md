# Error Handling and Resilience

This document describes the comprehensive error handling and resilience patterns implemented in the Copilot Studio Agent Direct Line MCP Server.

## Overview

The server implements a multi-layered error handling strategy:

1. **Typed Error Classes** - Specific error types for different failure scenarios
2. **Circuit Breaker Pattern** - Prevents cascading failures
3. **Retry Strategies** - Automatic retry with exponential backoff
4. **Error Transformation** - Convert errors to MCP-compatible format
5. **Graceful Degradation** - Maintain service availability during failures

## Error Types

### Base Error: `ApplicationError`

All custom errors extend `ApplicationError`, which provides:

- **Error Category** - Classification (AUTHENTICATION, NETWORK, etc.)
- **Severity Level** - LOW, MEDIUM, HIGH, CRITICAL
- **Retryability** - Whether the operation can be retried
- **Retry Strategy** - Automatic retry configuration
- **User Message** - User-friendly error description
- **Recovery Action** - Suggested steps to resolve the error
- **Metadata** - Additional context information

```typescript
import { ApplicationError, ErrorCategory, ErrorSeverity } from './types/errors.js';

throw new ApplicationError('Operation failed', {
  category: ErrorCategory.NETWORK,
  severity: ErrorSeverity.MEDIUM,
  retryable: true,
  userMessage: 'Network connection issue. Retrying...',
  recoveryAction: 'Check network connectivity and retry',
  metadata: { attemptNumber: 3 }
});
```

### Authentication Errors

**AuthenticationError** (401 Unauthorized)
- User authentication failed
- Not retryable
- Recovery: Re-authenticate using OAuth flow

**AuthorizationError** (403 Forbidden)
- User lacks required permissions
- Not retryable
- Recovery: Request appropriate permissions

**OAuthError**
- OAuth flow failures (invalid_grant, server_error, etc.)
- Conditionally retryable based on error code
- Recovery: Varies by OAuth error code

**TokenRefreshError**
- Token refresh failures
- Retryable with exponential backoff
- Recovery: Retry or re-authenticate if retries fail

### Network & Service Errors

**NetworkError**
- Network connectivity issues
- Retryable (5 attempts, exponential backoff)
- Recovery: Check network connectivity

**ServiceUnavailableError** (503)
- Service temporarily down
- Retryable (5 attempts, up to 60s delay)
- Recovery: Wait for service recovery

**TimeoutError**
- Request timeouts
- Retryable (3 attempts, exponential backoff)
- Recovery: Automatic timeout handling

**RateLimitError** (429)
- Rate limit exceeded
- Retryable after delay specified by server
- Recovery: Wait specified time before retry

### System Errors

**CircuitBreakerError**
- Circuit breaker is open
- Not retryable (wait for recovery)
- Recovery: Wait for circuit breaker recovery

**ConfigurationError**
- Invalid configuration
- Not retryable
- Severity: CRITICAL
- Recovery: Fix configuration and restart

**ValidationError**
- Invalid input
- Not retryable
- Severity: LOW
- Recovery: Correct input and retry

## Circuit Breaker

### Overview

The Circuit Breaker pattern prevents cascading failures by "opening" when failure thresholds are exceeded.

### States

1. **CLOSED** - Normal operation, requests pass through
2. **OPEN** - Too many failures, requests fail fast
3. **HALF_OPEN** - Testing if service recovered

### Configuration

```typescript
import { CircuitBreaker, FailureType } from './utils/circuit-breaker.js';

const circuitBreaker = new CircuitBreaker({
  failureThreshold: 5,        // Open after 5 failures
  failureWindow: 30000,        // Within 30 seconds
  recoveryTimeout: 60000,      // Wait 60s before testing recovery
  successThreshold: 3,         // Close after 3 successes in HALF_OPEN
  excludedFailureTypes: [      // Don't count these toward threshold
    FailureType.AUTH_SERVICE   // User auth errors don't open circuit
  ]
});
```

### Failure Classification

The circuit breaker classifies failures into types:

- **NETWORK** - Network connectivity issues
- **TIMEOUT** - Request timeouts
- **SERVER_ERROR** - 5xx server errors
- **AUTH_SERVICE** - OAuth/Authentication service failures
- **RATE_LIMIT** - Rate limiting
- **UNKNOWN** - Unclassified failures

You can exclude certain failure types from opening the circuit. For example, OAuth user authentication failures (401/403) shouldn't open the circuit since they represent user errors, not service issues.

### Usage

```typescript
const result = await circuitBreaker.execute(async () => {
  // Your operation here
  return await someApiCall();
});

// Get circuit breaker metrics
const metrics = circuitBreaker.getMetrics();
console.log(`Circuit state: ${metrics.state}`);
console.log(`Failures: ${metrics.failures}`);
console.log(`Rejections: ${metrics.rejections}`);
```

## Retry Strategies

### Basic Retry

```typescript
import { retryWithBackoff } from './utils/retry.js';

const result = await retryWithBackoff(
  async () => await apiCall(),
  {
    maxRetries: 3,
    baseDelay: 1000,  // 1 second
    maxDelay: 4000,   // 4 seconds max
    onRetry: (attempt, error) => {
      console.log(`Retry attempt ${attempt}:`, error);
    }
  }
);
```

### Advanced Retry with Strategy

```typescript
import { retryWithStrategy } from './utils/retry.js';

const result = await retryWithStrategy(
  async () => await apiCall(),
  {
    strategy: {
      maxRetries: 5,
      initialDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,  // Exponential: 1s, 2s, 4s, 8s, 16s
      retryableStatuses: [408, 429, 500, 502, 503, 504]
    },
    onRetry: (attempt, error, delay) => {
      console.log(`Retry ${attempt} after ${delay}ms`);
    },
    shouldRetry: (error) => {
      // Custom retry logic
      return error.name !== 'AuthenticationError';
    }
  }
);
```

### OAuth-Specific Retry

```typescript
import { retryOAuthOperation } from './utils/retry.js';

const tokens = await retryOAuthOperation(
  async () => await tokenExchange(code),
  {
    onRetry: (attempt, error, delay) => {
      console.warn(`Token exchange retry ${attempt}, waiting ${delay}ms`);
    }
  }
);
```

This automatically:
- Retries only server errors (500-504), not auth errors (401, 403)
- Skips retry for `invalid_grant` (user must re-authenticate)
- Uses exponential backoff with jitter (1s → 2s → 4s → 8s)

### Retry with Circuit Breaker

```typescript
import { retryWithCircuitBreaker } from './utils/retry.js';

const result = await retryWithCircuitBreaker(
  async () => await apiCall(),
  {
    strategy: { maxRetries: 3 }
  },
  () => circuitBreaker.getState() !== CircuitState.OPEN
);
```

### Retry with Deadline

```typescript
import { retryWithDeadline } from './utils/retry.js';

const result = await retryWithDeadline(
  async () => await apiCall(),
  10000,  // 10 second deadline
  {
    strategy: { maxRetries: 10 }  // But stop at deadline
  }
);
```

## Error Transformation for MCP

### Transform to MCP Format

```typescript
import { transformToMCPError } from './utils/error-transformer.js';

try {
  await someOperation();
} catch (error) {
  const mcpError = transformToMCPError(error, {
    operationId: 'send_message',
    conversationId: 'abc123'
  });

  // Send to MCP client
  return {
    error: mcpError
  };
}
```

### OAuth Error Transformation

```typescript
import { transformOAuthError } from './utils/error-transformer.js';

try {
  await tokenExchange(code);
} catch (error) {
  const mcpError = transformOAuthError(error, {
    flow: 'token_exchange',
    step: 'code_exchange'
  });

  return { error: mcpError };
}
```

### MCP Error Format

```json
{
  "code": "AUTHENTICATION",
  "message": "Authentication failed. Please log in again.",
  "data": {
    "severity": "HIGH",
    "retryable": false,
    "recoveryAction": "Re-authenticate using the OAuth flow",
    "timestamp": "2025-01-07T12:00:00.000Z",
    "flow": "token_exchange",
    "step": "code_exchange"
  }
}
```

## Implementation Examples

### EntraID Client with Full Error Handling

```typescript
import { CircuitBreaker, FailureType } from './utils/circuit-breaker.js';
import { retryOAuthOperation } from './utils/retry.js';
import { OAuthError, TokenRefreshError } from './types/errors.js';

class EntraIDClient {
  private circuitBreaker: CircuitBreaker;

  constructor() {
    // Circuit breaker excludes user auth errors
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      failureWindow: 30000,
      recoveryTimeout: 60000,
      successThreshold: 3,
      excludedFailureTypes: [FailureType.AUTH_SERVICE]
    });
  }

  async refreshAccessToken(refreshToken: string) {
    return this.circuitBreaker.execute(async () => {
      return retryOAuthOperation(
        async () => {
          try {
            const response = await this.msalClient.acquireTokenByRefreshToken({
              refreshToken,
              scopes: this.config.scopes
            });

            if (!response) {
              throw new TokenRefreshError('Token refresh returned empty response');
            }

            return response;
          } catch (error) {
            // Check for invalid_grant - requires re-authentication
            if (error.message.includes('invalid_grant')) {
              throw new TokenRefreshError(
                'Refresh token is invalid or expired. User must re-authenticate.',
                { requiresReauth: true }
              );
            }

            throw new TokenRefreshError(
              error.message || 'Token refresh failed',
              { originalError: error.message }
            );
          }
        },
        {
          onRetry: (attempt, error, delay) => {
            console.warn(`Token refresh retry ${attempt}, waiting ${delay}ms`);
          }
        }
      );
    });
  }
}
```

### Health Check with Circuit Breaker Monitoring

```typescript
import { HealthCheckService } from './services/health-check.js';

const healthCheck = new HealthCheckService();

// Include circuit breaker state in health checks
const result = await healthCheck.check();
console.log('Health:', result.status);
console.log('Circuit Breakers:', result.circuitBreakers);
```

## Best Practices

### 1. Use Specific Error Types

Always throw the most specific error type:

```typescript
// ✅ Good
throw new TokenRefreshError('Token expired');

// ❌ Bad
throw new Error('Token expired');
```

### 2. Include Context in Errors

Provide helpful metadata:

```typescript
throw new OAuthError(
  'Authorization failed',
  'invalid_grant',
  'Refresh token expired',
  {
    flow: 'token_refresh',
    scopes: ['User.Read'],
    tenantId: 'abc-123'
  }
);
```

### 3. Don't Retry User Errors

User errors (401, 403, validation) should not be retried:

```typescript
// Circuit breaker excludes user auth failures
excludedFailureTypes: [FailureType.AUTH_SERVICE]

// OAuth retry skips auth errors automatically
await retryOAuthOperation(fn);  // Won't retry 401/403
```

### 4. Use Circuit Breakers for External Services

Wrap all external API calls:

```typescript
const authCircuit = new CircuitBreaker({ /* config */ });
const botCircuit = new CircuitBreaker({ /* config */ });

await authCircuit.execute(() => oauthCall());
await botCircuit.execute(() => botFrameworkCall());
```

### 5. Transform Errors at API Boundaries

Convert to MCP format at the boundary:

```typescript
// In MCP tool handler
export async function handleTool(request) {
  try {
    return await processRequest(request);
  } catch (error) {
    return {
      error: transformToMCPError(error, {
        toolName: request.name,
        requestId: request.id
      })
    };
  }
}
```

### 6. Monitor Circuit Breaker State

Include in health checks and monitoring:

```typescript
const metrics = circuitBreaker.getMetrics();
if (metrics.state === CircuitState.OPEN) {
  console.error('Circuit breaker open!', metrics);
  // Alert monitoring system
}
```

## Error Flow Diagram

```
Request → Circuit Breaker (Check State)
            ↓
          CLOSED?
            ↓
          Execute with Retry
            ↓
        Success? ─────────→ Return Result
            ↓
          Error
            ↓
        Classify Failure Type
            ↓
        Should Count? ───→ Increment Failure Count
            ↓
        Should Retry?
            ↓
          YES ──→ Exponential Backoff → Retry
            ↓
          NO
            ↓
        Transform to MCP Error
            ↓
        Return Error Response
```

## Monitoring and Observability

### Circuit Breaker Metrics

```typescript
const metrics = circuitBreaker.getMetrics();
// {
//   state: 'CLOSED',
//   failures: 2,
//   successes: 10,
//   rejections: 0,
//   lastFailureTime: 1704628800000,
//   lastStateChange: 1704628800000
// }
```

### Error Context

All errors include:
- Timestamp
- Severity level
- Retry strategy
- Recovery action
- Relevant metadata

### Health Checks

The `/health` endpoint includes circuit breaker state:

```json
{
  "status": "healthy",
  "timestamp": "2025-01-07T12:00:00.000Z",
  "uptime": 3600000,
  "version": "1.0.5",
  "circuitBreakers": {
    "oauth": {
      "state": "CLOSED",
      "metrics": { "failures": 0, "successes": 42 }
    }
  }
}
```

## Testing Error Scenarios

### Simulating Failures

```typescript
// Test circuit breaker opening
for (let i = 0; i < 6; i++) {
  try {
    await circuitBreaker.execute(async () => {
      throw new Error('Simulated failure');
    });
  } catch (error) {
    // Circuit should open after 5 failures
  }
}

const metrics = circuitBreaker.getMetrics();
assert(metrics.state === CircuitState.OPEN);
```

### Testing Retry Logic

```typescript
let attempts = 0;
const result = await retryWithStrategy(
  async () => {
    attempts++;
    if (attempts < 3) {
      throw new NetworkError('Simulated network error');
    }
    return 'success';
  },
  { strategy: { maxRetries: 5 } }
);

assert(result === 'success');
assert(attempts === 3);
```

## Conclusion

This comprehensive error handling system provides:

- **Resilience** - Automatic recovery from transient failures
- **Clarity** - Clear error messages and recovery actions
- **Control** - Fine-grained retry and circuit breaker configuration
- **Observability** - Detailed metrics and monitoring
- **Consistency** - Standardized error format across the application

For questions or issues, refer to the implementation in:
- `src/types/errors.ts` - Error type definitions
- `src/utils/circuit-breaker.ts` - Circuit breaker implementation
- `src/utils/retry.ts` - Retry strategies
- `src/utils/error-transformer.ts` - MCP error transformation
- `src/services/entraid-client.ts` - Example usage
