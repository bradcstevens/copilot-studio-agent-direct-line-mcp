/**
 * Tests for retry utilities
 */

import {
  retryWithBackoff,
  retryWithStrategy,
  retryOAuthOperation,
  retryWithCircuitBreaker,
  retryWithDeadline,
  ErrorType,
  classifyError,
  isRetryableError,
} from '../../../src/utils/retry.js';
import { CircuitState } from '../../../src/utils/circuit-breaker.js';
import { AxiosError } from 'axios';

// Helper to create mock AxiosError
function createAxiosError(status: number, message: string): AxiosError {
  const error = new Error(message) as AxiosError;
  error.isAxiosError = true;
  error.response = {
    status,
    statusText: message,
    data: {},
    headers: {},
    config: {headers: {} as any} as any,
  };
  error.config = {headers: {} as any} as any;
  error.name = 'AxiosError';
  return error;
}

describe('Error Classification', () => {
  it('should classify network errors', () => {
    const error = createAxiosError(500, 'Network error');
    error.response = undefined; // No response = network error
    const type = classifyError(error);
    expect(type).toBe(ErrorType.NETWORK);
  });

  it('should classify authentication errors', () => {
    const error = createAxiosError(401, 'Unauthorized');
    const type = classifyError(error);
    expect(type).toBe(ErrorType.AUTHENTICATION);
  });

  it('should classify rate limit errors', () => {
    const error = createAxiosError(429, 'Too Many Requests');
    const type = classifyError(error);
    expect(type).toBe(ErrorType.RATE_LIMIT);
  });

  it('should classify server errors', () => {
    const error = createAxiosError(500, 'Internal Server Error');
    const type = classifyError(error);
    expect(type).toBe(ErrorType.SERVER);
  });

  it('should classify client errors', () => {
    const error = createAxiosError(400, 'Bad Request');
    const type = classifyError(error);
    expect(type).toBe(ErrorType.CLIENT);
  });
});

describe('isRetryableError', () => {
  it('should mark network errors as retryable', () => {
    const error = createAxiosError(500, 'Network error');
    error.response = undefined; // No response = network error
    expect(isRetryableError(error)).toBe(true);
  });

  it('should mark rate limit errors as retryable', () => {
    const error = createAxiosError(429, 'Too Many Requests');
    expect(isRetryableError(error)).toBe(true);
  });

  it('should mark server errors as retryable', () => {
    const error = createAxiosError(500, 'Internal Server Error');
    expect(isRetryableError(error)).toBe(true);
  });

  it('should not mark auth errors as retryable', () => {
    const error = createAxiosError(401, 'Unauthorized');
    expect(isRetryableError(error)).toBe(false);
  });

  it('should not mark client errors as retryable', () => {
    const error = createAxiosError(400, 'Bad Request');
    expect(isRetryableError(error)).toBe(false);
  });
});

describe('retryWithBackoff', () => {
  it('should succeed on first attempt', async () => {
    const fn = jest.fn().mockResolvedValue('success');
    const result = await retryWithBackoff(fn);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on retryable errors', async () => {
    let attempts = 0;
    const fn = jest.fn().mockImplementation(async () => {
      attempts++;
      if (attempts < 3) {
        const error = createAxiosError(500, 'Server Error');
        error.response = undefined; // Make it a network error
        throw error;
      }
      return 'success';
    });

    const result = await retryWithBackoff(fn, { maxRetries: 5, baseDelay: 10, maxDelay: 50 });
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  }, 10000);

  it('should not retry on non-retryable errors', async () => {
    const fn = jest.fn().mockRejectedValue(createAxiosError(401, 'Unauthorized'));

    await expect(
      retryWithBackoff(fn, { maxRetries: 3 })
    ).rejects.toThrow();

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should exhaust retries and throw last error', async () => {
    const fn = jest.fn().mockImplementation(async () => {
      const error = createAxiosError(500, 'Server Error');
      error.response = undefined; // Make it retryable
      throw error;
    });

    await expect(
      retryWithBackoff(fn, { maxRetries: 2, baseDelay: 10 })
    ).rejects.toThrow('Server Error');

    expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
  }, 10000);

  it('should call onRetry callback', async () => {
    let attempts = 0;
    const fn = jest.fn().mockImplementation(async () => {
      attempts++;
      if (attempts < 2) {
        const error = createAxiosError(503, 'Service Unavailable');
        error.response = undefined; // Make it retryable
        throw error;
      }
      return 'success';
    });

    const onRetry = jest.fn();
    await retryWithBackoff(fn, { maxRetries: 3, baseDelay: 10, onRetry });

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
  }, 10000);
});

describe('retryWithStrategy', () => {
  it('should retry with exponential backoff and jitter', async () => {
    let attempts = 0;
    const fn = jest.fn().mockImplementation(async () => {
      attempts++;
      if (attempts < 3) {
        const error = new Error('Network error');
        error.name = 'NetworkError';
        throw error;
      }
      return 'success';
    });

    const result = await retryWithStrategy(fn, {
      strategy: {
        maxRetries: 5,
        initialDelay: 100,
        maxDelay: 1000,
        backoffMultiplier: 2,
      },
    });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should respect custom shouldRetry logic', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('Custom error'));

    await expect(
      retryWithStrategy(fn, {
        shouldRetry: () => false,
      })
    ).rejects.toThrow('Custom error');

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should call onRetry with delay information', async () => {
    let attempts = 0;
    const fn = jest.fn().mockImplementation(async () => {
      attempts++;
      if (attempts < 2) {
        const error = new Error('Test error') as Error & { status?: number };
        error.status = 500;
        throw error;
      }
      return 'success';
    });

    const onRetry = jest.fn();
    await retryWithStrategy(fn, {
      strategy: { maxRetries: 3 },
      onRetry,
    });

    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error), expect.any(Number));
  });
});

describe('retryOAuthOperation', () => {
  it('should not retry authentication errors', async () => {
    const fn = jest.fn().mockImplementation(async () => {
      const error = new Error('Auth failed');
      error.name = 'AuthenticationError';
      throw error;
    });

    await expect(retryOAuthOperation(fn)).rejects.toThrow('Auth failed');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should not retry invalid_grant errors', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('invalid_grant: Token expired'));

    await expect(retryOAuthOperation(fn)).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry server errors', async () => {
    let attempts = 0;
    const fn = jest.fn().mockImplementation(async () => {
      attempts++;
      if (attempts < 2) {
        const error = new Error('Server error') as Error & { status?: number };
        error.status = 500;
        throw error;
      }
      return 'success';
    });

    const result = await retryOAuthOperation(fn);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('retryWithCircuitBreaker', () => {
  it('should fail if circuit breaker is open', async () => {
    const fn = jest.fn().mockResolvedValue('success');
    const circuitBreakerCheck = jest.fn().mockReturnValue(false);

    await expect(
      retryWithCircuitBreaker(fn, {}, circuitBreakerCheck)
    ).rejects.toThrow('Circuit breaker is open');

    expect(fn).not.toHaveBeenCalled();
    expect(circuitBreakerCheck).toHaveBeenCalled();
  });

  it('should execute if circuit breaker is closed', async () => {
    const fn = jest.fn().mockResolvedValue('success');
    const circuitBreakerCheck = jest.fn().mockReturnValue(true);

    const result = await retryWithCircuitBreaker(fn, {}, circuitBreakerCheck);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalled();
  });
});

describe('retryWithDeadline', () => {
  it('should stop retrying after deadline', async () => {
    const fn = jest.fn().mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 150));
      const error = new Error('Test error') as Error & { status?: number };
      error.status = 500;
      throw error;
    });

    await expect(
      retryWithDeadline(fn, 400, {
        strategy: { maxRetries: 10, initialDelay: 100 },
      })
    ).rejects.toThrow('Test error');

    // Should have tried 2-3 times before deadline
    expect(fn).toHaveBeenCalled();
    expect(fn.mock.calls.length).toBeLessThanOrEqual(4);
  }, 15000);

  it('should succeed if completed before deadline', async () => {
    let attempts = 0;
    const fn = jest.fn().mockImplementation(async () => {
      attempts++;
      if (attempts < 3) {
        const error = new Error('Test error') as Error & { status?: number };
        error.status = 500;
        throw error;
      }
      return 'success';
    });

    const result = await retryWithDeadline(fn, 5000, {
      strategy: { maxRetries: 5, initialDelay: 10 },
    });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  }, 10000);
});
