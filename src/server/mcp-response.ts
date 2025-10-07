/**
 * MCP response formatting utilities
 */

/**
 * Create a successful MCP response
 * @param data - Data to include in response (will be JSON stringified)
 * @returns MCP tool response
 */
export function createSuccessResponse(data: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
      },
    ],
  };
}

/**
 * Create an error MCP response
 * @param error - Error to format
 * @returns MCP tool response
 */
export function createErrorResponse(error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            error: true,
            message: errorMessage,
            type: error instanceof Error ? error.constructor.name : 'UnknownError',
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Error types for classification
 */
export enum ErrorType {
  VALIDATION = 'ValidationError',
  NOT_FOUND = 'NotFoundError',
  API_ERROR = 'APIError',
  TIMEOUT = 'TimeoutError',
  NETWORK = 'NetworkError',
  AUTHENTICATION = 'AuthenticationError',
  RATE_LIMIT = 'RateLimitError',
  INTERNAL = 'InternalError',
}

/**
 * Classified error with type
 */
export class ClassifiedError extends Error {
  constructor(
    message: string,
    public readonly errorType: ErrorType,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = errorType;
  }
}

/**
 * Classify an error by analyzing its properties
 * @param error - Error to classify
 * @returns Classified error
 */
export function classifyMCPError(error: unknown): ClassifiedError {
  if (error instanceof ClassifiedError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);

  // Validation errors
  if (message.includes('Validation failed') || message.includes('required')) {
    return new ClassifiedError(message, ErrorType.VALIDATION, error);
  }

  // Not found errors
  if (message.includes('not found') || message.includes('expired')) {
    return new ClassifiedError(message, ErrorType.NOT_FOUND, error);
  }

  // Timeout errors
  if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
    return new ClassifiedError(message, ErrorType.TIMEOUT, error);
  }

  // Network errors
  if (
    message.includes('ECONNREFUSED') ||
    message.includes('ENOTFOUND') ||
    message.includes('network')
  ) {
    return new ClassifiedError(message, ErrorType.NETWORK, error);
  }

  // Authentication errors
  if (
    message.includes('401') ||
    message.includes('403') ||
    message.includes('Unauthorized') ||
    message.includes('authentication')
  ) {
    return new ClassifiedError(message, ErrorType.AUTHENTICATION, error);
  }

  // Rate limit errors
  if (message.includes('429') || message.includes('rate limit')) {
    return new ClassifiedError(message, ErrorType.RATE_LIMIT, error);
  }

  // API errors
  if (message.includes('API') || message.includes('status code')) {
    return new ClassifiedError(message, ErrorType.API_ERROR, error);
  }

  // Default to internal error
  return new ClassifiedError(message, ErrorType.INTERNAL, error);
}

/**
 * Transform error into MCP-compliant response
 * @param error - Error to transform
 * @returns MCP tool response
 */
export function transformErrorToMCPResponse(error: unknown) {
  const classified = classifyMCPError(error);

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            error: true,
            type: classified.errorType,
            message: classified.message,
            timestamp: new Date().toISOString(),
          },
          null,
          2
        ),
      },
    ],
  };
}
