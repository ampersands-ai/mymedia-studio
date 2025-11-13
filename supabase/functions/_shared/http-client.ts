import { EdgeLogger } from './edge-logger.ts';
import { CircuitBreaker } from './circuit-breaker.ts';

/**
 * HTTP Client Configuration
 */
export interface HttpClientConfig {
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay between retries in ms (default: 1000) */
  retryDelay?: number;
  /** Default headers to include in all requests */
  headers?: Record<string, string>;
  /** Enable circuit breaker protection (default: true) */
  useCircuitBreaker?: boolean;
  /** Custom circuit breaker instance */
  circuitBreaker?: CircuitBreaker;
  /** Status codes that should trigger retry (default: [429, 500, 502, 503, 504]) */
  retryableStatuses?: number[];
  /** Enable exponential backoff (default: true) */
  exponentialBackoff?: boolean;
}

/**
 * HTTP Request Options
 */
export interface HttpRequestOptions extends RequestInit {
  /** Additional context for logging */
  context?: Record<string, unknown>;
  /** Override timeout for this request */
  timeout?: number;
  /** Override retry config for this request */
  maxRetries?: number;
  /** Skip circuit breaker for this request */
  skipCircuitBreaker?: boolean;
}

/**
 * Centralized HTTP Client with retry, timeout, circuit breaker, and structured logging
 * 
 * Features:
 * - Automatic retries with exponential backoff
 * - Request timeout protection
 * - Circuit breaker integration
 * - Structured logging with EdgeLogger
 * - Request/response correlation
 * - Standardized error handling
 * 
 * @example
 * ```typescript
 * const httpClient = new HttpClient(logger, {
 *   timeout: 30000,
 *   maxRetries: 3
 * });
 * 
 * const data = await httpClient.post<ApiResponse>(
 *   'https://api.example.com/endpoint',
 *   { prompt: 'test' },
 *   { context: { userId: user.id } }
 * );
 * ```
 */
export class HttpClient {
  private logger: EdgeLogger;
  private config: Required<Omit<HttpClientConfig, 'headers' | 'circuitBreaker'>> & {
    headers: Record<string, string>;
    circuitBreaker?: CircuitBreaker;
  };

  constructor(logger: EdgeLogger, config: HttpClientConfig = {}) {
    this.logger = logger;
    this.config = {
      timeout: config.timeout ?? 30000,
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      headers: config.headers ?? {},
      useCircuitBreaker: config.useCircuitBreaker ?? true,
      circuitBreaker: config.circuitBreaker,
      retryableStatuses: config.retryableStatuses ?? [429, 500, 502, 503, 504],
      exponentialBackoff: config.exponentialBackoff ?? true,
    };
  }

  /**
   * Make an HTTP request with automatic retry, timeout, and circuit breaker
   */
  async fetch<T = any>(
    url: string,
    options: HttpRequestOptions = {}
  ): Promise<T> {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();
    const timeout = options.timeout ?? this.config.timeout;
    const maxRetries = options.maxRetries ?? this.config.maxRetries;
    const method = options.method || 'GET';

    this.logger.info('HTTP request initiated', {
      metadata: { 
        url: this.sanitizeUrl(url),
        method,
        requestId,
        timeout,
        maxRetries,
        ...options.context 
      }
    });

    const fetchWithTimeout = async (): Promise<Response> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        this.logger.warn('HTTP request timeout', {
          metadata: { url: this.sanitizeUrl(url), timeout, requestId }
        });
      }, timeout);

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            ...this.config.headers,
            ...options.headers,
            'X-Request-Id': requestId,
          },
        });
        return response;
      } finally {
        clearTimeout(timeoutId);
      }
    };

    const fetchWithRetry = async (): Promise<Response> => {
      let lastError: Error | null = null;
      let lastResponse: Response | null = null;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const response = await fetchWithTimeout();
          lastResponse = response;

          // Success - return immediately
          if (response.ok) {
            this.logger.debug('HTTP request successful', {
              metadata: { 
                url: this.sanitizeUrl(url),
                status: response.status,
                attempt: attempt + 1,
                requestId 
              }
            });
            return response;
          }

          // Check if status is retryable
          const isRetryable = this.config.retryableStatuses.includes(response.status);
          
          if (isRetryable && attempt < maxRetries - 1) {
            const delay = this.calculateRetryDelay(attempt);
            this.logger.warn('HTTP request failed, retrying', {
              metadata: { 
                url: this.sanitizeUrl(url),
                attempt: attempt + 1,
                status: response.status,
                delay,
                requestId
              }
            });
            await this.sleep(delay);
            continue;
          }

          // Non-retryable error or last attempt
          const errorText = await response.text();
          throw new Error(
            `HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText.substring(0, 200)}` : ''}`
          );

        } catch (error: any) {
          lastError = error;

          // Handle timeout
          if (error.name === 'AbortError') {
            const timeoutError = new Error(`Request timeout after ${timeout}ms`);
            this.logger.error('HTTP request timeout', timeoutError, {
              metadata: { url: this.sanitizeUrl(url), timeout, requestId }
            });
            throw timeoutError;
          }

          // Retry on network errors
          if (attempt < maxRetries - 1) {
            const delay = this.calculateRetryDelay(attempt);
            this.logger.warn('HTTP request error, retrying', {
              metadata: { 
                url: this.sanitizeUrl(url),
                attempt: attempt + 1,
                error: error.message,
                delay,
                requestId
              }
            });
            await this.sleep(delay);
            continue;
          }
        }
      }

      // All retries exhausted
      throw lastError || new Error(
        `HTTP request failed after ${maxRetries} attempts: ${lastResponse?.status || 'unknown'}`
      );
    };

    try {
      // Execute with or without circuit breaker
      const shouldUseCircuitBreaker = 
        this.config.useCircuitBreaker && 
        !options.skipCircuitBreaker && 
        this.config.circuitBreaker;

      const response = shouldUseCircuitBreaker
        ? await this.config.circuitBreaker!.execute(() => fetchWithRetry())
        : await fetchWithRetry();

      // Parse response
      const contentType = response.headers.get('content-type');
      let data: T;

      if (contentType?.includes('application/json')) {
        data = await response.json() as T;
      } else if (contentType?.includes('text/')) {
        data = await response.text() as T;
      } else {
        data = await response.arrayBuffer() as T;
      }

      const duration = Date.now() - startTime;
      this.logger.info('HTTP request completed', {
        duration,
        metadata: { 
          url: this.sanitizeUrl(url),
          status: response.status,
          requestId,
          ...options.context 
        }
      });

      return data;

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      // Check if circuit breaker error
      if (error.message?.includes('Circuit breaker is open')) {
        this.logger.error('Circuit breaker open - request blocked', error, {
          duration,
          metadata: { 
            url: this.sanitizeUrl(url),
            requestId,
            ...options.context 
          }
        });
      } else {
        this.logger.error('HTTP request failed', error, {
          duration,
          metadata: { 
            url: this.sanitizeUrl(url),
            error: error.message,
            requestId,
            ...options.context 
          }
        });
      }

      throw error;
    }
  }

  /**
   * POST request helper
   */
  async post<T = any>(
    url: string,
    body: unknown,
    options: HttpRequestOptions = {}
  ): Promise<T> {
    return this.fetch<T>(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  }

  /**
   * GET request helper
   */
  async get<T = any>(
    url: string,
    options: HttpRequestOptions = {}
  ): Promise<T> {
    return this.fetch<T>(url, { ...options, method: 'GET' });
  }

  /**
   * PUT request helper
   */
  async put<T = any>(
    url: string,
    body: unknown,
    options: HttpRequestOptions = {}
  ): Promise<T> {
    return this.fetch<T>(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  }

  /**
   * DELETE request helper
   */
  async delete<T = any>(
    url: string,
    options: HttpRequestOptions = {}
  ): Promise<T> {
    return this.fetch<T>(url, { ...options, method: 'DELETE' });
  }

  /**
   * PATCH request helper
   */
  async patch<T = any>(
    url: string,
    body: unknown,
    options: HttpRequestOptions = {}
  ): Promise<T> {
    return this.fetch<T>(url, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  }

  /**
   * HEAD request helper (for checking URL accessibility)
   */
  async head(
    url: string,
    options: HttpRequestOptions = {}
  ): Promise<Response> {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();

    try {
      const response = await fetch(url, {
        ...options,
        method: 'HEAD',
        headers: {
          ...this.config.headers,
          ...options.headers,
          'X-Request-Id': requestId,
        },
      });

      this.logger.debug('HEAD request completed', {
        duration: Date.now() - startTime,
        metadata: { 
          url: this.sanitizeUrl(url),
          status: response.status,
          requestId 
        }
      });

      return response;
    } catch (error: any) {
      this.logger.error('HEAD request failed', error, {
        duration: Date.now() - startTime,
        metadata: { url: this.sanitizeUrl(url), requestId }
      });
      throw error;
    }
  }

  /**
   * Download binary content (images, videos, etc.)
   */
  async downloadBinary(
    url: string,
    options: HttpRequestOptions = {}
  ): Promise<{ data: Uint8Array; contentType: string | null }> {
    const response = await this.fetch<ArrayBuffer>(url, {
      ...options,
      headers: {
        ...options.headers,
      },
    });

    // Get content type from the original response headers
    // We need to make a HEAD request first to get headers
    const headResponse = await this.head(url, options);
    const contentType = headResponse.headers.get('content-type');

    return {
      data: new Uint8Array(response as ArrayBuffer),
      contentType,
    };
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    if (this.config.exponentialBackoff) {
      return Math.min(
        this.config.retryDelay * Math.pow(2, attempt),
        30000 // Max 30 seconds
      );
    }
    return this.config.retryDelay;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Sanitize URL for logging (remove query params with sensitive data)
   */
  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Remove query params that might contain sensitive data
      const sensitiveParams = ['token', 'key', 'secret', 'password', 'api_key', 'apikey'];
      sensitiveParams.forEach(param => {
        if (urlObj.searchParams.has(param)) {
          urlObj.searchParams.set(param, '[REDACTED]');
        }
      });
      return urlObj.toString();
    } catch {
      // If URL parsing fails, return truncated original
      return url.substring(0, 100);
    }
  }
}

/**
 * Create HTTP client with service-specific circuit breaker
 */
export function createHttpClient(
  logger: EdgeLogger,
  serviceName: string,
  config: HttpClientConfig = {}
): HttpClient {
  // Create circuit breaker for this service
  const circuitBreaker = new CircuitBreaker(
    config.circuitBreaker?.threshold ?? 5,
    config.circuitBreaker?.timeout ?? 60000
  );

  return new HttpClient(logger, {
    ...config,
    circuitBreaker,
  });
}

/**
 * Pre-configured HTTP clients for common services
 */
export class HttpClients {
  /**
   * Create HTTP client for KieAI API
   */
  static createKieAIClient(logger: EdgeLogger): HttpClient {
    return createHttpClient(logger, 'kie-ai', {
      timeout: 600000, // 10 minutes for generation
      maxRetries: 2,
      headers: {
        'Authorization': `Bearer ${Deno.env.get('KIE_AI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Create HTTP client for Shotstack API
   */
  static createShotstackClient(logger: EdgeLogger): HttpClient {
    return createHttpClient(logger, 'shotstack', {
      timeout: 30000,
      maxRetries: 3,
      headers: {
        'x-api-key': Deno.env.get('SHOTSTACK_API_KEY') || '',
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Create HTTP client for Pixabay API
   */
  static createPixabayClient(logger: EdgeLogger): HttpClient {
    return createHttpClient(logger, 'pixabay', {
      timeout: 15000,
      maxRetries: 3,
    });
  }

  /**
   * Create HTTP client for Pexels API
   */
  static createPexelsClient(logger: EdgeLogger): HttpClient {
    return createHttpClient(logger, 'pexels', {
      timeout: 15000,
      maxRetries: 3,
      headers: {
        'Authorization': Deno.env.get('PEXELS_API_KEY') || '',
      },
    });
  }

  /**
   * Create HTTP client for ElevenLabs API
   */
  static createElevenLabsClient(logger: EdgeLogger): HttpClient {
    return createHttpClient(logger, 'elevenlabs', {
      timeout: 60000,
      maxRetries: 2,
      headers: {
        'xi-api-key': Deno.env.get('ELEVENLABS_API_KEY') || '',
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Create HTTP client for Lovable AI Gateway
   */
  static createLovableAIClient(logger: EdgeLogger): HttpClient {
    return createHttpClient(logger, 'lovable-ai', {
      timeout: 120000, // 2 minutes
      maxRetries: 2,
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Create HTTP client for Runware API
   */
  static createRunwareClient(logger: EdgeLogger): HttpClient {
    return createHttpClient(logger, 'runware', {
      timeout: 60000,
      maxRetries: 3,
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RUNWARE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Create generic HTTP client
   */
  static createGenericClient(logger: EdgeLogger, config?: HttpClientConfig): HttpClient {
    return new HttpClient(logger, config);
  }
}
