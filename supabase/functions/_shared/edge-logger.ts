type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

interface LogContext {
  functionName: string;
  userId?: string;
  requestId?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Structured logger for edge functions
 * Outputs JSON-formatted logs for better parsing and monitoring
 */
export class EdgeLogger {
  constructor(private functionName: string, private requestId?: string) {}

  private log(level: LogLevel, message: string, context?: Partial<LogContext>) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      function: this.functionName,
      requestId: this.requestId || context?.requestId,
      message,
      ...context,
    };

    // Output as JSON for structured logging
    console.log(JSON.stringify(logEntry));
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
      severity: 'critical',
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
