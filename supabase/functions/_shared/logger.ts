/**
 * Structured logging utility for webhook operations
 * Provides consistent, searchable logs across all providers
 */

export interface LogContext {
  provider?: string;
  generationId?: string;
  taskId?: string;
  userId?: string;
  status?: string;
  duration?: number;
  error?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export const webhookLogger = {
  /**
   * Log webhook received
   */
  received: (provider: string, taskId: string, context?: LogContext) => {
    console.log(JSON.stringify({
      event: 'webhook_received',
      provider,
      taskId,
      timestamp: new Date().toISOString(),
      ...context
    }));
  },

  /**
   * Log security validation
   */
  security: (layer: string, passed: boolean, context?: LogContext) => {
    console.log(JSON.stringify({
      event: 'security_check',
      layer,
      passed,
      timestamp: new Date().toISOString(),
      ...context
    }));
  },

  /**
   * Log processing start
   */
  processing: (generationId: string, context?: LogContext) => {
    console.log(JSON.stringify({
      event: 'processing_started',
      generationId,
      timestamp: new Date().toISOString(),
      ...context
    }));
  },

  /**
   * Log success completion
   */
  success: (generationId: string, context?: LogContext) => {
    console.log(JSON.stringify({
      event: 'generation_completed',
      generationId,
      timestamp: new Date().toISOString(),
      ...context
    }));
  },

  /**
   * Log failure
   */
  failure: (generationId: string, error: string, context?: LogContext) => {
    console.log(JSON.stringify({
      event: 'generation_failed',
      generationId,
      error,
      timestamp: new Date().toISOString(),
      ...context
    }));
  },

  /**
   * Log download operation
   */
  download: (url: string, success: boolean, context?: LogContext) => {
    console.log(JSON.stringify({
      event: 'content_download',
      url: url.substring(0, 100),
      success,
      timestamp: new Date().toISOString(),
      ...context
    }));
  },

  /**
   * Log upload operation
   */
  upload: (storagePath: string, success: boolean, context?: LogContext) => {
    console.log(JSON.stringify({
      event: 'storage_upload',
      storagePath,
      success,
      timestamp: new Date().toISOString(),
      ...context
    }));
  },

  /**
   * Log general info
   */
  info: (message: string, context?: LogContext) => {
    console.log(JSON.stringify({
      event: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...context
    }));
  },

  /**
   * Log error
   */
  error: (message: string, error: Error | string | unknown, context?: LogContext) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error(JSON.stringify({
      event: 'error',
      message,
      error: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString(),
      ...context
    }));
  }
};
