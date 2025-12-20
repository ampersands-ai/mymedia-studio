/**
 * Error Formatting Utility
 *
 * Provides reusable error formatting and handling functions.
 * Extracted from duplicate implementations across error handlers.
 * 
 * All error messages are automatically sanitized to remove
 * proprietary provider names before reaching users.
 *
 * @module errorFormatting
 */

import { sanitizeProprietaryTerms } from './errorSanitizer';

/**
 * Format error to user-friendly message
 *
 * @param error - Error object, string, or unknown value
 * @returns User-friendly error message
 *
 * @example
 * ```typescript
 * try {
 *   await someOperation();
 * } catch (error) {
 *   toast.error(formatErrorMessage(error));
 * }
 * ```
 */
export function formatErrorMessage(error: unknown): string {
  let message: string;

  if (typeof error === 'string') {
    message = error;
  } else if (error instanceof Error) {
    message = error.message;
  } else if (error && typeof error === 'object') {
    // Check for common error object patterns
    if ('message' in error && typeof error.message === 'string') {
      message = error.message;
    } else if ('error' in error && typeof error.error === 'string') {
      message = error.error;
    } else if ('statusText' in error && typeof error.statusText === 'string') {
      message = error.statusText;
    } else {
      // Try to stringify object
      try {
        const stringified = JSON.stringify(error);
        message = stringified !== '{}' ? stringified : 'An unexpected error occurred';
      } catch {
        message = 'An unexpected error occurred';
      }
    }
  } else {
    message = 'An unexpected error occurred';
  }

  // Sanitize proprietary terms before returning
  return sanitizeProprietaryTerms(message);
}

/**
 * Format error with context
 *
 * @param error - Error object
 * @param context - Additional context
 * @returns Formatted error message with context
 *
 * @example
 * ```typescript
 * const message = formatErrorWithContext(error, 'Failed to upload image');
 * // "Failed to upload image: File too large"
 * ```
 */
export function formatErrorWithContext(error: unknown, context: string): string {
  const errorMessage = formatErrorMessage(error);
  return `${context}: ${errorMessage}`;
}

/**
 * Extract error status code if available
 *
 * @param error - Error object
 * @returns Status code or undefined
 */
export function getErrorStatusCode(error: unknown): number | undefined {
  if (error && typeof error === 'object') {
    if ('status' in error && typeof error.status === 'number') {
      return error.status;
    }
    if ('statusCode' in error && typeof error.statusCode === 'number') {
      return error.statusCode;
    }
    if ('code' in error && typeof error.code === 'number') {
      return error.code;
    }
  }
  return undefined;
}

/**
 * Check if error is a network error
 *
 * @param error - Error object
 * @returns True if network error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('connection') ||
      message.includes('offline') ||
      error.name === 'NetworkError' ||
      error.name === 'TypeError' && message.includes('failed to fetch')
    );
  }
  return false;
}

/**
 * Check if error is a timeout error
 *
 * @param error - Error object
 * @returns True if timeout error
 */
export function isTimeoutError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('timeout') ||
      message.includes('timed out') ||
      error.name === 'TimeoutError' ||
      error.name === 'AbortError'
    );
  }
  return false;
}

/**
 * Check if error is an authentication error
 *
 * @param error - Error object
 * @returns True if auth error
 */
export function isAuthError(error: unknown): boolean {
  const statusCode = getErrorStatusCode(error);
  if (statusCode === 401 || statusCode === 403) {
    return true;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('unauthorized') ||
      message.includes('authentication') ||
      message.includes('not authenticated') ||
      message.includes('invalid token') ||
      message.includes('token expired')
    );
  }

  return false;
}

/**
 * Check if error is a validation error
 *
 * @param error - Error object
 * @returns True if validation error
 */
export function isValidationError(error: unknown): boolean {
  const statusCode = getErrorStatusCode(error);
  if (statusCode === 400 || statusCode === 422) {
    return true;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('validation') ||
      message.includes('invalid') ||
      message.includes('required') ||
      message.includes('must be')
    );
  }

  return false;
}

/**
 * Check if error is a rate limit error
 *
 * @param error - Error object
 * @returns True if rate limit error
 */
export function isRateLimitError(error: unknown): boolean {
  const statusCode = getErrorStatusCode(error);
  if (statusCode === 429) {
    return true;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('rate limit') ||
      message.includes('too many requests') ||
      message.includes('throttled')
    );
  }

  return false;
}

/**
 * Get user-friendly error message based on error type
 *
 * @param error - Error object
 * @returns User-friendly message
 *
 * @example
 * ```typescript
 * const message = getUserFriendlyError(error);
 * toast.error(message);
 * ```
 */
export function getUserFriendlyError(error: unknown): string {
  if (isNetworkError(error)) {
    return 'Network connection error. Please check your internet connection and try again.';
  }

  if (isTimeoutError(error)) {
    return 'Request timed out. Please try again.';
  }

  if (isAuthError(error)) {
    return 'Authentication error. Please sign in again.';
  }

  if (isRateLimitError(error)) {
    return 'Too many requests. Please wait a moment and try again.';
  }

  if (isValidationError(error)) {
    return formatErrorMessage(error);
  }

  const statusCode = getErrorStatusCode(error);
  if (statusCode) {
    switch (statusCode) {
      case 404:
        return 'Resource not found.';
      case 500:
        return 'Server error. Please try again later.';
      case 502:
      case 503:
      case 504:
        return 'Service temporarily unavailable. Please try again later.';
      default:
        return formatErrorMessage(error);
    }
  }

  return formatErrorMessage(error);
}

/**
 * Create error object with additional context
 *
 * @param message - Error message
 * @param context - Additional context object
 * @returns Error with context
 */
export function createErrorWithContext(
  message: string,
  context: Record<string, unknown>
): Error & { context: Record<string, unknown> } {
  const error = new Error(message) as Error & { context: Record<string, unknown> };
  error.context = context;
  return error;
}

/**
 * Safe error logging
 *
 * Logs error without exposing sensitive information
 *
 * @param error - Error to log
 * @param context - Additional context
 * @returns Sanitized error object for logging
 */
export function sanitizeErrorForLogging(
  error: unknown,
  context?: Record<string, unknown>
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {
    message: formatErrorMessage(error),
    timestamp: new Date().toISOString(),
  };

  if (error instanceof Error) {
    sanitized.name = error.name;
    sanitized.stack = error.stack;
  }

  const statusCode = getErrorStatusCode(error);
  if (statusCode) {
    sanitized.statusCode = statusCode;
  }

  if (context) {
    // Remove sensitive fields
    const safeContext = { ...context };
    const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'authorization'];

    for (const field of sensitiveFields) {
      if (field in safeContext) {
        safeContext[field] = '[REDACTED]';
      }
    }

    sanitized.context = safeContext;
  }

  return sanitized;
}

/**
 * Aggregate multiple errors into a single message
 *
 * @param errors - Array of errors
 * @param separator - Separator between messages (default: '; ')
 * @returns Combined error message
 *
 * @example
 * ```typescript
 * const errors = [new Error('Error 1'), new Error('Error 2')];
 * aggregateErrors(errors) // "Error 1; Error 2"
 * ```
 */
export function aggregateErrors(
  errors: unknown[],
  separator: string = '; '
): string {
  const messages = errors
    .map(formatErrorMessage)
    .filter(msg => msg !== 'An unexpected error occurred');

  if (messages.length === 0) {
    return 'Multiple errors occurred';
  }

  return messages.join(separator);
}

/**
 * Extract validation errors from error object
 *
 * Common for API validation errors
 *
 * @param error - Error object
 * @returns Array of validation error messages
 */
export function extractValidationErrors(error: unknown): string[] {
  if (!error || typeof error !== 'object') {
    return [];
  }

  // Check for common validation error formats
  if ('errors' in error && Array.isArray(error.errors)) {
    return error.errors.map((e: any) => {
      if (typeof e === 'string') return e;
      if (e.message) return e.message;
      if (e.msg) return e.msg;
      return String(e);
    });
  }

  if ('validationErrors' in error && Array.isArray(error.validationErrors)) {
    return error.validationErrors.map((e: any) => {
      if (typeof e === 'string') return e;
      if (e.message) return e.message;
      return String(e);
    });
  }

  // Check for field-specific errors
  if ('fields' in error && typeof error.fields === 'object' && error.fields) {
    const fieldErrors: string[] = [];
    for (const [field, fieldError] of Object.entries(error.fields)) {
      if (typeof fieldError === 'string') {
        fieldErrors.push(`${field}: ${fieldError}`);
      } else if (Array.isArray(fieldError)) {
        fieldErrors.push(`${field}: ${fieldError.join(', ')}`);
      }
    }
    return fieldErrors;
  }

  return [];
}

/**
 * Format validation errors for display
 *
 * @param error - Error object
 * @returns Formatted validation error message
 */
export function formatValidationErrors(error: unknown): string {
  const errors = extractValidationErrors(error);
  if (errors.length === 0) {
    return formatErrorMessage(error);
  }
  return errors.join('\n');
}

/**
 * Retry-able error checker
 *
 * Determines if an error should trigger a retry
 *
 * @param error - Error object
 * @returns True if error is retry-able
 */
export function isRetryableError(error: unknown): boolean {
  // Network errors are retry-able
  if (isNetworkError(error)) {
    return true;
  }

  // Timeout errors are retry-able
  if (isTimeoutError(error)) {
    return true;
  }

  // Rate limit errors are retry-able (with backoff)
  if (isRateLimitError(error)) {
    return true;
  }

  // Certain status codes are retry-able
  const statusCode = getErrorStatusCode(error);
  if (statusCode) {
    return [408, 429, 500, 502, 503, 504].includes(statusCode);
  }

  return false;
}
