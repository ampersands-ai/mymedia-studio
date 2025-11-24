/**
 * Shared Constants
 * Centralized constants used across edge functions
 */

export const GENERATION_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
} as const;

export const WEBHOOK_CALLBACK_STATES = {
  SUCCESS: 'success',
  FAILED: 'failed',
  PROCESSING: 'processing'
} as const;
