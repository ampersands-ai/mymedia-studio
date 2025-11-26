/**
 * Enhanced Execution Tracker with Database Persistence
 *
 * Industry-standard execution tracking system with:
 * - Database persistence for replay and history
 * - Real-time log streaming
 * - Execution control (pause/resume/step)
 * - Security measures (API key masking, admin-only)
 * - Performance monitoring
 */

import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

export type ExecutionStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused' | 'edited';
export type ExecutionStepType = 'main' | 'sub' | 'log' | 'error' | 'warning';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';
export type ExecutionContext = 'client' | 'edge_function' | 'webhook' | 'database';
export type ExecutionMode = 'auto' | 'step' | 'paused';

export interface ExecutionStep {
  id: string;
  stepNumber: number;
  parentStepNumber?: number;
  stepType: ExecutionStepType;

  stepName: string;
  description: string;
  functionPath: string;
  functionName: string;
  sourceCode?: string;

  status: ExecutionStepStatus;

  // State management
  stateBeforeStep: Record<string, unknown>;
  stateAfterStep: Record<string, unknown>;

  // Inputs and outputs
  inputs: Record<string, unknown>;
  outputs: unknown;
  error?: string;
  errorStack?: string;

  // Timing
  startTime?: number;
  endTime?: number;
  duration?: number;

  // Metadata
  canEdit: boolean;
  canRerun: boolean;
  isEdited: boolean;
  metadata?: Record<string, unknown>;

  // Context
  executionContext: ExecutionContext;

  // Performance
  memoryUsed?: number;
  cpuTime?: number;
}

export interface ExecutionLog {
  id: string;
  testRunId: string;
  stepNumber: number;
  parentStepNumber?: number;
  stepType: ExecutionStepType;
  logLevel: LogLevel;
  message: string;
  data?: unknown;
  metadata?: unknown;
  functionName?: string;
  filePath?: string;
  lineNumber?: number;
  timestamp: number;
  executionContext: ExecutionContext;
}

export interface ExecutionFlow {
  id: string;
  testRunId: string;

  // Model information
  modelRecordId: string;
  modelName: string;
  modelProvider: string;
  modelContentType: string;

  // Execution state
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  mode: ExecutionMode;

  // Steps and logs
  steps: ExecutionStep[];
  logs: ExecutionLog[];

  // Timing
  startTime: number;
  endTime?: number;
  totalDuration?: number;
  duration?: number; // Alias for totalDuration (for compatibility)
  startedAt?: Date; // Alias for startTime as Date (for compatibility)

  // Context
  userId: string;
  generationId?: string;

  // Configuration
  testModeEnabled: boolean;
  skipBilling: boolean;

  // Metadata
  environment: string;
  bookmarked: boolean;
  bookmarkName?: string;
  tags: string[];
  notes?: string;

  // Execution control
  currentStepIndex: number;
  pausedAtStep?: number;
  breakpoints: number[];
}

/**
 * Enhanced Execution Tracker Class
 */
export class EnhancedExecutionTracker {
  private flow: ExecutionFlow;
  private listeners: ((flow: ExecutionFlow) => void)[] = [];
  private logListeners: ((log: ExecutionLog) => void)[] = [];
  private persistenceEnabled: boolean = true;
  private realtimeChannel?: RealtimeChannel;
  private autoSaveInterval?: NodeJS.Timeout;

  constructor(
    modelRecordId: string,
    modelName: string,
    modelProvider: string,
    modelContentType: string,
    userId: string,
    config?: {
      testMode?: boolean;
      skipBilling?: boolean;
      mode?: ExecutionMode;
      persistenceEnabled?: boolean;
    }
  ) {
    this.flow = {
      id: crypto.randomUUID(),
      testRunId: crypto.randomUUID(),
      modelRecordId,
      modelName,
      modelProvider,
      modelContentType,
      status: 'pending',
      mode: config?.mode || 'auto',
      steps: [],
      logs: [],
      startTime: Date.now(),
      userId,
      testModeEnabled: config?.testMode ?? true,
      skipBilling: config?.skipBilling ?? true,
      environment: 'test',
      bookmarked: false,
      tags: [],
      currentStepIndex: -1,
      breakpoints: [],
    };

    // Set aliases immediately
    this.flow.duration = undefined;
    this.flow.startedAt = new Date(this.flow.startTime);

    this.persistenceEnabled = config?.persistenceEnabled ?? true;

    // Initialize persistence and real-time
    if (this.persistenceEnabled) {
      this.initializePersistence();
      this.setupRealtimeSubscription();
      this.startAutoSave();
    }
  }

  /**
   * Initialize database persistence
   */
  private async initializePersistence(): Promise<void> {
    try {
      const { error } = await supabase.from('test_execution_runs').insert({
        test_run_id: this.flow.testRunId,
        admin_user_id: this.flow.userId,
        model_record_id: this.flow.modelRecordId,
        model_name: this.flow.modelName,
        model_provider: this.flow.modelProvider,
        model_content_type: this.flow.modelContentType,
        status: this.flow.status,
        total_steps: 0,
        completed_steps: 0,
        test_mode_enabled: this.flow.testModeEnabled,
        skip_billing: this.flow.skipBilling,
        environment: this.flow.environment,
        execution_data: {},
        started_at: new Date(this.flow.startTime).toISOString(),
      });

      if (error) {
        logger.error('Failed to initialize test execution run', error);
        this.persistenceEnabled = false;
      }
    } catch (error) {
      logger.error('Failed to initialize persistence', error);
      this.persistenceEnabled = false;
    }
  }

  /**
   * Setup real-time subscription for logs
   */
  private setupRealtimeSubscription(): void {
    this.realtimeChannel = supabase
      .channel(`test-execution-${this.flow.testRunId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'test_execution_logs',
          filter: `test_run_id=eq.${this.flow.testRunId}`,
        },
        (payload) => {
          const log = this.convertDbLogToExecutionLog(payload.new);
          this.flow.logs.push(log);
          this.notifyLogListeners(log);
        }
      )
      .subscribe();
  }

  /**
   * Start auto-save interval
   */
  private startAutoSave(): void {
    // Auto-save every 2 seconds
    this.autoSaveInterval = setInterval(() => {
      this.saveToDatabase();
    }, 2000);
  }

  /**
   * Save current state to database
   */
  private async saveToDatabase(): Promise<void> {
    if (!this.persistenceEnabled) return;

    try {
      const completedSteps = this.flow.steps.filter(s => s.status === 'completed').length;
      const duration = this.flow.endTime
        ? this.flow.endTime - this.flow.startTime
        : Date.now() - this.flow.startTime;

      await supabase
        .from('test_execution_runs')
        .update({
          status: this.flow.status,
          total_steps: this.flow.steps.filter(s => s.stepType === 'main').length,
          completed_steps: completedSteps,
          execution_data: {
            mode: this.flow.mode,
            currentStepIndex: this.flow.currentStepIndex,
            pausedAtStep: this.flow.pausedAtStep,
            breakpoints: this.flow.breakpoints,
            tags: this.flow.tags,
            notes: this.flow.notes,
          },
          completed_at: this.flow.endTime
            ? new Date(this.flow.endTime).toISOString()
            : null,
          total_duration_ms: duration,
          generation_id: this.flow.generationId,
        })
        .eq('test_run_id', this.flow.testRunId);
    } catch (error) {
      logger.error('Failed to save to database', error);
    }
  }

  /**
   * Add a new execution step
   */
  addStep(config: Omit<ExecutionStep, 'id' | 'stepNumber' | 'status' | 'stateBeforeStep' | 'stateAfterStep' | 'outputs'>): ExecutionStep {
    const mainSteps = this.flow.steps.filter(s => s.stepType === 'main');
    const stepNumber = config.parentStepNumber
      ? this.flow.steps.length + 1
      : mainSteps.length + 1;

    const step: ExecutionStep = {
      ...config,
      id: crypto.randomUUID(),
      stepNumber,
      status: 'pending',
      stateBeforeStep: {},
      stateAfterStep: {},
      outputs: null,
      isEdited: false,
    };

    this.flow.steps.push(step);
    this.notifyListeners();

    // Save snapshot to database
    if (this.persistenceEnabled) {
      this.saveStepSnapshot(step);
    }

    return step;
  }

  /**
   * Save step snapshot to database
   * NOTE: test_execution_snapshots table does not exist in current schema
   */
  private async saveStepSnapshot(step: ExecutionStep): Promise<void> {
    // TODO: Create test_execution_snapshots table or remove this functionality
    // Disabled until table exists in schema
    return;
  }

  /**
   * Start executing a step
   */
  startStep(stepId: string, stateBeforeStep?: Record<string, unknown>): void {
    const step = this.flow.steps.find(s => s.id === stepId);
    if (!step) return;

    step.status = 'running';
    step.startTime = Date.now();
    if (stateBeforeStep) {
      step.stateBeforeStep = stateBeforeStep;
    }

    this.flow.currentStepIndex = this.flow.steps.indexOf(step);
    this.notifyListeners();

    // Log step start
    this.log({
      stepNumber: step.stepNumber,
      stepType: step.stepType,
      logLevel: 'info',
      message: `Started: ${step.stepName}`,
      executionContext: step.executionContext,
    });
  }

  /**
   * Complete a step successfully
   */
  completeStep(
    stepId: string,
    outputs: unknown,
    stateAfterStep?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): void {
    const step = this.flow.steps.find(s => s.id === stepId);
    if (!step) return;

    step.status = 'completed';
    step.outputs = outputs;
    step.endTime = Date.now();
    step.duration = step.endTime - (step.startTime || step.endTime);
    if (stateAfterStep) {
      step.stateAfterStep = stateAfterStep;
    }
    if (metadata) {
      step.metadata = { ...step.metadata, ...metadata };
    }

    this.notifyListeners();

    // Update snapshot
    if (this.persistenceEnabled) {
      this.saveStepSnapshot(step);
    }

    // Log completion
    this.log({
      stepNumber: step.stepNumber,
      stepType: step.stepType,
      logLevel: 'info',
      message: `Completed: ${step.stepName} (${step.duration}ms)`,
      data: { duration: step.duration },
      executionContext: step.executionContext,
    });

    // Check if should pause after step
    if (
      this.flow.mode === 'step' ||
      this.flow.breakpoints.includes(step.stepNumber)
    ) {
      this.pause(step.stepNumber);
    }
  }

  /**
   * Mark a step as failed
   */
  failStep(stepId: string, error: string, errorStack?: string): void {
    const step = this.flow.steps.find(s => s.id === stepId);
    if (!step) return;

    step.status = 'failed';
    step.error = error;
    step.errorStack = errorStack;
    step.endTime = Date.now();
    step.duration = step.endTime - (step.startTime || step.endTime);

    this.flow.status = 'failed';
    this.flow.endTime = Date.now();
    this.flow.totalDuration = this.flow.endTime - this.flow.startTime;

    this.notifyListeners();

    // Update database
    if (this.persistenceEnabled) {
      this.saveStepSnapshot(step);
      this.saveToDatabase();
    }

    // Log error
    this.log({
      stepNumber: step.stepNumber,
      stepType: 'error',
      logLevel: 'error',
      message: `Failed: ${step.stepName} - ${error}`,
      data: { error, errorStack },
      executionContext: step.executionContext,
    });
  }

  /**
   * Pause execution
   */
  pause(atStep?: number): void {
    this.flow.mode = 'paused';
    this.flow.pausedAtStep = atStep || this.flow.currentStepIndex;
    this.notifyListeners();

    this.log({
      stepNumber: this.flow.currentStepIndex,
      stepType: 'log',
      logLevel: 'info',
      message: `Execution paused at step ${this.flow.pausedAtStep}`,
      executionContext: 'client',
    });
  }

  /**
   * Resume execution
   */
  resume(): void {
    this.flow.mode = 'auto';
    this.flow.pausedAtStep = undefined;
    this.notifyListeners();

    this.log({
      stepNumber: this.flow.currentStepIndex,
      stepType: 'log',
      logLevel: 'info',
      message: 'Execution resumed',
      executionContext: 'client',
    });
  }

  /**
   * Execute next step only (manual stepping)
   */
  stepForward(): void {
    this.flow.mode = 'step';
    this.flow.pausedAtStep = undefined;
    this.notifyListeners();
  }

  /**
   * Add/remove breakpoint
   */
  toggleBreakpoint(stepNumber: number): void {
    const index = this.flow.breakpoints.indexOf(stepNumber);
    if (index === -1) {
      this.flow.breakpoints.push(stepNumber);
    } else {
      this.flow.breakpoints.splice(index, 1);
    }
    this.notifyListeners();
  }

  /**
   * Update step inputs (for edit capability)
   */
  updateStepInputs(stepId: string, newInputs: Record<string, unknown>): void {
    const step = this.flow.steps.find(s => s.id === stepId);
    if (!step) return;

    step.inputs = newInputs;
    step.status = 'edited';
    step.isEdited = true;
    this.notifyListeners();

    if (this.persistenceEnabled) {
      this.saveStepSnapshot(step);
    }
  }

  /**
   * Add log entry
   */
  log(config: {
    stepNumber: number;
    parentStepNumber?: number;
    stepType: ExecutionStepType;
    logLevel: LogLevel;
    message: string;
    data?: unknown;
    metadata?: unknown;
    functionName?: string;
    filePath?: string;
    lineNumber?: number;
    executionContext: ExecutionContext;
  }): void {
    const log: ExecutionLog = {
      id: crypto.randomUUID(),
      testRunId: this.flow.testRunId,
      ...config,
      timestamp: Date.now(),
    };

    this.flow.logs.push(log);
    this.notifyLogListeners(log);

    // Save to database
    if (this.persistenceEnabled) {
      this.saveLog(log);
    }
  }

  /**
   * Save log to database
   * NOTE: test_execution_logs table does not exist in current schema
   */
  private async saveLog(log: ExecutionLog): Promise<void> {
    // TODO: Create test_execution_logs table or remove this functionality
    // Disabled until table exists in schema
    return;
  }

  /**
   * Convert database log to ExecutionLog
   */
  private convertDbLogToExecutionLog(dbLog: Record<string, unknown>): ExecutionLog {
    return {
      id: String(dbLog.id),
      testRunId: String(dbLog.test_run_id),
      stepNumber: Number(dbLog.step_number),
      parentStepNumber: dbLog.parent_step_number as number | undefined,
      stepType: dbLog.step_type as ExecutionStepType,
      logLevel: dbLog.log_level as LogLevel,
      message: String(dbLog.message),
      data: dbLog.data as Record<string, unknown> | undefined,
      metadata: dbLog.metadata as Record<string, unknown> | undefined,
      functionName: dbLog.function_name as string | undefined,
      filePath: dbLog.file_path as string | undefined,
      lineNumber: dbLog.line_number as number | undefined,
      timestamp: new Date(String(dbLog.timestamp)).getTime(),
      executionContext: dbLog.execution_context as ExecutionContext,
    };
  }

  /**
   * Complete the entire execution flow
   */
  complete(): void {
    this.flow.status = 'completed';
    this.flow.endTime = Date.now();
    this.flow.totalDuration = this.flow.endTime - this.flow.startTime;
    this.flow.duration = this.flow.totalDuration; // Set alias
    this.flow.startedAt = new Date(this.flow.startTime); // Set alias
    this.notifyListeners();

    if (this.persistenceEnabled) {
      this.saveToDatabase();
    }

    this.log({
      stepNumber: this.flow.currentStepIndex,
      stepType: 'log',
      logLevel: 'info',
      message: `Execution completed in ${this.flow.totalDuration}ms`,
      executionContext: 'client',
    });

    // Cleanup resources (prevent memory leak)
    this.cleanup();
  }

  /**
   * Cancel execution
   */
  cancel(): void {
    this.flow.status = 'cancelled';
    this.flow.endTime = Date.now();
    this.flow.totalDuration = this.flow.endTime - this.flow.startTime;
    this.flow.duration = this.flow.totalDuration; // Set alias
    this.flow.startedAt = new Date(this.flow.startTime); // Set alias
    this.notifyListeners();

    if (this.persistenceEnabled) {
      this.saveToDatabase();
    }

    this.cleanup();
  }

  /**
   * Set generation ID
   */
  setGenerationId(generationId: string): void {
    this.flow.generationId = generationId;
    this.notifyListeners();
  }

  /**
   * Bookmark this test run
   */
  async bookmark(name: string, tags?: string[], notes?: string): Promise<void> {
    this.flow.bookmarked = true;
    this.flow.bookmarkName = name;
    if (tags) this.flow.tags = tags;
    if (notes) this.flow.notes = notes;
    this.notifyListeners();

    if (this.persistenceEnabled) {
      await supabase
        .from('test_execution_runs')
        .update({
          bookmarked: true,
          bookmark_name: name,
          tags: tags || [],
          notes: notes || null,
        })
        .eq('test_run_id', this.flow.testRunId);
    }
  }

  /**
   * Get the current execution flow
   */
  getFlow(): ExecutionFlow {
    return { ...this.flow };
  }

  /**
   * Get a specific step
   */
  getStep(stepId: string): ExecutionStep | undefined {
    return this.flow.steps.find(s => s.id === stepId);
  }

  /**
   * Get all logs
   */
  getLogs(filter?: { stepNumber?: number; logLevel?: LogLevel }): ExecutionLog[] {
    let logs = this.flow.logs;

    if (filter?.stepNumber) {
      logs = logs.filter(l => l.stepNumber === filter.stepNumber);
    }

    if (filter?.logLevel) {
      logs = logs.filter(l => l.logLevel === filter.logLevel);
    }

    return logs;
  }

  /**
   * Subscribe to flow updates
   */
  subscribe(listener: (flow: ExecutionFlow) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Subscribe to log updates
   */
  subscribeToLogs(listener: (log: ExecutionLog) => void): () => void {
    this.logListeners.push(listener);
    return () => {
      this.logListeners = this.logListeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getFlow()));
  }

  /**
   * Notify log listeners
   */
  private notifyLogListeners(log: ExecutionLog): void {
    this.logListeners.forEach(listener => listener(log));
  }

  /**
   * Export flow as JSON for debugging
   */
  export(): string {
    return JSON.stringify(
      {
        ...this.flow,
        exportedAt: new Date().toISOString(),
        version: '2.0',
      },
      null,
      2
    );
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.realtimeChannel) {
      this.realtimeChannel.unsubscribe();
    }
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
    this.listeners = [];
    this.logListeners = [];
  }

  /**
   * Static method to load from database
   */
  static async loadFromDatabase(testRunId: string): Promise<EnhancedExecutionTracker | null> {
    try {
      // Load test run
      const { data: runData, error: runError } = await supabase
        .from('test_execution_runs')
        .select('*')
        .eq('test_run_id', testRunId)
        .single();

      if (runError || !runData) {
        logger.error('Failed to load test run', runError);
        return null;
      }

      // Parse execution_data to get model content type
      const executionData = typeof runData.execution_data === 'string' 
        ? JSON.parse(runData.execution_data) 
        : runData.execution_data;
      
      // Create tracker instance
      const tracker = new EnhancedExecutionTracker(
        runData.model_record_id,
        runData.model_name,
        runData.model_provider || '',
        executionData?.modelContentType || 'image',
        runData.admin_user_id,
        {
          testMode: runData.test_mode_enabled,
          skipBilling: runData.skip_billing,
          persistenceEnabled: false, // Don't create new DB record
        }
      );

      // Restore flow state
      tracker.flow.testRunId = runData.test_run_id;
      tracker.flow.status = runData.status as "pending" | "running" | "completed" | "failed" | "cancelled";
      tracker.flow.startTime = runData.started_at ? new Date(runData.started_at).getTime() : Date.now();
      if (runData.completed_at) {
        tracker.flow.endTime = new Date(runData.completed_at).getTime();
        tracker.flow.totalDuration = runData.duration_ms || undefined;
      }
      tracker.flow.generationId = runData.generation_id;
      tracker.flow.bookmarked = runData.bookmarked;
      tracker.flow.bookmarkName = runData.bookmark_name;
      tracker.flow.tags = runData.tags || [];
      tracker.flow.notes = runData.notes;

      // Load snapshots
      const { data: snapshots } = await supabase
        .from('test_execution_snapshots')
        .select('*')
        .eq('test_run_id', testRunId)
        .order('step_number');

      if (snapshots) {
        tracker.flow.steps = snapshots.map(s => {
          const stateData = typeof s.state_data === 'string' 
            ? JSON.parse(s.state_data) 
            : s.state_data as any;
          
          return {
            id: crypto.randomUUID(),
            stepNumber: s.step_number,
            stepType: 'main' as const,
            stepName: stateData.step_name || '',
            description: stateData.description || '',
            functionPath: stateData.file_path || '',
            functionName: stateData.function_name || '',
            sourceCode: stateData.source_code,
            status: stateData.status || 'completed' as const,
            stateBeforeStep: stateData.state_before,
            stateAfterStep: stateData.state_after,
            inputs: stateData.inputs,
            outputs: stateData.outputs,
            startTime: stateData.started_at ? new Date(stateData.started_at).getTime() : undefined,
            endTime: stateData.completed_at ? new Date(stateData.completed_at).getTime() : undefined,
            duration: stateData.duration_ms,
            canEdit: stateData.can_edit || false,
            canRerun: stateData.can_rerun || false,
            isEdited: stateData.is_edited || false,
            executionContext: 'client' as const,
          };
        });
      }

      // Load logs
      const { data: logs } = await supabase
        .from('test_execution_logs')
        .select('*')
        .eq('test_run_id', testRunId)
        .order('timestamp');

      if (logs) {
        tracker.flow.logs = logs.map(log => tracker.convertDbLogToExecutionLog(log));
      }

      return tracker;
    } catch (error) {
      logger.error('Failed to load from database', error);
      return null;
    }
  }
}

/**
 * Helper function to mask sensitive data (API keys, tokens, etc.)
 */
export function maskSensitiveData(data: unknown, keysToMask: string[] = ['apiKey', 'api_key', 'token', 'password', 'secret']): unknown {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => maskSensitiveData(item, keysToMask));
  }

  const masked: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    const keyLower = key.toLowerCase();
    const shouldMask = keysToMask.some(maskKey => keyLower.includes(maskKey.toLowerCase()));

    if (shouldMask && typeof value === 'string') {
      // Show only last 4 characters
      masked[key] = value.length > 4 ? `***${value.slice(-4)}` : '****';
    } else if (typeof value === 'object') {
      masked[key] = maskSensitiveData(value, keysToMask);
    } else {
      masked[key] = value;
    }
  }

  return masked;
}

/**
 * Helper function to create execution step configuration
 */
export function createStepConfig(
  stepName: string,
  description: string,
  functionPath: string,
  functionName: string,
  inputs: Record<string, unknown>,
  options: {
    canEdit?: boolean;
    canRerun?: boolean;
    stepType?: ExecutionStepType;
    parentStepNumber?: number;
    executionContext?: ExecutionContext;
    sourceCode?: string;
  } = {}
): Omit<ExecutionStep, 'id' | 'stepNumber' | 'status' | 'stateBeforeStep' | 'stateAfterStep' | 'outputs'> {
  return {
    stepName,
    description,
    functionPath,
    functionName,
    inputs: maskSensitiveData(inputs) as Record<string, unknown>,
    canEdit: options.canEdit ?? false,
    canRerun: options.canRerun ?? false,
    stepType: options.stepType ?? 'main',
    parentStepNumber: options.parentStepNumber,
    executionContext: options.executionContext ?? 'client',
    sourceCode: options.sourceCode,
    isEdited: false,
  };
}
