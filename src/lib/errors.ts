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
  constructor(message: string, metadata?: Record<string, unknown>) {
    super('STORAGE_ERROR', message, 'high', false, metadata);
  }
}

export class GenerationError extends AppError {
  constructor(message: string, metadata?: Record<string, unknown>) {
    super('GENERATION_ERROR', message, 'medium', true, metadata);
  }
}

export function handleError(error: unknown, context?: Record<string, unknown>): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    
    if (msg.includes('auth') || msg.includes('unauthorized')) {
      return new AuthenticationError(error.message, context);
    }
    if (msg.includes('network') || msg.includes('fetch')) {
      return new NetworkError(error.message, context);
    }
    if (msg.includes('invalid') || msg.includes('validation')) {
      return new ValidationError(error.message, context);
    }
    if (msg.includes('storage') || msg.includes('bucket')) {
      return new StorageError(error.message, context);
    }
    if (msg.includes('generation') || msg.includes('timeout')) {
      return new GenerationError(error.message, context);
    }
    
    return new AppError('UNKNOWN_ERROR', error.message, 'medium', false, {
      ...context,
      originalError: error.constructor.name
    });
  }

  return new AppError('UNKNOWN_ERROR', String(error), 'medium', false, context);
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
