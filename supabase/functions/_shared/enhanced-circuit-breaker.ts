/**
 * Enhanced Circuit Breaker with Half-Open State and Metrics
 * Implements the full circuit breaker pattern with monitoring capabilities
 */

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerConfig {
  failureThreshold: number;      // Number of failures before opening
  successThreshold: number;       // Successes needed in half-open to close
  timeout: number;                // Time in ms before transitioning to half-open
  halfOpenMaxAttempts: number;    // Max attempts allowed in half-open state
  monitoringWindowMs: number;     // Window for calculating failure rate
  failureRateThreshold: number;   // Percentage (0-100) failure rate to trip
}

export interface CircuitMetrics {
  state: CircuitState;
  failures: number;
  successes: number;
  totalRequests: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  stateChangedAt: number;
  failureRate: number;
  averageResponseTime: number;
  recentResponseTimes: number[];
}

export interface CircuitBreakerEvent {
  type: 'state_change' | 'failure' | 'success' | 'rejected';
  from?: CircuitState;
  to?: CircuitState;
  timestamp: number;
  error?: string;
  responseTime?: number;
}

type EventListener = (event: CircuitBreakerEvent) => void;

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 3,
  timeout: 30000,
  halfOpenMaxAttempts: 3,
  monitoringWindowMs: 60000,
  failureRateThreshold: 50,
};

/**
 * Enhanced Circuit Breaker with full state machine implementation
 */
export class EnhancedCircuitBreaker {
  private config: CircuitBreakerConfig;
  private state: CircuitState = 'closed';
  private failures = 0;
  private successes = 0;
  private halfOpenAttempts = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private stateChangedAt = Date.now();
  private requestHistory: Array<{ success: boolean; timestamp: number; responseTime: number }> = [];
  private listeners: EventListener[] = [];
  private name: string;

  constructor(name: string, config: Partial<CircuitBreakerConfig> = {}) {
    this.name = name;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    this.checkStateTransition();
    return this.state;
  }

  /**
   * Get detailed metrics
   */
  getMetrics(): CircuitMetrics {
    this.checkStateTransition();
    this.cleanupOldHistory();

    const recentHistory = this.requestHistory.filter(
      r => r.timestamp > Date.now() - this.config.monitoringWindowMs
    );

    const failures = recentHistory.filter(r => !r.success).length;
    const total = recentHistory.length;
    const failureRate = total > 0 ? (failures / total) * 100 : 0;

    const responseTimes = recentHistory.map(r => r.responseTime);
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      totalRequests: this.requestHistory.length,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      stateChangedAt: this.stateChangedAt,
      failureRate,
      averageResponseTime: avgResponseTime,
      recentResponseTimes: responseTimes.slice(-10),
    };
  }

  /**
   * Check if circuit allows request
   */
  canExecute(): boolean {
    this.checkStateTransition();

    switch (this.state) {
      case 'closed':
        return true;
      case 'open':
        return false;
      case 'half-open':
        return this.halfOpenAttempts < this.config.halfOpenMaxAttempts;
    }
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.checkStateTransition();

    if (!this.canExecute()) {
      this.emitEvent({ type: 'rejected', timestamp: Date.now() });
      throw new CircuitBreakerOpenError(
        `Circuit breaker "${this.name}" is open`,
        this.getTimeUntilRetry()
      );
    }

    if (this.state === 'half-open') {
      this.halfOpenAttempts++;
    }

    const startTime = Date.now();

    try {
      const result = await fn();
      this.recordSuccess(Date.now() - startTime);
      return result;
    } catch (error) {
      this.recordFailure(Date.now() - startTime, error);
      throw error;
    }
  }

  /**
   * Record a successful execution
   */
  private recordSuccess(responseTime: number): void {
    this.successes++;
    this.lastSuccessTime = Date.now();
    this.requestHistory.push({
      success: true,
      timestamp: Date.now(),
      responseTime,
    });

    this.emitEvent({
      type: 'success',
      timestamp: Date.now(),
      responseTime,
    });

    if (this.state === 'half-open') {
      if (this.successes >= this.config.successThreshold) {
        this.transitionTo('closed');
        this.failures = 0;
        this.successes = 0;
        this.halfOpenAttempts = 0;
      }
    } else if (this.state === 'closed') {
      // Reset failures on success in closed state
      this.failures = 0;
    }

    this.cleanupOldHistory();
  }

  /**
   * Record a failed execution
   */
  private recordFailure(responseTime: number, error: unknown): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    this.requestHistory.push({
      success: false,
      timestamp: Date.now(),
      responseTime,
    });

    const errorMessage = error instanceof Error ? error.message : String(error);
    this.emitEvent({
      type: 'failure',
      timestamp: Date.now(),
      error: errorMessage,
      responseTime,
    });

    if (this.state === 'half-open') {
      // Any failure in half-open immediately opens the circuit
      this.transitionTo('open');
      this.successes = 0;
      this.halfOpenAttempts = 0;
    } else if (this.state === 'closed') {
      // Check if we should open the circuit
      if (this.shouldOpen()) {
        this.transitionTo('open');
      }
    }

    this.cleanupOldHistory();
  }

  /**
   * Check if circuit should open based on failure threshold or rate
   */
  private shouldOpen(): boolean {
    // Check absolute threshold
    if (this.failures >= this.config.failureThreshold) {
      return true;
    }

    // Check failure rate within monitoring window
    const recentHistory = this.requestHistory.filter(
      r => r.timestamp > Date.now() - this.config.monitoringWindowMs
    );

    if (recentHistory.length >= 10) {
      const failures = recentHistory.filter(r => !r.success).length;
      const failureRate = (failures / recentHistory.length) * 100;
      if (failureRate >= this.config.failureRateThreshold) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check and perform state transitions
   */
  private checkStateTransition(): void {
    if (this.state === 'open') {
      const timeSinceOpen = Date.now() - this.stateChangedAt;
      if (timeSinceOpen >= this.config.timeout) {
        this.transitionTo('half-open');
        this.halfOpenAttempts = 0;
        this.successes = 0;
      }
    }
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;
    this.stateChangedAt = Date.now();

    this.emitEvent({
      type: 'state_change',
      from: oldState,
      to: newState,
      timestamp: Date.now(),
    });
  }

  /**
   * Clean up old request history
   */
  private cleanupOldHistory(): void {
    const cutoff = Date.now() - this.config.monitoringWindowMs * 2;
    this.requestHistory = this.requestHistory.filter(r => r.timestamp > cutoff);
  }

  /**
   * Get time until next retry is allowed (when open)
   */
  getTimeUntilRetry(): number {
    if (this.state !== 'open') return 0;
    const elapsed = Date.now() - this.stateChangedAt;
    return Math.max(0, this.config.timeout - elapsed);
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.transitionTo('closed');
    this.failures = 0;
    this.successes = 0;
    this.halfOpenAttempts = 0;
    this.requestHistory = [];
  }

  /**
   * Force open the circuit (for testing or manual intervention)
   */
  forceOpen(): void {
    this.transitionTo('open');
  }

  /**
   * Add event listener
   */
  addEventListener(listener: EventListener): void {
    this.listeners.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: EventListener): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  /**
   * Emit an event to all listeners
   */
  private emitEvent(event: CircuitBreakerEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (e) {
        console.error('Circuit breaker event listener error:', e);
      }
    }
  }
}

/**
 * Error thrown when circuit breaker is open
 */
export class CircuitBreakerOpenError extends Error {
  retryAfterMs: number;

  constructor(message: string, retryAfterMs: number) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
    this.retryAfterMs = retryAfterMs;
  }
}

// Pre-configured circuit breakers for common services
export const circuitBreakers = {
  externalApi: new EnhancedCircuitBreaker('external-api', {
    failureThreshold: 5,
    successThreshold: 3,
    timeout: 60000,
    halfOpenMaxAttempts: 3,
    monitoringWindowMs: 60000,
    failureRateThreshold: 50,
  }),
  storage: new EnhancedCircuitBreaker('storage', {
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 30000,
    halfOpenMaxAttempts: 2,
    monitoringWindowMs: 30000,
    failureRateThreshold: 40,
  }),
  database: new EnhancedCircuitBreaker('database', {
    failureThreshold: 10,
    successThreshold: 5,
    timeout: 15000,
    halfOpenMaxAttempts: 5,
    monitoringWindowMs: 60000,
    failureRateThreshold: 30,
  }),
  aiProvider: new EnhancedCircuitBreaker('ai-provider', {
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 120000, // AI calls can be slow
    halfOpenMaxAttempts: 1,
    monitoringWindowMs: 300000,
    failureRateThreshold: 60,
  }),
};

/**
 * Get all circuit breaker metrics
 */
export function getAllCircuitBreakerMetrics(): Record<string, CircuitMetrics> {
  return Object.entries(circuitBreakers).reduce((acc, [name, breaker]) => {
    acc[name] = breaker.getMetrics();
    return acc;
  }, {} as Record<string, CircuitMetrics>);
}
