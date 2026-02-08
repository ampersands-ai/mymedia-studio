/**
 * Custom Error Types
 *
 * Provides structured error handling with context and error codes.
 * Used throughout the application for consistent error handling.
 * 
 * All user-facing error messages are automatically sanitized to remove
 * proprietary provider names.
 */

import { sanitizeProprietaryTerms } from '@/lib/utils/errorSanitizer';

export interface ErrorContext {
  userId?: string;
  resourceId?: string;
  operation?: string;
  component?: string;
  [key: string]: unknown;
}

/**
 * Base application error with context and error codes
 */
export class ApplicationError extends Error {
  public readonly code: string;
  public readonly context?: ErrorContext;
  public readonly recoverable: boolean;
  public readonly originalError?: Error;

  constructor(
    code: string,
    message: string,
    options: {
      context?: ErrorContext;
      recoverable?: boolean;
      originalError?: Error | unknown;
    } = {}
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.context = options.context;
    this.recoverable = options.recoverable ?? false;

    // Handle both Error objects and other types
    if (options.originalError instanceof Error) {
      this.originalError = options.originalError;
      this.stack = options.originalError.stack;
    } else if (options.originalError) {
      this.originalError = new Error(String(options.originalError));
    }

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to JSON for logging/API responses
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      recoverable: this.recoverable,
      context: this.context,
      stack: process.env.NODE_ENV === 'development' ? this.stack : undefined,
    };
  }
}

/**
 * Database operation errors
 */
export class DatabaseError extends ApplicationError {
  constructor(
    message: string,
    originalError?: Error | unknown,
    context?: ErrorContext
  ) {
    super('DATABASE_ERROR', message, {
      originalError,
      context,
      recoverable: true, // Most DB errors are transient
    });
  }
}

/**
 * Network/API errors
 */
export class NetworkError extends ApplicationError {
  public readonly statusCode?: number;

  constructor(
    message: string,
    statusCode?: number,
    originalError?: Error | unknown,
    context?: ErrorContext
  ) {
    super('NETWORK_ERROR', message, {
      originalError,
      context: { ...context, statusCode },
      recoverable: true,
    });
    this.statusCode = statusCode;
  }
}

/**
 * Validation errors
 */
export class ValidationError extends ApplicationError {
  public readonly field?: string;

  constructor(message: string, field?: string, context?: ErrorContext) {
    super('VALIDATION_ERROR', message, {
      context: { ...context, field },
      recoverable: true,
    });
    this.field = field;
  }
}

/**
 * Authentication errors
 */
export class AuthenticationError extends ApplicationError {
  constructor(message: string, originalError?: Error | unknown, context?: ErrorContext) {
    super('AUTHENTICATION_ERROR', message, {
      originalError,
      context,
      recoverable: false,
    });
  }
}

/**
 * Authorization errors
 */
export class AuthorizationError extends ApplicationError {
  constructor(message: string, context?: ErrorContext) {
    super('AUTHORIZATION_ERROR', message, {
      context,
      recoverable: false,
    });
  }
}

/**
 * Not found errors
 */
export class NotFoundError extends ApplicationError {
  public readonly resourceType?: string;

  constructor(resourceType: string, resourceId?: string, context?: ErrorContext) {
    super(
      'NOT_FOUND',
      `${resourceType}${resourceId ? ` with ID ${resourceId}` : ''} not found`,
      {
        context: { ...context, resourceType, resourceId },
        recoverable: false,
      }
    );
    this.resourceType = resourceType;
  }
}

/**
 * Rate limit errors
 */
export class RateLimitError extends ApplicationError {
  public readonly retryAfter?: number;

  constructor(message: string, retryAfter?: number, context?: ErrorContext) {
    super('RATE_LIMIT_ERROR', message, {
      context: { ...context, retryAfter },
      recoverable: true,
    });
    this.retryAfter = retryAfter;
  }
}

/**
 * Storage errors
 */
export class StorageError extends ApplicationError {
  constructor(message: string, originalError?: Error | unknown, context?: ErrorContext) {
    super('STORAGE_ERROR', message, {
      originalError,
      context,
      recoverable: true,
    });
  }
}

/**
 * Payment errors
 */
export class PaymentError extends ApplicationError {
  constructor(message: string, originalError?: Error | unknown, context?: ErrorContext) {
    super('PAYMENT_ERROR', message, {
      originalError,
      context,
      recoverable: false,
    });
  }
}

/**
 * Check if error is an ApplicationError
 */
export function isApplicationError(error: unknown): error is ApplicationError {
  return error instanceof ApplicationError;
}

/**
 * Get user-friendly error message
 * Automatically sanitizes proprietary terms from the message.
 */
export function getUserErrorMessage(error: unknown): string {
  let message: string;

  if (isApplicationError(error)) {
    message = error.message;
  } else if (error instanceof Error) {
    // Check if message appears to be technical (not user-friendly)
    const technicalPatterns = [
      /^TypeError:/i,
      /^ReferenceError:/i,
      /^SyntaxError:/i,
      /^RangeError:/i,
      /undefined is not/i,
      /cannot read propert/i,
      /is not a function/i,
      /is not defined/i,
      /at \w+\.\w+\s*\(/,  // Stack trace patterns
      /Object\.<anonymous>/,
      /Module not found/i,
      /ENOENT/i,
      /ECONNREFUSED/i,
      /Edge function failed/i,
      /Edge Function returned/i,
      /FunctionsHttpError/i,
      /FunctionsRelayError/i,
      /FunctionsFetchError/i,
      /non-2xx/i,
      /status code/i,
      /internal server error/i,
    ];
    
    const isTechnical = technicalPatterns.some(pattern => 
      pattern.test(error.message)
    );
    
    // Pass through user-friendly messages, mask technical ones
    if (!isTechnical && error.message) {
      message = error.message;
    } else {
      return 'Check parameters or refresh browser to clear cache';
    }
  } else {
    return 'Check parameters or refresh browser to clear cache';
  }

  // Sanitize proprietary terms before returning
  return sanitizeProprietaryTerms(message);
}

/**
 * Get error code for logging/tracking
 */
export function getErrorCode(error: unknown): string {
  if (isApplicationError(error)) {
    return error.code;
  }

  if (error instanceof Error) {
    return 'UNKNOWN_ERROR';
  }

  return 'INVALID_ERROR_TYPE';
}
