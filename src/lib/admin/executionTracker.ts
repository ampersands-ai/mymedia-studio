/**
 * Execution Tracker for Comprehensive Model Testing
 *
 * This module provides instrumentation for tracking every step of model execution
 * including function calls, payloads, responses, and timing information.
 */

export type ExecutionStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'edited' | 'cancelled' | 'paused';

export interface ExecutionStep {
  id: string;
  stepNumber: number;
  stepName: string;
  description: string;
  functionPath: string;
  functionName: string;
  status: ExecutionStepStatus;

  // Inputs and outputs
  inputs: Record<string, any>;
  outputs: any;
  error?: string;

  // Timing
  startTime?: number;
  endTime?: number;
  duration?: number;

  // Metadata
  canEdit: boolean;
  canRerun: boolean;
  metadata?: Record<string, any>;
}

export interface ExecutionFlow {
  id: string;
  modelRecordId: string;
  modelName: string;
  startTime: number;
  endTime?: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  steps: ExecutionStep[];

  // Context
  userId: string;
  generationId?: string;
}

/**
 * Execution Tracker Class
 * Manages the execution flow and step tracking
 */
export class ExecutionTracker {
  private flow: ExecutionFlow;
  private listeners: ((flow: ExecutionFlow) => void)[] = [];

  constructor(modelRecordId: string, modelName: string, userId: string) {
    this.flow = {
      id: crypto.randomUUID(),
      modelRecordId,
      modelName,
      startTime: Date.now(),
      status: 'running',
      steps: [],
      userId,
    };
  }

  /**
   * Add a new step to the execution flow
   */
  addStep(config: Omit<ExecutionStep, 'id' | 'stepNumber' | 'status'>): ExecutionStep {
    const step: ExecutionStep = {
      ...config,
      id: crypto.randomUUID(),
      stepNumber: this.flow.steps.length + 1,
      status: 'pending',
    };

    this.flow.steps.push(step);
    this.notifyListeners();
    return step;
  }

  /**
   * Start executing a step
   */
  startStep(stepId: string): void {
    const step = this.flow.steps.find(s => s.id === stepId);
    if (!step) return;

    step.status = 'running';
    step.startTime = Date.now();
    this.notifyListeners();
  }

  /**
   * Complete a step successfully
   */
  completeStep(stepId: string, outputs: any, metadata?: Record<string, any>): void {
    const step = this.flow.steps.find(s => s.id === stepId);
    if (!step) return;

    step.status = 'completed';
    step.outputs = outputs;
    step.endTime = Date.now();
    step.duration = step.endTime - (step.startTime || step.endTime);
    if (metadata) step.metadata = { ...step.metadata, ...metadata };
    this.notifyListeners();
  }

  /**
   * Mark a step as failed
   */
  failStep(stepId: string, error: string): void {
    const step = this.flow.steps.find(s => s.id === stepId);
    if (!step) return;

    step.status = 'failed';
    step.error = error;
    step.endTime = Date.now();
    step.duration = step.endTime - (step.startTime || step.endTime);

    // Mark execution flow as failed
    this.flow.status = 'failed';
    this.flow.endTime = Date.now();
    this.notifyListeners();
  }

  /**
   * Update step inputs (for edit capability)
   */
  updateStepInputs(stepId: string, newInputs: Record<string, any>): void {
    const step = this.flow.steps.find(s => s.id === stepId);
    if (!step) return;

    step.inputs = newInputs;
    step.status = 'edited';
    this.notifyListeners();
  }

  /**
   * Complete the entire execution flow
   */
  complete(): void {
    this.flow.status = 'completed';
    this.flow.endTime = Date.now();
    this.notifyListeners();
  }

  /**
   * Set generation ID
   */
  setGenerationId(generationId: string): void {
    this.flow.generationId = generationId;
    this.notifyListeners();
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
   * Subscribe to flow updates
   */
  subscribe(listener: (flow: ExecutionFlow) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getFlow()));
  }

  /**
   * Export flow as JSON for debugging
   */
  export(): string {
    return JSON.stringify(this.flow, null, 2);
  }
}

/**
 * Instrumented execution wrapper
 * Wraps a function call and tracks its execution
 */
export async function instrumentedExecution<T>(
  tracker: ExecutionTracker,
  stepConfig: Omit<ExecutionStep, 'id' | 'stepNumber' | 'status'>,
  executor: (inputs: Record<string, any>) => Promise<T>
): Promise<T> {
  const step = tracker.addStep({
    ...stepConfig,
    outputs: undefined,
  });

  try {
    tracker.startStep(step.id);
    const result = await executor(stepConfig.inputs);
    tracker.completeStep(step.id, result);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    tracker.failStep(step.id, errorMessage);
    throw error;
  }
}

/**
 * Create a step configuration helper
 */
export function createStepConfig(
  stepName: string,
  description: string,
  functionPath: string,
  functionName: string,
  inputs: Record<string, any>,
  canEdit: boolean = false,
  canRerun: boolean = false
): Omit<ExecutionStep, 'id' | 'stepNumber' | 'status' | 'outputs'> {
  return {
    stepName,
    description,
    functionPath,
    functionName,
    inputs,
    canEdit,
    canRerun,
  };
}
