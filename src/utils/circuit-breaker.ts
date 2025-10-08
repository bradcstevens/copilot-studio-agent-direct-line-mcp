/**
 * Circuit Breaker pattern implementation for API resilience
 */

/**
 * Circuit breaker states
 */
export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation, requests pass through
  OPEN = 'OPEN', // Circuit is open, requests fail fast
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

/**
 * Failure classification for circuit breaker
 */
export enum FailureType {
  NETWORK = 'NETWORK', // Network connectivity issues
  TIMEOUT = 'TIMEOUT', // Request timeouts
  SERVER_ERROR = 'SERVER_ERROR', // 5xx server errors
  AUTH_SERVICE = 'AUTH_SERVICE', // OAuth/Authentication service failures
  RATE_LIMIT = 'RATE_LIMIT', // Rate limiting
  UNKNOWN = 'UNKNOWN', // Unknown or unclassified
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening circuit
  failureWindow: number; // Time window for counting failures (ms)
  recoveryTimeout: number; // Time to wait before attempting recovery (ms)
  successThreshold: number; // Successes needed in half-open to close circuit
  excludedFailureTypes?: FailureType[]; // Failure types that don't count toward threshold
}

/**
 * Circuit breaker metrics
 */
export interface CircuitBreakerMetrics {
  state: CircuitState;
  failures: number;
  successes: number;
  rejections: number;
  lastFailureTime?: number;
  lastStateChange: number;
}

/**
 * Circuit Breaker error
 */
export class CircuitBreakerError extends Error {
  public readonly state: CircuitState;
  public readonly metrics?: CircuitBreakerMetrics;

  constructor(message: string, state?: CircuitState, metrics?: CircuitBreakerMetrics) {
    super(message);
    this.name = 'CircuitBreakerError';
    this.state = state || CircuitState.OPEN;
    this.metrics = metrics;
  }
}

/**
 * Circuit Breaker implementation
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private rejectionCount: number = 0;
  private lastFailureTime?: number;
  private lastStateChange: number = Date.now();
  private failureTimestamps: number[] = [];

  private config: CircuitBreakerConfig = {
    failureThreshold: 5,
    failureWindow: 30000, // 30 seconds
    recoveryTimeout: 60000, // 60 seconds
    successThreshold: 3,
  };

  /**
   * Create a new Circuit Breaker
   * @param config - Circuit breaker configuration
   */
  constructor(config?: Partial<CircuitBreakerConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Classify an error to determine its failure type
   * @param error - Error to classify
   * @returns Failure type
   */
  private classifyFailure(error: unknown): FailureType {
    if (!(error instanceof Error)) {
      return FailureType.UNKNOWN;
    }

    // Check error name first
    if (error.name === 'OAuthError' || error.name === 'AuthenticationError') {
      return FailureType.AUTH_SERVICE;
    }

    if (error.name === 'NetworkError') {
      return FailureType.NETWORK;
    }

    if (error.name === 'TimeoutError') {
      return FailureType.TIMEOUT;
    }

    if (error.name === 'RateLimitError') {
      return FailureType.RATE_LIMIT;
    }

    // Check HTTP status codes
    if ('status' in error && typeof error.status === 'number') {
      const status = error.status;

      if (status === 429) {
        return FailureType.RATE_LIMIT;
      }

      if (status >= 500) {
        return FailureType.SERVER_ERROR;
      }

      // OAuth/Auth service errors (401, 403)
      if (status === 401 || status === 403) {
        return FailureType.AUTH_SERVICE;
      }
    }

    // Check error message for common patterns
    if (
      error.message.includes('ECONNRESET') ||
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('network')
    ) {
      return FailureType.NETWORK;
    }

    if (error.message.includes('timeout')) {
      return FailureType.TIMEOUT;
    }

    if (error.message.includes('oauth') || error.message.includes('token')) {
      return FailureType.AUTH_SERVICE;
    }

    return FailureType.UNKNOWN;
  }

  /**
   * Check if failure should count toward circuit breaker threshold
   * @param failureType - Type of failure
   * @returns True if failure should count
   */
  private shouldCountFailure(failureType: FailureType): boolean {
    if (!this.config.excludedFailureTypes) {
      return true;
    }

    return !this.config.excludedFailureTypes.includes(failureType);
  }

  /**
   * Execute a function with circuit breaker protection
   * @param fn - Function to execute
   * @returns Result of the function
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should transition states
    this.checkStateTransitions();

    // If circuit is open, fail fast
    if (this.state === CircuitState.OPEN) {
      this.rejectionCount++;
      throw new CircuitBreakerError(
        'Circuit breaker is OPEN - failing fast',
        this.state,
        this.getMetrics()
      );
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      const failureType = this.classifyFailure(error);
      this.onFailure(failureType);
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.failureCount = 0;
    this.failureTimestamps = [];

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      console.log(
        `[CircuitBreaker] Success in HALF_OPEN state (${this.successCount}/${this.config.successThreshold})`
      );

      // If we've had enough successes, close the circuit
      if (this.successCount >= this.config.successThreshold) {
        this.transitionTo(CircuitState.CLOSED);
        this.successCount = 0;
      }
    }
  }

  /**
   * Handle failed execution
   * @param failureType - Type of failure that occurred
   */
  private onFailure(failureType: FailureType = FailureType.UNKNOWN): void {
    const now = Date.now();
    this.lastFailureTime = now;

    // Only count failures that should affect circuit breaker
    if (this.shouldCountFailure(failureType)) {
      this.failureTimestamps.push(now);

      // Remove old failure timestamps outside the window
      this.failureTimestamps = this.failureTimestamps.filter(
        (timestamp) => now - timestamp < this.config.failureWindow
      );

      this.failureCount = this.failureTimestamps.length;

      console.log(
        `[CircuitBreaker] Failure recorded (type: ${failureType}, ${this.failureCount}/${this.config.failureThreshold} in window)`
      );

      // If we've exceeded the threshold, open the circuit
      if (this.state === CircuitState.CLOSED && this.failureCount >= this.config.failureThreshold) {
        this.transitionTo(CircuitState.OPEN);
      } else if (this.state === CircuitState.HALF_OPEN) {
        // Any failure in half-open state reopens the circuit
        this.transitionTo(CircuitState.OPEN);
        this.successCount = 0;
      }
    } else {
      console.log(
        `[CircuitBreaker] Failure excluded from count (type: ${failureType})`
      );
    }
  }

  /**
   * Check if circuit should transition to a new state
   */
  private checkStateTransitions(): void {
    const now = Date.now();

    // If circuit is open and recovery timeout has passed, try half-open
    if (this.state === CircuitState.OPEN) {
      const timeSinceOpen = now - this.lastStateChange;
      if (timeSinceOpen >= this.config.recoveryTimeout) {
        this.transitionTo(CircuitState.HALF_OPEN);
      }
    }
  }

  /**
   * Transition to a new state
   * @param newState - New circuit state
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = Date.now();

    console.log(`[CircuitBreaker] State transition: ${oldState} → ${newState}`);

    // Reset counters on state change
    if (newState === CircuitState.CLOSED) {
      this.failureCount = 0;
      this.failureTimestamps = [];
    }
  }

  /**
   * Get current metrics
   * @returns Circuit breaker metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.state,
      failures: this.failureCount,
      successes: this.successCount,
      rejections: this.rejectionCount,
      lastFailureTime: this.lastFailureTime,
      lastStateChange: this.lastStateChange,
    };
  }

  /**
   * Get current state
   * @returns Current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Reset the circuit breaker to closed state
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.rejectionCount = 0;
    this.failureTimestamps = [];
    this.lastStateChange = Date.now();
    console.log('[CircuitBreaker] Reset to CLOSED state');
  }
}
