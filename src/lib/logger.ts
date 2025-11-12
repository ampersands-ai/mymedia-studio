/**
 * Production-safe logging utility
 * Provides structured logging with appropriate levels
 */

declare global {
  interface Window {
    posthog?: any;
  }
}

export const logger = {
  /**
   * Error logging - always logged, sent to monitoring
   */
  error: (message: string, context?: any) => {
    console.error(`[ERROR] ${message}`, context);
    
    // Send to PostHog if available
    if (typeof window !== 'undefined' && window.posthog) {
      window.posthog.capture('error', { message, context });
    }
  },

  /**
   * Warning logging - always logged
   */
  warn: (message: string, context?: any) => {
    console.warn(`[WARN] ${message}`, context);
  },

  /**
   * Info logging - only in development
   */
  info: (message: string, context?: any) => {
    if (import.meta.env.DEV) {
      console.log(`[INFO] ${message}`, context);
    }
  },

  /**
   * Critical logging - always logged, shows toast, sent to monitoring
   */
  critical: (message: string, context?: any) => {
    console.error(`[CRITICAL] ${message}`, context);
    
    // Send to PostHog if available
    if (typeof window !== 'undefined' && window.posthog) {
      window.posthog.capture('critical_error', { message, context });
    }
  },

  /**
   * Debug logging - only in development
   */
  debug: (message: string, context?: any) => {
    if (import.meta.env.DEV) {
      console.debug(`[DEBUG] ${message}`, context);
    }
  }
};
