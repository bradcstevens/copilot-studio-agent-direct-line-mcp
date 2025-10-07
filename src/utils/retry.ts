/**
 * Retry logic with exponential backoff
 */

import { AxiosError } from 'axios';

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
  if (error instanceof AxiosError) {
    if (!error.response) {
      return ErrorType.NETWORK;
    }

    const status = error.response.status;

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
