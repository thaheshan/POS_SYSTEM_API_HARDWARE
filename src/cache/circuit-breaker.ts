/**
 * Circuit Breaker for Redis Client
 * Provides fault tolerance when Redis is unavailable
 * States: CLOSED (normal) → OPEN (failing) → HALF_OPEN (testing) → CLOSED
 */

export enum CircuitBreakerState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Failures detected, reject requests
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

export interface CircuitBreakerConfig {
  failureThreshold: number; // Failures before opening (default: 5)
  successThreshold: number; // Successes before closing (default: 2)
  timeout: number; // Seconds in OPEN state before HALF_OPEN (default: 60)
  monitorInterval: number; // Health check interval in seconds (default: 30)
}

export class RedisCircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;
  private openedAt: number | null = null;
  private config: CircuitBreakerConfig;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: config.failureThreshold ?? 5,
      successThreshold: config.successThreshold ?? 2,
      timeout: config.timeout ?? 60,
      monitorInterval: config.monitorInterval ?? 30,
    };
  }

  /**
   * Record a failure
   */
  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitBreakerState.CLOSED) {
      if (this.failureCount >= this.config.failureThreshold) {
        this.open();
      }
    } else if (this.state === CircuitBreakerState.HALF_OPEN) {
      // Failure in HALF_OPEN state → reopen
      this.open();
    }
  }

  /**
   * Record a success
   */
  recordSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.close();
      }
    }
  }

  /**
   * Transition to OPEN state
   */
  private open(): void {
    if (this.state !== CircuitBreakerState.OPEN) {
      console.warn(
        `[Redis Circuit Breaker] Opening circuit. Failures: ${this.failureCount}`,
      );
      this.state = CircuitBreakerState.OPEN;
      this.openedAt = Date.now();
      this.successCount = 0;
    }
  }

  /**
   * Transition to HALF_OPEN state (attempt recovery)
   */
  private halfOpen(): void {
    if (this.state === CircuitBreakerState.OPEN) {
      const elapsedSeconds = (Date.now() - (this.openedAt || 0)) / 1000;
      if (elapsedSeconds >= this.config.timeout) {
        console.info(
          `[Redis Circuit Breaker] Half-opening circuit after ${elapsedSeconds}s timeout`,
        );
        this.state = CircuitBreakerState.HALF_OPEN;
        this.successCount = 0;
        this.failureCount = 0;
      }
    }
  }

  /**
   * Transition to CLOSED state (recovered)
   */
  private close(): void {
    if (this.state !== CircuitBreakerState.CLOSED) {
      console.info(
        `[Redis Circuit Breaker] Closing circuit after ${this.successCount} successes`,
      );
      this.state = CircuitBreakerState.CLOSED;
      this.failureCount = 0;
      this.successCount = 0;
      this.openedAt = null;
    }
  }

  /**
   * Check if request should be allowed
   */
  canExecute(): boolean {
    if (this.state === CircuitBreakerState.CLOSED) {
      return true;
    }

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      // Allow one request through to test
      return true;
    }

    // OPEN state - reject
    return false;
  }

  /**
   * Get current state
   */
  getState(): CircuitBreakerState {
    // Check if we should transition OPEN → HALF_OPEN
    if (this.state === CircuitBreakerState.OPEN) {
      this.halfOpen();
    }
    return this.state;
  }

  /**
   * Get health status
   */
  getHealth(): {
    state: CircuitBreakerState;
    failureCount: number;
    successCount: number;
    lastFailureTime: number | null;
    canExecute: boolean;
  } {
    return {
      state: this.getState(),
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      canExecute: this.canExecute(),
    };
  }

  /**
   * Reset circuit breaker
   */
  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.openedAt = null;
  }

  /**
   * Start periodic health monitoring
   */
  startMonitoring(): void {
    if (this.monitoringInterval) {
      return; // Already monitoring
    }

    this.monitoringInterval = setInterval(() => {
      const health = this.getHealth();
      console.debug(
        `[Redis Circuit Breaker] Health: ${JSON.stringify(health)}`,
      );
    }, this.config.monitorInterval * 1000);
  }

  /**
   * Stop health monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
}
