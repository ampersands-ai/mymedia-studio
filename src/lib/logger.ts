import { clientLogger } from '@/lib/logging/client-logger';
import { supabase } from '@/integrations/supabase/client';

/**
 * Production-safe structured logging utility with request tracking and performance monitoring
 * Provides comprehensive logging with proper severity levels and backend integration
 */

let requestIdCounter = 0;

/**
 * Generate a unique request ID for tracking related log entries
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${++requestIdCounter}`;
}

/**
 * Get current user context for automatic attachment to logs
 */
async function getUserContext(): Promise<{ userId?: string; email?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return {
      userId: user?.id,
      email: user?.email,
    };
  } catch {
    return {};
  }
}

interface LogBatch {
  logs: Array<{ level: string; message: string; context: Record<string, unknown>; timestamp: number }>;
  timeout: NodeJS.Timeout | null;
}

const logBatch: LogBatch = {
  logs: [],
  timeout: null,
};

/**
 * Flush batched logs to backend
 */
async function flushLogs(): Promise<void> {
  if (logBatch.logs.length === 0) return;
  
  const logsToSend = [...logBatch.logs];
  logBatch.logs = [];
  
  // Send to backend in production
  if (process.env.NODE_ENV !== 'development' && logsToSend.some(log => ['error', 'critical'].includes(log.level))) {
    try {
      const errorLogs = logsToSend.filter(log => ['error', 'critical'].includes(log.level));
      for (const log of errorLogs) {
        await clientLogger.error(new Error(log.message), {
          routeName: (log.context.route as string | undefined) || 'unknown',
          ...log.context
        });
      }
    } catch (e) {
      console.error('Failed to flush logs:', e);
    }
  }
}

/**
 * Add log to batch for efficient backend transmission
 */
function batchLog(level: string, message: string, context: Record<string, unknown>): void {
  logBatch.logs.push({
    level,
    message,
    context,
    timestamp: Date.now(),
  });
  
  // Auto-flush after 100 logs or 5 seconds
  if (logBatch.logs.length >= 100) {
    if (logBatch.timeout) clearTimeout(logBatch.timeout);
    flushLogs();
  } else if (!logBatch.timeout) {
    logBatch.timeout = setTimeout(() => {
      logBatch.timeout = null;
      flushLogs();
    }, 5000);
  }
}

/**
 * Performance timing helper
 */
export class PerformanceTimer {
  private startTime: number;
  private operation: string;
  private context: Record<string, unknown>;

  constructor(operation: string, context?: Record<string, unknown>) {
    this.operation = operation;
    this.context = context || {};
    this.startTime = performance.now();
  }

  /**
   * End timing and log the duration
   */
  end(additionalContext?: Record<string, unknown>): number {
    const duration = Math.round(performance.now() - this.startTime);
    logger.info(`${this.operation} completed`, {
      ...this.context,
      ...additionalContext,
      duration,
      performanceMetric: true,
    });
    return duration;
  }
}

class Logger {
  private context: Record<string, unknown> = {};

  /**
   * Create a child logger with additional context (e.g., component name, request ID)
   */
  child(context: Record<string, unknown>): Logger {
    const childLogger = new Logger();
    childLogger.context = { ...this.context, ...context };
    return childLogger;
  }

  /**
   * Create a child logger with automatic user context attachment
   */
  async childWithUser(context: Record<string, unknown>): Promise<Logger> {
    const userContext = await getUserContext();
    return this.child({ ...context, ...userContext });
  }

  /**
   * Create a performance timer for measuring operation duration
   */
  startTimer(operation: string, context?: Record<string, unknown>): PerformanceTimer {
    return new PerformanceTimer(operation, { ...this.context, ...context });
  }

  private formatMessage(level: string, message: string, context?: Record<string, unknown>): string {
    const ctx = { ...this.context, ...context };
    return `[${level.toUpperCase()}] ${message} ${JSON.stringify(ctx)}`;
  }

  /**
   * Debug logging - only in development
   */
  debug(message: string, context?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  /**
   * Info logging - only in development
   */
  info(message: string, context?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(this.formatMessage('info', message, context));
    }
  }

  /**
   * Warning logging - always logged, sent to PostHog in production
   */
  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(this.formatMessage('warn', message, context));
    
    if (process.env.NODE_ENV !== 'development' && typeof window !== 'undefined' && window.posthog) {
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
  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    console.error(this.formatMessage('error', message, context), error);

    const errorContext: Record<string, unknown> = {
      message,
      errorName: error?.name,
      errorMessage: error?.message,
      stack: error?.stack,
      ...this.context,
      ...context
    };

    // Batch for efficient backend transmission
    batchLog('error', message, errorContext);

    // Send to PostHog
    if (typeof window !== 'undefined' && window.posthog) {
      window.posthog.capture('error', errorContext);
    }
  }

  /**
   * Critical error logging - highest priority, always sent to monitoring
   */
  critical(message: string, error?: Error, context?: Record<string, unknown>): void {
    console.error(this.formatMessage('critical', message, context), error);

    const errorContext: Record<string, unknown> = {
      message,
      severity: 'critical',
      errorName: error?.name,
      errorMessage: error?.message,
      stack: error?.stack,
      ...this.context,
      ...context
    };

    // Batch for efficient backend transmission
    batchLog('critical', message, errorContext);

    // Send to PostHog with high priority
    if (typeof window !== 'undefined' && window.posthog) {
      window.posthog.capture('critical_error', errorContext);
    }
  }
}

export const logger = new Logger();

// Flush logs on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    flushLogs();
  });
}
