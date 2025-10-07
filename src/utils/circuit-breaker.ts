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
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening circuit
  failureWindow: number; // Time window for counting failures (ms)
  recoveryTimeout: number; // Time to wait before attempting recovery (ms)
  successThreshold: number; // Successes needed in half-open to close circuit
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
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerError';
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
      throw new CircuitBreakerError('Circuit breaker is OPEN - failing fast');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
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
   */
  private onFailure(): void {
    const now = Date.now();
    this.lastFailureTime = now;
    this.failureTimestamps.push(now);

    // Remove old failure timestamps outside the window
    this.failureTimestamps = this.failureTimestamps.filter(
      (timestamp) => now - timestamp < this.config.failureWindow
    );

    this.failureCount = this.failureTimestamps.length;

    console.log(
      `[CircuitBreaker] Failure recorded (${this.failureCount}/${this.config.failureThreshold} in window)`
    );

    // If we've exceeded the threshold, open the circuit
    if (this.state === CircuitState.CLOSED && this.failureCount >= this.config.failureThreshold) {
      this.transitionTo(CircuitState.OPEN);
    } else if (this.state === CircuitState.HALF_OPEN) {
      // Any failure in half-open state reopens the circuit
      this.transitionTo(CircuitState.OPEN);
      this.successCount = 0;
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
