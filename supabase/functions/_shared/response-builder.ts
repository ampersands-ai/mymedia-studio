import { createSafeErrorResponse } from './error-handler.ts';

/**
 * Standardized response builder for edge functions
 * Provides consistent response formatting
 */
export class ResponseBuilder {
  /**
   * Build a success response
   * 
   * @param data - Response data
   * @param status - HTTP status code
   * @param headers - Additional headers
   * @returns Response object
   */
  static success<T>(
    data: T,
    status: number = 200,
    headers: Record<string, string> = {}
  ): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    });
  }

  /**
   * Build an error response using the safe error handler
   * 
   * @param error - Error object
   * @param context - Context string for logging
   * @param headers - Additional headers
   * @returns Response object
   */
  static error(
    error: Error,
    context: string,
    headers: Record<string, string> = {}
  ): Response {
    return createSafeErrorResponse(error, context, headers);
  }

  /**
   * Build a validation error response
   */
  static validationError(
    message: string,
    errors?: Record<string, string[]>,
    headers: Record<string, string> = {}
  ): Response {
    return new Response(
      JSON.stringify({
        error: message,
        code: 'VALIDATION_ERROR',
        details: errors,
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      }
    );
  }

  /**
   * Build an unauthorized response
   */
  static unauthorized(
    message: string = 'Unauthorized',
    headers: Record<string, string> = {}
  ): Response {
    return new Response(
      JSON.stringify({
        error: message,
        code: 'UNAUTHORIZED',
      }),
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      }
    );
  }
}
