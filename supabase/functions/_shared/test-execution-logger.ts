/**
 * Test Execution Logger
 *
 * Detailed logging utility for test mode execution tracking.
 * Logs to test_execution_logs table for admin debugging and analysis.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type LogLevel = "debug" | "info" | "warn" | "error" | "critical";
export type ExecutionContext = "client" | "edge_function" | "webhook" | "database";

export interface TestLogEntry {
  test_run_id: string;
  step_number: number;
  step_type: "main" | "sub" | "log";
  log_level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  execution_context: ExecutionContext;
  function_name?: string;
}

/**
 * Test Execution Logger
 * Only active when test_mode is enabled
 */
export class TestExecutionLogger {
  private supabase: SupabaseClient;
  private testRunId: string | null;
  private stepNumber: number;
  private isTestMode: boolean;

  constructor(
    supabase: SupabaseClient,
    testRunId: string | null = null,
    isTestMode: boolean = false
  ) {
    this.supabase = supabase;
    this.testRunId = testRunId;
    this.stepNumber = 8; // Edge function is step 8 in the overall flow
    this.isTestMode = isTestMode && !!testRunId;
  }

  /**
   * Log a test execution entry
   */
  async log(entry: Omit<TestLogEntry, "test_run_id">): Promise<void> {
    if (!this.isTestMode || !this.testRunId) return;

    try {
      const logEntry = {
        test_run_id: this.testRunId,
        ...entry,
        timestamp: new Date().toISOString(),
      };

      // Insert log entry (don't await to avoid blocking execution)
      this.supabase
        .from("test_execution_logs")
        .insert(logEntry)
        .then(({ error }) => {
          if (error) {
            console.error("[TestExecutionLogger] Failed to log:", error);
          }
        });
    } catch (error) {
      // Silent fail - don't break actual execution
      console.error("[TestExecutionLogger] Error:", error);
    }
  }

  /**
   * Log edge function entry
   */
  async logEdgeFunctionStart(data: {
    generationId: string;
    modelId: string;
    provider: string;
    userId: string;
  }): Promise<void> {
    await this.log({
      step_number: this.stepNumber,
      step_type: "sub",
      log_level: "info",
      message: "Edge function invoked",
      data,
      execution_context: "edge_function",
      function_name: "generate-content",
    });
  }

  /**
   * Log authentication step
   */
  async logAuthentication(
    success: boolean,
    userId?: string,
    error?: string
  ): Promise<void> {
    await this.log({
      step_number: this.stepNumber,
      step_type: "sub",
      log_level: success ? "info" : "error",
      message: success
        ? "User authenticated successfully"
        : `Authentication failed: ${error}`,
      data: { userId, success },
      execution_context: "edge_function",
      function_name: "authenticateUser",
    });
  }

  /**
   * Log request validation
   */
  async logValidation(
    valid: boolean,
    errors?: string[]
  ): Promise<void> {
    await this.log({
      step_number: this.stepNumber,
      step_type: "sub",
      log_level: valid ? "info" : "error",
      message: valid
        ? "Request validation passed"
        : `Validation failed: ${errors?.join(", ")}`,
      data: { valid, errors },
      execution_context: "edge_function",
      function_name: "validateRequest",
    });
  }

  /**
   * Log parameter filtering
   */
  async logParameterFiltering(
    originalCount: number,
    filteredCount: number,
    unknownKeys?: string[]
  ): Promise<void> {
    await this.log({
      step_number: this.stepNumber,
      step_type: "sub",
      log_level: unknownKeys && unknownKeys.length > 0 ? "warn" : "debug",
      message: `Parameters filtered: ${originalCount} → ${filteredCount}`,
      data: { originalCount, filteredCount, unknownKeys },
      execution_context: "edge_function",
      function_name: "filterParameters",
    });
  }

  /**
   * Log provider routing
   */
  async logProviderRouting(
    provider: string,
    endpoint?: string
  ): Promise<void> {
    await this.log({
      step_number: this.stepNumber,
      step_type: "sub",
      log_level: "info",
      message: `Routing to provider: ${provider}`,
      data: { provider, endpoint },
      execution_context: "edge_function",
      function_name: "routeToProvider",
    });
  }

  /**
   * Log provider API call
   */
  async logProviderApiCall(
    provider: string,
    request: unknown,
    startTime: number
  ): Promise<void> {
    // Mask sensitive data
    const maskedRequest = this.maskSensitiveData(request);

    await this.log({
      step_number: this.stepNumber,
      step_type: "sub",
      log_level: "info",
      message: `Provider API call started: ${provider}`,
      data: { provider, request: maskedRequest },
      metadata: { startTime },
      execution_context: "edge_function",
      function_name: "callProviderAPI",
    });
  }

  /**
   * Log provider API response
   */
  async logProviderApiResponse(
    provider: string,
    response: unknown,
    duration: number,
    success: boolean
  ): Promise<void> {
    // Mask sensitive data
    const maskedResponse = this.maskSensitiveData(response);

    await this.log({
      step_number: this.stepNumber,
      step_type: "sub",
      log_level: success ? "info" : "error",
      message: `Provider API response received: ${provider}`,
      data: { provider, response: maskedResponse, success },
      metadata: { duration },
      execution_context: "edge_function",
      function_name: "handleProviderResponse",
    });
  }

  /**
   * Log storage upload
   */
  async logStorageUpload(
    storagePath: string,
    fileSize?: number,
    duration?: number
  ): Promise<void> {
    await this.log({
      step_number: this.stepNumber,
      step_type: "sub",
      log_level: "info",
      message: "Content uploaded to storage",
      data: { storagePath, fileSize },
      metadata: { duration },
      execution_context: "edge_function",
      function_name: "uploadToStorage",
    });
  }

  /**
   * Log database update
   */
  async logDatabaseUpdate(
    table: string,
    operation: string,
    recordId: string,
    data?: unknown
  ): Promise<void> {
    await this.log({
      step_number: this.stepNumber,
      step_type: "sub",
      log_level: "info",
      message: `Database ${operation}: ${table}`,
      data: { table, operation, recordId, data },
      execution_context: "database",
      function_name: `db.${operation}`,
    });
  }

  /**
   * Log error
   */
  async logError(
    error: Error,
    context: string,
    data?: unknown
  ): Promise<void> {
    await this.log({
      step_number: this.stepNumber,
      step_type: "log",
      log_level: "error",
      message: `Error in ${context}: ${error.message}`,
      data: { error: error.message, stack: error.stack, ...(data as Record<string, unknown> || {}) },
      execution_context: "edge_function",
      function_name: context,
    });
  }

  /**
   * Log performance metric
   */
  async logPerformance(
    operation: string,
    duration: number,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      step_number: this.stepNumber,
      step_type: "log",
      log_level: "debug",
      message: `Performance: ${operation} took ${duration}ms`,
      data: { operation, duration },
      metadata,
      execution_context: "edge_function",
    });
  }

  /**
   * Mask sensitive data (API keys, tokens, etc.)
   */
  private maskSensitiveData(data: unknown): unknown {
    if (!data) return data;
    if (typeof data !== "object") return data;

    const sensitiveKeys = [
      "apiKey",
      "api_key",
      "token",
      "authorization",
      "password",
      "secret",
      "webhook_token",
      "_webhook_token",
    ];

    const masked = Array.isArray(data) 
      ? ([...data] as unknown as Record<string, unknown>)
      : { ...data as Record<string, unknown> };

    for (const key in masked) {
      const lowerKey = key.toLowerCase();
      const value = masked[key];
      
      if (sensitiveKeys.some((sk) => lowerKey.includes(sk))) {
        const strValue = String(value);
        if (strValue.length > 8) {
          masked[key] = `***${strValue.slice(-4)}`;
        } else {
          masked[key] = "***";
        }
      } else if (typeof value === "object" && value !== null) {
        masked[key] = this.maskSensitiveData(value);
      }
    }

    return masked;
  }
}
