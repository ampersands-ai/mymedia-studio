/**
 * Circuit breaker pattern implementation for edge functions
 * Prevents cascading failures by temporarily blocking requests after repeated failures
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private readonly threshold: number;
  private readonly timeout: number;

  /**
   * @param threshold - Number of failures before opening circuit
   * @param timeout - Time in ms before attempting to close circuit
   */
  constructor(threshold: number = 5, timeout: number = 60000) {
    this.threshold = threshold;
    this.timeout = timeout;
  }

  /**
   * Check if circuit breaker is open (blocking requests)
   */
  isOpen(): boolean {
    if (this.failures >= this.threshold) {
      // Check if timeout has passed
      if (Date.now() - this.lastFailure > this.timeout) {
        // Reset and close circuit
        this.failures = 0;
        return false;
      }
      return true;
    }
    return false;
  }

  /**
   * Execute a function with circuit breaker protection
   * 
   * @param fn - Function to execute
   * @returns Result of the function
   * @throws {Error} If circuit is open or function fails
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new Error('Circuit breaker is open - service temporarily unavailable');
    }

    try {
      const result = await fn();
      // Success - reset failure count
      this.failures = 0;
      return result;
    } catch (error) {
      // Failure - increment counter
      this.failures++;
      this.lastFailure = Date.now();
      throw error;
    }
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.failures = 0;
    this.lastFailure = 0;
  }

  /**
   * Get current state
   */
  getState(): { failures: number; isOpen: boolean } {
    return {
      failures: this.failures,
      isOpen: this.isOpen(),
    };
  }
}

// Global circuit breakers for common external services
export const externalApiBreaker = new CircuitBreaker(5, 60000);
export const storageBreaker = new CircuitBreaker(3, 30000);
