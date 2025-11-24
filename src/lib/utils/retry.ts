/**
 * Retry Utility
 *
 * Provides reusable retry logic with exponential backoff for async operations.
 * Extracted from duplicate implementations across the codebase.
 *
 * @module retry
 */

/**
 * Retry configuration options
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay between retries in milliseconds (default: 1000) */
  baseDelay?: number;
  /** Enable exponential backoff (default: true) */
  exponentialBackoff?: boolean;
  /** Maximum delay between retries in milliseconds (default: 30000) */
  maxDelay?: number;
  /** Custom function to determine if error should trigger retry */
  shouldRetry?: (error: Error, attempt: number) => boolean;
  /** Callback called before each retry */
  onRetry?: (error: Error, attempt: number, delay: number) => void;
}

/**
 * Default retry options
 */
const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'shouldRetry' | 'onRetry'>> = {
  maxRetries: 3,
  baseDelay: 1000,
  exponentialBackoff: true,
  maxDelay: 30000,
};

/**
 * Execute async operation with automatic retry on failure
 *
 * Features:
 * - Configurable retry attempts
 * - Exponential backoff support
 * - Custom retry conditions
 * - Retry callbacks for logging
 *
 * @param operation - Async operation to execute
 * @param options - Retry configuration
 * @returns Result of the operation
 * @throws Last error encountered if all retries fail
 *
 * @example
 * ```typescript
 * // Basic retry
 * const data = await retryOperation(
 *   async () => fetchData(),
 *   { maxRetries: 3 }
 * );
 *
 * // With custom retry logic
 * const result = await retryOperation(
 *   async () => apiCall(),
 *   {
 *     maxRetries: 5,
 *     shouldRetry: (error) => error.status === 429,
 *     onRetry: (error, attempt, delay) => {
 *       console.log(`Retry ${attempt} after ${delay}ms`);
 *     }
 *   }
 * );
 * ```
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 0; attempt < config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry
      const shouldRetry = options.shouldRetry
        ? options.shouldRetry(lastError, attempt)
        : true;

      // Don't retry if this is the last attempt or shouldRetry returned false
      if (attempt >= config.maxRetries - 1 || !shouldRetry) {
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = calculateDelay(attempt, config);

      // Call onRetry callback if provided
      if (options.onRetry) {
        options.onRetry(lastError, attempt + 1, delay);
      }

      // Wait before retrying
      await sleep(delay);
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError!;
}

/**
 * Calculate retry delay with exponential backoff
 *
 * @param attempt - Current attempt number (0-indexed)
 * @param config - Retry configuration
 * @returns Delay in milliseconds
 */
function calculateDelay(
  attempt: number,
  config: Required<Omit<RetryOptions, 'shouldRetry' | 'onRetry'>>
): number {
  if (config.exponentialBackoff) {
    const delay = config.baseDelay * Math.pow(2, attempt);
    return Math.min(delay, config.maxDelay);
  }
  return config.baseDelay;
}

/**
 * Sleep for specified milliseconds
 *
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after delay
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry operation with custom backoff strategy
 *
 * Allows specifying exact delays for each retry attempt
 *
 * @param operation - Async operation to execute
 * @param delays - Array of delays for each retry (in milliseconds)
 * @param options - Additional options
 * @returns Result of the operation
 *
 * @example
 * ```typescript
 * // Retry with custom delays: 1s, 3s, 5s
 * const data = await retryWithDelays(
 *   async () => fetchData(),
 *   [1000, 3000, 5000]
 * );
 * ```
 */
export async function retryWithDelays<T>(
  operation: () => Promise<T>,
  delays: number[],
  options: Pick<RetryOptions, 'shouldRetry' | 'onRetry'> = {}
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < delays.length + 1; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry
      const shouldRetry = options.shouldRetry
        ? options.shouldRetry(lastError, attempt)
        : true;

      // Don't retry if this is the last attempt or shouldRetry returned false
      if (attempt >= delays.length || !shouldRetry) {
        throw lastError;
      }

      const delay = delays[attempt];

      // Call onRetry callback if provided
      if (options.onRetry) {
        options.onRetry(lastError, attempt + 1, delay);
      }

      // Wait before retrying
      await sleep(delay);
    }
  }

  throw lastError!;
}

/**
 * Create retry function with predefined options
 *
 * Useful for creating service-specific retry functions
 *
 * @param defaultOptions - Default retry options
 * @returns Retry function with preset options
 *
 * @example
 * ```typescript
 * // Create API-specific retry function
 * const apiRetry = createRetryFunction({
 *   maxRetries: 5,
 *   baseDelay: 2000,
 *   shouldRetry: (error) => error.status >= 500
 * });
 *
 * // Use it
 * const data = await apiRetry(() => fetchFromAPI());
 * ```
 */
export function createRetryFunction(defaultOptions: RetryOptions) {
  return <T>(
    operation: () => Promise<T>,
    overrideOptions?: RetryOptions
  ): Promise<T> => {
    return retryOperation(operation, { ...defaultOptions, ...overrideOptions });
  };
}

/**
 * Retry for specific error types
 *
 * Only retries if error matches specified conditions
 *
 * @example
 * ```typescript
 * const data = await retryOnError(
 *   async () => fetchData(),
 *   {
 *     errorTypes: ['NetworkError', 'TimeoutError'],
 *     maxRetries: 3
 *   }
 * );
 * ```
 */
export async function retryOnError<T>(
  operation: () => Promise<T>,
  config: RetryOptions & {
    /** Error types that should trigger retry */
    errorTypes?: string[];
    /** Error messages that should trigger retry (partial match) */
    errorMessages?: string[];
  }
): Promise<T> {
  return retryOperation(operation, {
    ...config,
    shouldRetry: (error, attempt) => {
      // Check error type
      if (config.errorTypes && !config.errorTypes.includes(error.constructor.name)) {
        return false;
      }

      // Check error message
      if (config.errorMessages) {
        const hasMatch = config.errorMessages.some(msg =>
          error.message.toLowerCase().includes(msg.toLowerCase())
        );
        if (!hasMatch) return false;
      }

      // Use custom shouldRetry if provided
      if (config.shouldRetry) {
        return config.shouldRetry(error, attempt);
      }

      return true;
    }
  });
}
