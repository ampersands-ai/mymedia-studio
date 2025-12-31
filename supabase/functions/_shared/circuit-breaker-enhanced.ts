/**
 * Enhanced Circuit Breaker with Metrics Recording
 * 
 * Implements the circuit breaker pattern with:
 * - Configurable thresholds per service
 * - State persistence and metrics recording
 * - Half-open state for gradual recovery
 * - Event logging for observability
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type CircuitState = 'closed' | 'open' | 'half_open';

export interface CircuitBreakerConfig {
  name: string;
  threshold: number;        // Failures before opening
  timeout: number;          // Ms before entering half-open
  halfOpenRequests: number; // Requests to test in half-open
  recordMetrics: boolean;   // Whether to record metrics to DB
}

export interface CircuitBreakerState {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure: number;
  lastSuccess: number;
  halfOpenAttempts: number;
}

// Default configurations for different service types
export const CIRCUIT_BREAKER_CONFIGS: Record<string, Omit<CircuitBreakerConfig, 'name'>> = {
  // External AI providers (Runware, KieAI, etc.)
  ai_provider: {
    threshold: 5,
    timeout: 60000,        // 1 minute
    halfOpenRequests: 2,
    recordMetrics: true,
  },
  // Storage operations
  storage: {
    threshold: 3,
    timeout: 30000,        // 30 seconds
    halfOpenRequests: 1,
    recordMetrics: true,
  },
  // Webhook deliveries
  webhook: {
    threshold: 10,
    timeout: 120000,       // 2 minutes
    halfOpenRequests: 3,
    recordMetrics: true,
  },
  // Email services
  email: {
    threshold: 5,
    timeout: 60000,
    halfOpenRequests: 2,
    recordMetrics: true,
  },
  // Default fallback
  default: {
    threshold: 5,
    timeout: 60000,
    halfOpenRequests: 2,
    recordMetrics: false,
  },
};

/**
 * Enhanced Circuit Breaker with persistence and metrics
 */
export class EnhancedCircuitBreaker {
  private state: CircuitBreakerState;
  private config: CircuitBreakerConfig;
  private supabase: SupabaseClient | null;

  constructor(
    config: CircuitBreakerConfig,
    supabase?: SupabaseClient
  ) {
    this.config = config;
    this.supabase = supabase || null;
    this.state = {
      state: 'closed',
      failures: 0,
      successes: 0,
      lastFailure: 0,
      lastSuccess: 0,
      halfOpenAttempts: 0,
    };
  }

  /**
   * Get current circuit state, handling state transitions
   */
  getState(): CircuitState {
    const now = Date.now();

    if (this.state.state === 'open') {
      // Check if we should transition to half-open
      if (now - this.state.lastFailure >= this.config.timeout) {
        this.transitionTo('half_open');
      }
    }

    return this.state.state;
  }

  /**
   * Check if circuit is allowing requests
   */
  isAllowed(): boolean {
    const currentState = this.getState();
    
    if (currentState === 'closed') {
      return true;
    }
    
    if (currentState === 'half_open') {
      // Allow limited requests in half-open state
      return this.state.halfOpenAttempts < this.config.halfOpenRequests;
    }
    
    return false; // Open state blocks all requests
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.isAllowed()) {
      await this.recordEvent('failure', 'Circuit breaker is open');
      throw new Error(`Circuit breaker [${this.config.name}] is open - service temporarily unavailable`);
    }

    const currentState = this.getState();
    
    if (currentState === 'half_open') {
      this.state.halfOpenAttempts++;
    }

    try {
      const result = await fn();
      await this.recordSuccess();
      return result;
    } catch (error) {
      await this.recordFailure(error);
      throw error;
    }
  }

  /**
   * Record a successful request
   */
  private async recordSuccess(): Promise<void> {
    this.state.successes++;
    this.state.lastSuccess = Date.now();

    if (this.state.state === 'half_open') {
      // Check if we've had enough successes to close
      if (this.state.halfOpenAttempts >= this.config.halfOpenRequests) {
        this.transitionTo('closed');
        await this.recordEvent('closed', 'Circuit closed after successful half-open tests');
      }
    } else if (this.state.state === 'closed') {
      // Reset failure count on success in closed state
      this.state.failures = 0;
    }

    if (this.config.recordMetrics) {
      await this.recordEvent('success');
    }
  }

  /**
   * Record a failed request
   */
  private async recordFailure(error: unknown): Promise<void> {
    this.state.failures++;
    this.state.lastFailure = Date.now();

    const errorMessage = error instanceof Error ? error.message : String(error);

    if (this.state.state === 'half_open') {
      // Any failure in half-open immediately opens the circuit
      this.transitionTo('open');
      await this.recordEvent('opened', `Failed in half-open: ${errorMessage}`);
    } else if (this.state.state === 'closed') {
      // Check if we've hit the threshold
      if (this.state.failures >= this.config.threshold) {
        this.transitionTo('open');
        await this.recordEvent('opened', `Threshold reached: ${this.state.failures} failures. Last error: ${errorMessage}`);
      } else {
        await this.recordEvent('failure', errorMessage);
      }
    }
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state.state;
    this.state.state = newState;

    if (newState === 'half_open') {
      this.state.halfOpenAttempts = 0;
    } else if (newState === 'closed') {
      this.state.failures = 0;
      this.state.halfOpenAttempts = 0;
    }

    console.log(`[CircuitBreaker:${this.config.name}] State transition: ${oldState} -> ${newState}`);
  }

  /**
   * Record an event to the database
   */
  private async recordEvent(eventType: string, errorMessage?: string): Promise<void> {
    if (!this.supabase || !this.config.recordMetrics) {
      return;
    }

    try {
      await this.supabase.from('circuit_breaker_events').insert({
        breaker_name: this.config.name,
        event_type: eventType,
        failure_count: this.state.failures,
        error_message: errorMessage || null,
        metadata: {
          state: this.state.state,
          successes: this.state.successes,
          halfOpenAttempts: this.state.halfOpenAttempts,
        },
      });
    } catch (err) {
      // Don't let metrics recording fail the request
      console.error(`[CircuitBreaker:${this.config.name}] Failed to record event:`, err);
    }
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.state = {
      state: 'closed',
      failures: 0,
      successes: 0,
      lastFailure: 0,
      lastSuccess: 0,
      halfOpenAttempts: 0,
    };
  }

  /**
   * Get detailed state info
   */
  getDetailedState(): CircuitBreakerState & { config: CircuitBreakerConfig } {
    return {
      ...this.state,
      state: this.getState(), // Get current state with transitions
      config: this.config,
    };
  }
}

/**
 * Create a circuit breaker for a specific service type
 */
export function createCircuitBreaker(
  name: string,
  type: keyof typeof CIRCUIT_BREAKER_CONFIGS = 'default',
  supabase?: SupabaseClient
): EnhancedCircuitBreaker {
  const baseConfig = CIRCUIT_BREAKER_CONFIGS[type] || CIRCUIT_BREAKER_CONFIGS.default;
  return new EnhancedCircuitBreaker(
    { name, ...baseConfig },
    supabase
  );
}

// In-memory circuit breaker registry for edge functions
// Note: Each edge function instance has its own memory, so these are per-instance
const circuitBreakers = new Map<string, EnhancedCircuitBreaker>();

/**
 * Get or create a circuit breaker by name
 */
export function getCircuitBreaker(
  name: string,
  type: keyof typeof CIRCUIT_BREAKER_CONFIGS = 'default',
  supabase?: SupabaseClient
): EnhancedCircuitBreaker {
  const key = `${type}:${name}`;
  
  if (!circuitBreakers.has(key)) {
    circuitBreakers.set(key, createCircuitBreaker(name, type, supabase));
  }
  
  return circuitBreakers.get(key)!;
}

/**
 * Execute with circuit breaker protection, creating breaker if needed
 */
export async function withCircuitBreaker<T>(
  name: string,
  type: keyof typeof CIRCUIT_BREAKER_CONFIGS,
  fn: () => Promise<T>,
  supabase?: SupabaseClient
): Promise<T> {
  const breaker = getCircuitBreaker(name, type, supabase);
  return breaker.execute(fn);
}
