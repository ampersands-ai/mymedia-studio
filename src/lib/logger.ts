import { clientLogger } from '@/lib/logging/client-logger';

/**
 * Production-safe structured logging utility
 * Provides comprehensive logging with proper severity levels and backend integration
 */

declare global {
  interface Window {
    posthog?: any;
  }
}


class Logger {
  private context: any = {};

  /**
   * Create a child logger with additional context
   */
  child(context: any): Logger {
    const childLogger = new Logger();
    childLogger.context = { ...this.context, ...context };
    return childLogger;
  }

  private formatMessage(level: string, message: string, context?: any): string {
    const ctx = { ...this.context, ...context };
    return `[${level.toUpperCase()}] ${message} ${JSON.stringify(ctx)}`;
  }

  /**
   * Debug logging - only in development
   */
  debug(message: string, context?: any): void {
    if (import.meta.env.DEV) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  /**
   * Info logging - only in development
   */
  info(message: string, context?: any): void {
    if (import.meta.env.DEV) {
      console.log(this.formatMessage('info', message, context));
    }
  }

  /**
   * Warning logging - always logged, sent to PostHog in production
   */
  warn(message: string, context?: any): void {
    console.warn(this.formatMessage('warn', message, context));
    
    if (!import.meta.env.DEV && typeof window !== 'undefined' && window.posthog) {
      window.posthog.capture('warning', {
        message,
        ...this.context,
        ...context
      });
    }
  }

  /**
   * Error logging - always logged, sent to backend and PostHog
   */
  error(message: string, error?: Error, context?: any): void {
    console.error(this.formatMessage('error', message, context), error);
    
    const errorContext: any = {
      message,
      errorName: error?.name,
      errorMessage: error?.message,
      stack: error?.stack,
      ...this.context,
      ...context
    };

    // Send to backend
    if (error) {
      clientLogger.error(error, {
        routeName: errorContext.routeName || errorContext.route || 'unknown',
        ...errorContext
      } as any).catch(console.error);
    }

    // Send to PostHog
    if (typeof window !== 'undefined' && window.posthog) {
      window.posthog.capture('error', errorContext);
    }
  }

  /**
   * Critical error logging - highest priority, always sent to monitoring
   */
  critical(message: string, error?: Error, context?: any): void {
    console.error(this.formatMessage('critical', message, context), error);
    
    const errorContext: any = {
      message,
      severity: 'critical',
      errorName: error?.name,
      errorMessage: error?.message,
      stack: error?.stack,
      ...this.context,
      ...context
    };

    // Always log critical errors to backend
    if (error) {
      clientLogger.error(error, {
        routeName: errorContext.routeName || errorContext.route || 'unknown',
        ...errorContext
      } as any).catch(console.error);
    }

    // Send to PostHog with high priority
    if (typeof window !== 'undefined' && window.posthog) {
      window.posthog.capture('critical_error', errorContext);
    }
  }
}

export const logger = new Logger();
