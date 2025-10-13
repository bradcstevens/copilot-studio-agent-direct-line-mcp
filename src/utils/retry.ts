/**
 * Retry logic with exponential backoff and advanced error handling
 */

import { AxiosError } from 'axios';
import type { RetryStrategy } from '../types/errors.js';

/**
 * Error classification
 */
export enum ErrorType {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  RATE_LIMIT = 'rate_limit',
  SERVER = 'server',
  CLIENT = 'client',
  UNKNOWN = 'unknown',
}

/**
 * Classify an error
 * @param error - Error to classify
 * @returns Error type
 */
export function classifyError(error: unknown): ErrorType {
  // Check if it's an Axios error using the isAxiosError property (works with mocks too)
  if (error && typeof error === 'object' && 'isAxiosError' in error && error.isAxiosError) {
    const axiosError = error as AxiosError;

    if (!axiosError.response) {
      return ErrorType.NETWORK;
    }

    const status = axiosError.response.status;

    if (status === 401 || status === 403) {
      return ErrorType.AUTHENTICATION;
    }

    if (status === 429) {
      return ErrorType.RATE_LIMIT;
    }

    if (status >= 500) {
      return ErrorType.SERVER;
    }

    if (status >= 400) {
      return ErrorType.CLIENT;
    }
  }

  return ErrorType.UNKNOWN;
}

/**
 * Check if an error is retryable
 * @param error - Error to check
 * @returns True if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  const errorType = classifyError(error);
  return (
    errorType === ErrorType.NETWORK ||
    errorType === ErrorType.RATE_LIMIT ||
    errorType === ErrorType.SERVER
  );
}

/**
 * Retry options
 */
export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  onRetry?: (attempt: number, error: unknown) => void;
}

/**
 * Calculate exponential backoff delay
 * @param attempt - Current attempt number (0-based)
 * @param baseDelay - Base delay in milliseconds
 * @param maxDelay - Maximum delay in milliseconds
 * @returns Delay in milliseconds
 */
export function calculateBackoff(
  attempt: number,
  baseDelay: number = 1000,
  maxDelay: number = 4000
): number {
  const delay = baseDelay * Math.pow(2, attempt);
  return Math.min(delay, maxDelay);
}

/**
 * Sleep for specified milliseconds
 * @param ms - Milliseconds to sleep
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * @param fn - Function to retry
 * @param options - Retry options
 * @returns Result of function
 * @throws Last error if all retries fail
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000, maxDelay = 4000, onRetry } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if it's the last attempt or error is not retryable
      if (attempt === maxRetries || !isRetryableError(error)) {
        break;
      }

      // Calculate backoff delay
      const delay = calculateBackoff(attempt, baseDelay, maxDelay);

      // Call retry callback if provided
      if (onRetry) {
        onRetry(attempt + 1, error);
      }

      console.warn(
        `[Retry] Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${delay}ms...`,
        {
          error: error instanceof Error ? error.message : String(error),
          errorType: classifyError(error),
        }
      );

      // Wait before retrying
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Default retry strategy for general operations
 */
export const DEFAULT_RETRY_STRATEGY: RetryStrategy = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

/**
 * Add jitter to delay to prevent thundering herd
 * Uses full jitter: random value between 0 and calculated delay
 */
function addJitter(delay: number): number {
  return Math.random() * delay;
}

/**
 * Calculate delay for next retry with exponential backoff
 */
function calculateDelayWithStrategy(attempt: number, strategy: RetryStrategy): number {
  const exponentialDelay = strategy.initialDelay * Math.pow(strategy.backoffMultiplier, attempt);
  const cappedDelay = Math.min(exponentialDelay, strategy.maxDelay);
  return addJitter(cappedDelay);
}

/**
 * Check if error is retryable based on strategy
 */
function isRetryableWithStrategy(error: Error, strategy: RetryStrategy): boolean {
  // Check if error has an HTTP status code
  if ('status' in error && typeof error.status === 'number') {
    return strategy.retryableStatuses?.includes(error.status) ?? false;
  }

  // Check for network-related errors
  if (
    error.name === 'NetworkError' ||
    error.message.includes('ECONNRESET') ||
    error.message.includes('ETIMEDOUT') ||
    error.message.includes('ECONNREFUSED')
  ) {
    return true;
  }

  return false;
}

/**
 * Extended retry options
 */
export interface ExtendedRetryOptions {
  strategy?: Partial<RetryStrategy>;
  onRetry?: (attempt: number, error: Error, delay: number) => void;
  shouldRetry?: (error: Error) => boolean;
}

/**
 * Retry with custom strategy and jitter
 *
 * @param fn - Async function to retry
 * @param options - Extended retry options
 * @returns Result of the function
 * @throws Last error if all retries exhausted
 */
export async function retryWithStrategy<T>(
  fn: () => Promise<T>,
  options: ExtendedRetryOptions = {}
): Promise<T> {
  const strategy: RetryStrategy = {
    ...DEFAULT_RETRY_STRATEGY,
    ...options.strategy,
  };

  let lastError: Error | undefined;
  let attempt = 0;

  while (attempt <= strategy.maxRetries) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry this error
      const shouldRetryError =
        options.shouldRetry?.(lastError) ?? isRetryableWithStrategy(lastError, strategy);

      // If not retryable or we've exhausted retries, throw
      if (!shouldRetryError || attempt >= strategy.maxRetries) {
        throw lastError;
      }

      // Calculate delay and wait
      const delay = calculateDelayWithStrategy(attempt, strategy);

      // Call retry callback if provided
      options.onRetry?.(attempt + 1, lastError, delay);

      console.warn(
        `[RetryStrategy] Attempt ${attempt + 1}/${strategy.maxRetries} failed, retrying in ${Math.round(delay)}ms...`,
        {
          error: lastError.message,
          errorName: lastError.name,
        }
      );

      await sleep(delay);
      attempt++;
    }
  }

  // Should never reach here, but TypeScript requires it
  throw lastError || new Error('Retry failed with unknown error');
}

/**
 * Retry specifically for OAuth token operations
 * Includes OAuth-specific error handling
 */
export async function retryOAuthOperation<T>(
  fn: () => Promise<T>,
  options: Omit<ExtendedRetryOptions, 'strategy'> & {
    strategy?: Partial<RetryStrategy>;
  } = {}
): Promise<T> {
  const oauthStrategy: RetryStrategy = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    retryableStatuses: [500, 502, 503, 504], // Don't retry auth errors (401, 403)
    ...options.strategy,
  };

  return retryWithStrategy(fn, {
    ...options,
    strategy: oauthStrategy,
    shouldRetry: (error) => {
      // Don't retry if custom shouldRetry returns false
      if (options.shouldRetry && !options.shouldRetry(error)) {
        return false;
      }

      // Don't retry authentication/authorization errors
      if (
        error.name === 'AuthenticationError' ||
        error.name === 'AuthorizationError' ||
        error.name === 'OAuthError' ||
        ('status' in error && (error.status === 401 || error.status === 403))
      ) {
        return false;
      }

      // Don't retry invalid_grant errors (user needs to re-authenticate)
      if (error.message.includes('invalid_grant')) {
        return false;
      }

      // Retry network and server errors
      return isRetryableWithStrategy(error, oauthStrategy);
    },
  });
}

/**
 * Retry with circuit breaker pattern
 * Adds circuit breaker awareness to retry logic
 *
 * @param fn - Async function to retry
 * @param options - Retry options
 * @param circuitBreakerCheck - Optional function to check circuit breaker state
 * @returns Result of the function
 */
export async function retryWithCircuitBreaker<T>(
  fn: () => Promise<T>,
  options: ExtendedRetryOptions = {},
  circuitBreakerCheck?: () => boolean
): Promise<T> {
  // Wrap function with circuit breaker check
  const wrappedFn = async (): Promise<T> => {
    // Check circuit breaker before each attempt
    if (circuitBreakerCheck && !circuitBreakerCheck()) {
      const error = new Error('Circuit breaker is open');
      error.name = 'CircuitBreakerError';
      throw error;
    }
    return fn();
  };

  return retryWithStrategy(wrappedFn, options);
}

/**
 * Retry with deadline - stop retrying after specified time
 */
export async function retryWithDeadline<T>(
  fn: () => Promise<T>,
  deadlineMs: number,
  options: ExtendedRetryOptions = {}
): Promise<T> {
  const startTime = Date.now();

  return retryWithStrategy(fn, {
    ...options,
    shouldRetry: (error) => {
      // Check if we've exceeded deadline
      if (Date.now() - startTime >= deadlineMs) {
        return false;
      }

      // Use custom shouldRetry if provided
      if (options.shouldRetry) {
        return options.shouldRetry(error);
      }

      return true;
    },
  });
}
