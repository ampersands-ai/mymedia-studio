/**
 * Shared Constants
 * Centralized constants used across edge functions
 * Prevents typos and ensures consistency across the codebase
 */

// Generation statuses
export const GENERATION_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
} as const;

// Webhook callback states
export const WEBHOOK_CALLBACK_STATES = {
  SUCCESS: 'success',
  FAILED: 'failed',
  PROCESSING: 'processing'
} as const;

// Video job statuses
export const VIDEO_JOB_STATUS = {
  PENDING: 'pending',
  GENERATING_SCRIPT: 'generating_script',
  AWAITING_SCRIPT_APPROVAL: 'awaiting_script_approval',
  GENERATING_VOICE: 'generating_voice',
  AWAITING_VOICE_APPROVAL: 'awaiting_voice_approval',
  FETCHING_VIDEO: 'fetching_video',
  ASSEMBLING: 'assembling',
  COMPLETED: 'completed',
  FAILED: 'failed'
} as const;

// Storyboard statuses
export const STORYBOARD_STATUS = {
  DRAFT: 'draft',
  GENERATING: 'generating',
  COMPLETED: 'completed',
  FAILED: 'failed'
} as const;

// Audit log actions
export const AUDIT_ACTIONS = {
  LOGIN_FAILED: 'login_failed',
  SIGNUP_SUCCESS: 'signup_success',
  SECURITY_ALERT: 'security_alert',
  TOKENS_DEDUCTED: 'tokens_deducted',
  TOKENS_REFUNDED: 'tokens_refunded',
  GENERATION_CREATED: 'generation_created',
  GENERATION_COMPLETED: 'generation_completed',
  GENERATION_FAILED: 'generation_failed',
  GENERATION_CANCELED: 'generation_canceled',
  CLEANUP_STUCK_GENERATIONS: 'cleanup_stuck_generations',
  CREDITS_MODIFIED: 'credits_modified'
} as const;

// Alert types for security monitoring
export const ALERT_TYPES = {
  MULTIPLE_FAILED_LOGINS: 'MULTIPLE_FAILED_LOGINS',
  RAPID_ACCOUNT_CREATION: 'RAPID_ACCOUNT_CREATION',
  UNUSUAL_TOKEN_USAGE: 'UNUSUAL_TOKEN_USAGE'
} as const;

// Alert severity levels
export const ALERT_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
} as const;

// Log levels for logging
export const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  CRITICAL: 'critical'
} as const;

// Email delivery statuses
export const DELIVERY_STATUS = {
  SENT: 'sent',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  BOUNCED: 'bounced',
  OPENED: 'opened'
} as const;

// System configuration constants
export const SYSTEM_LIMITS = {
  // Maximum concurrent requests for generate-content endpoint
  // Prevents overwhelming the system during high traffic
  CONCURRENT_REQUESTS: 750,

  // Maximum prompt length in characters
  MAX_PROMPT_LENGTH: 10000,

  // Maximum file upload size in bytes (100MB)
  MAX_FILE_SIZE: 100 * 1024 * 1024
} as const;

// Timeout configuration (in milliseconds)
export const TIMEOUTS = {
  // Default timeout for HTTP requests (60 seconds)
  DEFAULT: 60000,

  // Long-running operations (10 minutes)
  LONG_RUNNING: 600000,

  // Short operations (10 seconds)
  SHORT: 10000,

  // Circuit breaker timeout (1 minute)
  CIRCUIT_BREAKER: 60000,

  // Storage circuit breaker timeout (30 seconds)
  CIRCUIT_BREAKER_STORAGE: 30000
} as const;

// Retry configuration
export const RETRY_CONFIG = {
  // Maximum number of retry attempts
  MAX_ATTEMPTS: 3,

  // Initial retry delay in milliseconds
  INITIAL_DELAY: 1000,

  // Maximum retry delay in milliseconds (for exponential backoff)
  MAX_DELAY: 30000,

  // Multiplier for exponential backoff
  BACKOFF_MULTIPLIER: 2
} as const;

// Polling configuration
export const POLLING_CONFIG = {
  // Initial polling interval (5 seconds)
  INITIAL_INTERVAL: 5000,

  // Maximum polling interval (60 seconds)
  MAX_INTERVAL: 60000,

  // Polling interval multiplier for exponential backoff
  INTERVAL_MULTIPLIER: 1.5,

  // Maximum polling duration (2 hours)
  MAX_DURATION: 7200000
} as const;
