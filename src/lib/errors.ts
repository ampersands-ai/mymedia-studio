export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public severity: 'low' | 'medium' | 'high' | 'critical',
    public recoverable: boolean = false,
    public metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string, metadata?: Record<string, unknown>) {
    super('AUTH_ERROR', message, 'high', true, metadata);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, metadata?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, 'medium', true, metadata);
  }
}

export class NetworkError extends AppError {
  constructor(message: string, metadata?: Record<string, unknown>) {
    super('NETWORK_ERROR', message, 'medium', true, metadata);
  }
}

export class StorageError extends AppError {
  constructor(code: string, message: string, metadata?: Record<string, unknown>) {
    super(`STORAGE_${code}`, message, 'high', false, metadata);
  }
}

export class GenerationError extends AppError {
  constructor(code: string, message: string, metadata?: Record<string, unknown>) {
    super(`GENERATION_${code}`, message, 'medium', true, metadata);
  }
}

/**
 * Convert unknown errors to structured AppError instances
 * Uses explicit error detection with fallback to message parsing
 */
export function handleError(error: unknown, context?: Record<string, unknown>): AppError {
  // Already structured - return as-is
  if (error instanceof AppError) {
    return error;
  }

  // Check for HTTP fetch errors with status codes
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as any).status;
    if (status === 401 || status === 403) {
      return new AuthenticationError(
        error instanceof Error ? error.message : 'Authentication failed',
        { ...context, httpStatus: status }
      );
    }
    if (status >= 400 && status < 500) {
      return new ValidationError(
        error instanceof Error ? error.message : 'Request validation failed',
        { ...context, httpStatus: status }
      );
    }
    if (status >= 500) {
      return new NetworkError(
        error instanceof Error ? error.message : 'Server error',
        { ...context, httpStatus: status }
      );
    }
  }

  // Standard Error object - use improved detection
  if (error instanceof Error) {
    const msg = error.message;
    const msgLower = msg.toLowerCase();

    // Check error constructor name first (more reliable than message)
    const errorType = error.constructor.name;
    if (errorType === 'AuthError' || errorType === 'AuthenticationError') {
      return new AuthenticationError(msg, { ...context, errorType });
    }
    if (errorType === 'ValidationError' || errorType === 'TypeError') {
      return new ValidationError(msg, { ...context, errorType });
    }
    if (errorType === 'NetworkError' || errorType === 'FetchError') {
      return new NetworkError(msg, { ...context, errorType });
    }

    // Fallback to message parsing (log warning for debugging)
    if (msgLower.includes('401') || msgLower.includes('403') || msgLower.includes('unauthorized')) {
      console.warn('[Error Classification] Using message inference for auth error:', msg.substring(0, 100));
      return new AuthenticationError(msg, { ...context, inferredFrom: 'message' });
    }
    if (msgLower.includes('network') || msgLower.includes('fetch failed')) {
      console.warn('[Error Classification] Using message inference for network error:', msg.substring(0, 100));
      return new NetworkError(msg, { ...context, inferredFrom: 'message' });
    }
    if (msgLower.includes('invalid') || (msgLower.includes('validation') && !msgLower.includes('auth'))) {
      console.warn('[Error Classification] Using message inference for validation error:', msg.substring(0, 100));
      return new ValidationError(msg, { ...context, inferredFrom: 'message' });
    }
    if (msgLower.includes('storage') || msgLower.includes('bucket')) {
      console.warn('[Error Classification] Using message inference for storage error:', msg.substring(0, 100));
      return new StorageError('ERROR', msg, { ...context, inferredFrom: 'message' });
    }
    if (msgLower.includes('generation') || msgLower.includes('timeout')) {
      console.warn('[Error Classification] Using message inference for generation error:', msg.substring(0, 100));
      return new GenerationError('ERROR', msg, { ...context, inferredFrom: 'message' });
    }

    // Unknown error - wrap with full context
    return new AppError('UNKNOWN_ERROR', msg, 'medium', false, {
      ...context,
      originalError: errorType,
      message: msg
    });
  }

  // Non-Error object
  return new AppError('UNKNOWN_ERROR', String(error), 'medium', false, {
    ...context,
    errorType: typeof error
  });
}

export async function safeExecute<T>(
  fn: () => Promise<T>
): Promise<{ data: T | null; error: AppError | null }> {
  try {
    const data = await fn();
    return { data, error: null };
  } catch (error) {
    return { data: null, error: handleError(error) };
  }
}
