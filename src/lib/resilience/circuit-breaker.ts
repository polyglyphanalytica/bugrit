/**
 * Circuit Breaker Pattern Implementation
 *
 * Prevents cascading failures by tracking tool failures and temporarily
 * disabling unhealthy tools until they recover.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Tool is failing, requests are rejected immediately
 * - HALF_OPEN: Testing if tool has recovered
 */

import { logger } from '@/lib/logger';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit */
  failureThreshold: number;
  /** Time in ms before attempting recovery (half-open) */
  resetTimeout: number;
  /** Number of successful calls in half-open to close circuit */
  successThreshold: number;
  /** Time window in ms to count failures */
  failureWindow: number;
  /** Timeout for individual calls in ms */
  callTimeout: number;
}

export interface CircuitStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure: Date | null;
  lastSuccess: Date | null;
  totalCalls: number;
  totalFailures: number;
  totalSuccesses: number;
  openedAt: Date | null;
  halfOpenAt: Date | null;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeout: 60000, // 1 minute
  successThreshold: 3,
  failureWindow: 60000, // 1 minute
  callTimeout: 300000, // 5 minutes
};

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures: number = 0;
  private successes: number = 0;
  private lastFailure: Date | null = null;
  private lastSuccess: Date | null = null;
  private openedAt: Date | null = null;
  private halfOpenAt: Date | null = null;
  private failureTimestamps: number[] = [];
  private totalCalls: number = 0;
  private totalFailures: number = 0;
  private totalSuccesses: number = 0;

  constructor(
    private readonly name: string,
    private readonly config: CircuitBreakerConfig = DEFAULT_CONFIG
  ) {}

  /**
   * Execute a function through the circuit breaker
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalCalls++;

    // Check if circuit should transition from OPEN to HALF_OPEN
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.transitionToHalfOpen();
      } else {
        throw new CircuitOpenError(this.name, this.getStats());
      }
    }

    try {
      const result = await this.executeWithTimeout(fn);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Circuit breaker timeout: ${this.name}`)),
          this.config.callTimeout
        )
      ),
    ]);
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.lastSuccess = new Date();
    this.totalSuccesses++;

    if (this.state === 'HALF_OPEN') {
      this.successes++;
      if (this.successes >= this.config.successThreshold) {
        this.transitionToClosed();
      }
    } else if (this.state === 'CLOSED') {
      // Reset failure count on success in closed state
      this.failures = 0;
      this.failureTimestamps = [];
    }

    logger.debug('Circuit breaker success', {
      circuit: this.name,
      state: this.state,
      successes: this.successes,
    });
  }

  /**
   * Handle failed execution
   */
  private onFailure(error: unknown): void {
    this.lastFailure = new Date();
    this.totalFailures++;
    const now = Date.now();

    // Clean old failures outside the window
    this.failureTimestamps = this.failureTimestamps.filter(
      ts => now - ts < this.config.failureWindow
    );
    this.failureTimestamps.push(now);
    this.failures = this.failureTimestamps.length;

    logger.warn('Circuit breaker failure', {
      circuit: this.name,
      state: this.state,
      failures: this.failures,
      threshold: this.config.failureThreshold,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    if (this.state === 'HALF_OPEN') {
      // Any failure in half-open reopens the circuit
      this.transitionToOpen();
    } else if (this.state === 'CLOSED') {
      if (this.failures >= this.config.failureThreshold) {
        this.transitionToOpen();
      }
    }
  }

  /**
   * Check if we should attempt to reset from OPEN to HALF_OPEN
   */
  private shouldAttemptReset(): boolean {
    if (!this.openedAt) return false;
    return Date.now() - this.openedAt.getTime() >= this.config.resetTimeout;
  }

  /**
   * Transition to OPEN state
   */
  private transitionToOpen(): void {
    this.state = 'OPEN';
    this.openedAt = new Date();
    this.successes = 0;

    logger.warn('Circuit breaker OPENED', {
      circuit: this.name,
      failures: this.failures,
      resetTimeout: this.config.resetTimeout,
    });
  }

  /**
   * Transition to HALF_OPEN state
   */
  private transitionToHalfOpen(): void {
    this.state = 'HALF_OPEN';
    this.halfOpenAt = new Date();
    this.successes = 0;

    logger.info('Circuit breaker HALF_OPEN', {
      circuit: this.name,
      attemptingRecovery: true,
    });
  }

  /**
   * Transition to CLOSED state
   */
  private transitionToClosed(): void {
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.failureTimestamps = [];
    this.openedAt = null;
    this.halfOpenAt = null;

    logger.info('Circuit breaker CLOSED', {
      circuit: this.name,
      recovered: true,
    });
  }

  /**
   * Get current circuit stats
   */
  getStats(): CircuitStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailure: this.lastFailure,
      lastSuccess: this.lastSuccess,
      totalCalls: this.totalCalls,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      openedAt: this.openedAt,
      halfOpenAt: this.halfOpenAt,
    };
  }

  /**
   * Get circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Check if circuit allows requests
   */
  isAvailable(): boolean {
    if (this.state === 'CLOSED') return true;
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.transitionToHalfOpen();
        return true;
      }
      return false;
    }
    // HALF_OPEN allows requests for testing
    return true;
  }

  /**
   * Force reset the circuit breaker
   */
  reset(): void {
    this.transitionToClosed();
    logger.info('Circuit breaker manually reset', { circuit: this.name });
  }

  /**
   * Force open the circuit breaker
   */
  forceOpen(): void {
    this.transitionToOpen();
    logger.warn('Circuit breaker manually opened', { circuit: this.name });
  }
}

/**
 * Error thrown when circuit is open
 */
export class CircuitOpenError extends Error {
  constructor(
    public readonly circuitName: string,
    public readonly stats: CircuitStats
  ) {
    super(`Circuit breaker '${circuitName}' is OPEN`);
    this.name = 'CircuitOpenError';
  }
}

/**
 * Circuit Breaker Registry
 * Manages circuit breakers for all tools
 */
export class CircuitBreakerRegistry {
  private circuits: Map<string, CircuitBreaker> = new Map();
  private defaultConfig: CircuitBreakerConfig;

  constructor(defaultConfig: Partial<CircuitBreakerConfig> = {}) {
    this.defaultConfig = { ...DEFAULT_CONFIG, ...defaultConfig };
  }

  /**
   * Get or create a circuit breaker for a tool
   */
  getCircuit(
    name: string,
    config?: Partial<CircuitBreakerConfig>
  ): CircuitBreaker {
    if (!this.circuits.has(name)) {
      const mergedConfig = { ...this.defaultConfig, ...config };
      this.circuits.set(name, new CircuitBreaker(name, mergedConfig));
    }
    return this.circuits.get(name)!;
  }

  /**
   * Get all circuit stats
   */
  getAllStats(): Record<string, CircuitStats> {
    const stats: Record<string, CircuitStats> = {};
    for (const [name, circuit] of this.circuits) {
      stats[name] = circuit.getStats();
    }
    return stats;
  }

  /**
   * Get circuits by state
   */
  getCircuitsByState(state: CircuitState): string[] {
    const result: string[] = [];
    for (const [name, circuit] of this.circuits) {
      if (circuit.getState() === state) {
        result.push(name);
      }
    }
    return result;
  }

  /**
   * Get health summary
   */
  getHealthSummary(): {
    total: number;
    healthy: number;
    unhealthy: number;
    recovering: number;
    circuits: Record<string, CircuitState>;
  } {
    const circuits: Record<string, CircuitState> = {};
    let healthy = 0;
    let unhealthy = 0;
    let recovering = 0;

    for (const [name, circuit] of this.circuits) {
      const state = circuit.getState();
      circuits[name] = state;
      switch (state) {
        case 'CLOSED':
          healthy++;
          break;
        case 'OPEN':
          unhealthy++;
          break;
        case 'HALF_OPEN':
          recovering++;
          break;
      }
    }

    return {
      total: this.circuits.size,
      healthy,
      unhealthy,
      recovering,
      circuits,
    };
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const circuit of this.circuits.values()) {
      circuit.reset();
    }
    logger.info('All circuit breakers reset');
  }

  /**
   * Reset specific circuit
   */
  resetCircuit(name: string): boolean {
    const circuit = this.circuits.get(name);
    if (circuit) {
      circuit.reset();
      return true;
    }
    return false;
  }
}

// Export singleton registry
export const circuitRegistry = new CircuitBreakerRegistry();
