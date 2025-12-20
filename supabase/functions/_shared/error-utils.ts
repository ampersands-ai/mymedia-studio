/**
 * Error utility functions for edge functions
 */

import { sanitizeErrorMessage } from "./error-sanitizer.ts";

/**
 * Safely converts unknown error to Error instance
 */
export function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  return new Error(String(error));
}

/**
 * Extracts error message from unknown error
 * Automatically sanitizes proprietary provider names
 */
export function getErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return sanitizeErrorMessage(message);
}
