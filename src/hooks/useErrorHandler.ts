/**
 * useErrorHandler Hook
 *
 * Provides consistent error handling across the application.
 * Consolidates the pattern of try-catch with toast notifications and logging.
 *
 * Usage:
 * ```tsx
 * const { execute, isExecuting, error } = useErrorHandler();
 *
 * await execute(
 *   () => updateProfile(data),
 *   {
 *     successMessage: 'Profile updated successfully',
 *     errorMessage: 'Failed to update profile',
 *     context: { userId, operation: 'update_profile' }
 *   }
 * );
 * ```
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { clientLogger } from '@/lib/logging/client-logger';
import {
  ApplicationError,
  getUserErrorMessage,
  getErrorCode,
  ValidationError,
  AuthenticationError,
  NetworkError,
  type ErrorContext,
} from '@/lib/errors/custom-errors';

export interface ExecuteOptions {
  /** Success message to show in toast */
  successMessage?: string;
  /** Error message to show in toast (overrides default) */
  errorMessage?: string;
  /** Additional context for error logging */
  context?: ErrorContext;
  /** Whether to show success toast (default: true if successMessage provided) */
  showSuccessToast?: boolean;
  /** Whether to show error toast (default: true) */
  showErrorToast?: boolean;
  /** Custom success callback */
  onSuccess?: () => void;
  /** Custom error callback */
  onError?: (error: Error) => void;
}

export interface UseErrorHandlerReturn {
  /** Execute an async operation with error handling */
  execute: <T>(
    operation: () => Promise<T>,
    options?: ExecuteOptions
  ) => Promise<T | null>;
  /** Whether an operation is currently executing */
  isExecuting: boolean;
  /** Last error that occurred */
  error: Error | null;
  /** Clear the last error */
  clearError: () => void;
}

export function useErrorHandler(): UseErrorHandlerReturn {
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const execute = useCallback(
    async <T,>(
      operation: () => Promise<T>,
      options: ExecuteOptions = {}
    ): Promise<T | null> => {
      const {
        successMessage,
        errorMessage,
        context,
        showSuccessToast = !!successMessage,
        showErrorToast = true,
        onSuccess,
        onError,
      } = options;

      setIsExecuting(true);
      setError(null);

      try {
        const result = await operation();

        // Success handling
        if (showSuccessToast && successMessage) {
          toast.success(successMessage);
        }

        if (onSuccess) {
          onSuccess();
        }

        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);

        // Log error with context
        logger.error('Operation failed', error, {
          ...context,
          errorCode: getErrorCode(error),
        });

        // Send critical/high severity errors to backend for email alerting
        const severity = error instanceof AuthenticationError ? 'high' :
                        error instanceof NetworkError ? 'medium' : 'high';
        clientLogger.error(error, {
          routeName: context?.component || 'unknown',
          userAction: context?.operation,
          severity,
          metadata: context,
        }).catch(() => {}); // Fire and forget

        // Determine error message
        let displayMessage: string;
        if (errorMessage) {
          displayMessage = errorMessage;
        } else {
          displayMessage = getUserErrorMessage(error);
        }

        // Show appropriate toast based on error type
        if (showErrorToast) {
          if (error instanceof ValidationError) {
            toast.error(displayMessage, {
              description: error.field
                ? `Invalid value for ${error.field}`
                : undefined,
            });
          } else if (error instanceof AuthenticationError) {
            toast.error('Authentication required', {
              description: 'Please log in to continue',
            });
          } else if (error instanceof NetworkError) {
            toast.error(displayMessage, {
              description:
                error.statusCode === 503
                  ? 'Service temporarily unavailable'
                  : 'Please check your connection and try again',
            });
          } else if (error instanceof ApplicationError && error.recoverable) {
            toast.error(displayMessage, {
              description: 'Please try again',
              action: {
                label: 'Retry',
                onClick: () => execute(operation, options),
              },
            });
          } else {
            toast.error(displayMessage);
          }
        }

        // Call custom error handler
        if (onError) {
          onError(error);
        }

        return null;
      } finally {
        setIsExecuting(false);
      }
    },
    []
  );

  return {
    execute,
    isExecuting,
    error,
    clearError,
  };
}

/**
 * Simplified version for one-off operations without state tracking
 */
export async function handleOperation<T>(
  operation: () => Promise<T>,
  options: ExecuteOptions = {}
): Promise<T | null> {
  const {
    successMessage,
    errorMessage,
    context,
    showSuccessToast = !!successMessage,
    showErrorToast = true,
    onSuccess,
    onError,
  } = options;

  try {
    const result = await operation();

    if (showSuccessToast && successMessage) {
      toast.success(successMessage);
    }

    if (onSuccess) {
      onSuccess();
    }

    return result;
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));

    logger.error('Operation failed', error, {
      ...context,
      errorCode: getErrorCode(error),
    });

    // Send errors to backend for email alerting
    clientLogger.error(error, {
      routeName: context?.component || 'unknown',
      userAction: context?.operation,
      severity: 'high',
      metadata: context,
    }).catch(() => {}); // Fire and forget

    const displayMessage = errorMessage || getUserErrorMessage(error);

    if (showErrorToast) {
      toast.error(displayMessage);
    }

    if (onError) {
      onError(error);
    }

    return null;
  }
}
