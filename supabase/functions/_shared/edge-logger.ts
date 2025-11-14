import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

interface LogContext {
  functionName: string;
  userId?: string;
  requestId?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
  errorName?: string;
  errorMessage?: string;
  stack?: string;
}

/**
 * Structured logger for edge functions
 * Outputs JSON-formatted logs for better parsing and monitoring
 * Optionally persists error/critical logs to database
 */
export class EdgeLogger {
  constructor(
    private functionName: string,
    private requestId?: string,
    private supabase?: SupabaseClient,
    private persistLogs: boolean = false
  ) {}

  private async log(level: LogLevel, message: string, context?: Partial<LogContext>) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      function: this.functionName,
      requestId: this.requestId || context?.requestId,
      message,
      ...context,
    };

    // Always log to console (structured JSON)
    console.log(JSON.stringify(logEntry));

    // Optionally persist to database for errors/critical
    if (this.persistLogs && this.supabase && ['error', 'critical'].includes(level)) {
      try {
        await this.supabase.from('function_logs').insert({
          function_name: this.functionName,
          log_level: level,
          message,
          user_id: context?.userId,
          request_id: this.requestId || context?.requestId,
          duration_ms: context?.duration,
          context: context?.metadata,
          error_name: context?.errorName,
          error_message: context?.errorMessage,
          error_stack: context?.stack,
        });
      } catch (e) {
        // Don't let logging failures break the function
        console.error('Failed to persist log:', e);
      }
    }
  }

  debug(message: string, context?: Partial<LogContext>) {
    this.log('debug', message, context);
  }

  info(message: string, context?: Partial<LogContext>) {
    this.log('info', message, context);
  }

  warn(message: string, context?: Partial<LogContext>) {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: Partial<LogContext>) {
    this.log('error', message, {
      ...context,
      errorName: error?.name,
      errorMessage: error?.message,
      stack: error?.stack,
    });
  }

  critical(message: string, error?: Error, context?: Partial<LogContext>) {
    this.log('critical', message, {
      ...context,
      errorName: error?.name,
      errorMessage: error?.message,
      stack: error?.stack,
    });
  }

  /**
   * Log the duration of an operation
   */
  logDuration(operation: string, startTime: number, context?: Partial<LogContext>) {
    const duration = Date.now() - startTime;
    this.info(`${operation} completed`, {
      ...context,
      duration,
    });
  }
}
