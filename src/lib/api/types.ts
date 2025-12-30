/**
 * Type-safe API response wrappers
 * 
 * Provides discriminated union pattern for exhaustive type checking
 * of API responses throughout the application.
 * 
 * @module api/types
 */

/**
 * Successful API response wrapper
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * Error details for API error responses
 */
export interface ApiErrorDetails {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  /** HTTP status code if applicable */
  status?: number;
}

/**
 * Failed API response wrapper
 */
export interface ApiErrorResponse {
  success: false;
  error: ApiErrorDetails;
}

/**
 * Discriminated union for API responses
 * Use type guards (isApiSuccess, isApiError) for type narrowing
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Paginated API response with metadata
 */
export interface PaginatedApiResponse<T> extends ApiSuccessResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/**
 * Type guard for success responses
 * 
 * @example
 * ```typescript
 * const response = await fetchData();
 * if (isApiSuccess(response)) {
 *   // TypeScript knows response.data exists
 *   console.log(response.data);
 * }
 * ```
 */
export function isApiSuccess<T>(
  response: ApiResponse<T>
): response is ApiSuccessResponse<T> {
  return response.success === true;
}

/**
 * Type guard for error responses
 * 
 * @example
 * ```typescript
 * const response = await fetchData();
 * if (isApiError(response)) {
 *   // TypeScript knows response.error exists
 *   console.error(response.error.message);
 * }
 * ```
 */
export function isApiError<T>(
  response: ApiResponse<T>
): response is ApiErrorResponse {
  return response.success === false;
}

/**
 * Unwrap API response or throw on error
 * 
 * @throws Error if response is an error response
 * 
 * @example
 * ```typescript
 * try {
 *   const data = unwrapApiResponse(response);
 *   // Use data safely
 * } catch (error) {
 *   // Handle error
 * }
 * ```
 */
export function unwrapApiResponse<T>(response: ApiResponse<T>): T {
  if (isApiSuccess(response)) {
    return response.data;
  }
  throw new Error(response.error.message);
}

/**
 * Create a success response wrapper
 */
export function createSuccessResponse<T>(data: T): ApiSuccessResponse<T> {
  return { success: true, data };
}

/**
 * Create an error response wrapper
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: Record<string, unknown>
): ApiErrorResponse {
  return {
    success: false,
    error: { code, message, details }
  };
}

/**
 * Common API error codes
 */
export const API_ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
} as const;

export type ApiErrorCode = typeof API_ERROR_CODES[keyof typeof API_ERROR_CODES];
