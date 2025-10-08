/**
 * Tests for Circuit Breaker implementation
 */

import { CircuitBreaker, CircuitState, FailureType, CircuitBreakerError } from '../circuit-breaker.js';

// Helper to wait for a specified time
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('CircuitBreaker', () => {
  describe('Basic functionality', () => {
    it('should start in CLOSED state', () => {
      const breaker = new CircuitBreaker();
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should execute function successfully when CLOSED', async () => {
      const breaker = new CircuitBreaker();
      const result = await breaker.execute(async () => 'success');
      expect(result).toBe('success');
    });

    it('should propagate errors from executed function', async () => {
      const breaker = new CircuitBreaker();
      await expect(
        breaker.execute(async () => {
          throw new Error('Test error');
        })
      ).rejects.toThrow('Test error');
    });
  });

  describe('State transitions', () => {
    it('should open circuit after reaching failure threshold', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        failureWindow: 10000,
        recoveryTimeout: 5000,
        successThreshold: 2,
      });

      // Trigger 3 failures
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Failure');
          });
        } catch (error) {
          // Expected
        }
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });

    it('should fail fast when OPEN', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        failureWindow: 10000,
        recoveryTimeout: 5000,
        successThreshold: 2,
      });

      // Open the circuit
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Failure');
          });
        } catch (error) {
          // Expected
        }
      }

      // Should fail fast
      await expect(
        breaker.execute(async () => 'success')
      ).rejects.toThrow(CircuitBreakerError);

      const metrics = breaker.getMetrics();
      expect(metrics.rejections).toBeGreaterThan(0);
    });

    it('should transition to HALF_OPEN after recovery timeout', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        failureWindow: 10000,
        recoveryTimeout: 100, // Short timeout for testing
        successThreshold: 2,
      });

      // Open the circuit
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Failure');
          });
        } catch (error) {
          // Expected
        }
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);

      // Wait for recovery timeout
      await wait(150);

      // Next call should trigger HALF_OPEN check
      try {
        await breaker.execute(async () => 'success');
      } catch (error) {
        // May fail if state check happens before execution
      }

      // Circuit should be HALF_OPEN or CLOSED
      const state = breaker.getState();
      expect([CircuitState.HALF_OPEN, CircuitState.CLOSED]).toContain(state);
    });

    it('should close circuit after successful recoveries in HALF_OPEN', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        failureWindow: 10000,
        recoveryTimeout: 100,
        successThreshold: 2,
      });

      // Open the circuit
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Failure');
          });
        } catch (error) {
          // Expected
        }
      }

      // Wait for recovery
      await wait(150);

      // Execute successful operations
      await breaker.execute(async () => 'success1');
      await breaker.execute(async () => 'success2');

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should reopen circuit on failure in HALF_OPEN', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        failureWindow: 10000,
        recoveryTimeout: 100,
        successThreshold: 2,
      });

      // Open the circuit
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Failure');
          });
        } catch (error) {
          // Expected
        }
      }

      // Wait for recovery
      await wait(150);

      // Fail during HALF_OPEN
      try {
        await breaker.execute(async () => {
          throw new Error('Still failing');
        });
      } catch (error) {
        // Expected
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });
  });

  describe('Failure window', () => {
    it('should only count failures within window', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        failureWindow: 200, // 200ms window
        recoveryTimeout: 5000,
        successThreshold: 2,
      });

      // Trigger 2 failures
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Failure');
          });
        } catch (error) {
          // Expected
        }
      }

      // Wait for window to expire
      await wait(250);

      // Trigger 2 more failures (old ones should be expired)
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Failure');
          });
        } catch (error) {
          // Expected
        }
      }

      // Should still be CLOSED (only 2 failures in window)
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });
  });

  describe('Failure type classification', () => {
    it('should exclude configured failure types from count', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        failureWindow: 10000,
        recoveryTimeout: 5000,
        successThreshold: 2,
        excludedFailureTypes: [FailureType.AUTH_SERVICE],
      });

      // Create auth errors (should be excluded)
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            const error = new Error('Auth failed') as Error & { name: string; status?: number };
            error.name = 'AuthenticationError';
            error.status = 401;
            throw error;
          });
        } catch (error) {
          // Expected
        }
      }

      // Circuit should remain CLOSED (auth errors excluded)
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should count non-excluded failure types', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        failureWindow: 10000,
        recoveryTimeout: 5000,
        successThreshold: 2,
        excludedFailureTypes: [FailureType.AUTH_SERVICE],
      });

      // Create network errors (should count)
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            const error = new Error('Network failed');
            error.name = 'NetworkError';
            throw error;
          });
        } catch (error) {
          // Expected
        }
      }

      // Circuit should be OPEN (network errors counted)
      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });
  });

  describe('Metrics', () => {
    it('should track metrics correctly', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        failureWindow: 10000,
        recoveryTimeout: 5000,
        successThreshold: 2,
      });

      // Execute some operations
      await breaker.execute(async () => 'success1');
      await breaker.execute(async () => 'success2');

      try {
        await breaker.execute(async () => {
          throw new Error('Failure');
        });
      } catch (error) {
        // Expected
      }

      const metrics = breaker.getMetrics();
      expect(metrics.state).toBe(CircuitState.CLOSED);
      expect(metrics.failures).toBe(1);
      expect(metrics.lastFailureTime).toBeTruthy();
    });
  });

  describe('Reset', () => {
    it('should reset circuit to CLOSED state', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        failureWindow: 10000,
        recoveryTimeout: 5000,
        successThreshold: 2,
      });

      // Open the circuit
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Failure');
          });
        } catch (error) {
          // Expected
        }
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);

      // Reset
      breaker.reset();

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
      const metrics = breaker.getMetrics();
      expect(metrics.failures).toBe(0);
      expect(metrics.successes).toBe(0);
      expect(metrics.rejections).toBe(0);
    });
  });
});
