/**
 * Generation Status Constants
 *
 * Centralized constants for generation and workflow statuses.
 * These replace hardcoded string literals throughout the codebase.
 *
 * IMPORTANT: These values must match the database enum types.
 */

// GENERATION STATUSES
export const GENERATION_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

export type GenerationStatus = typeof GENERATION_STATUS[keyof typeof GENERATION_STATUS];

// VIDEO JOB STATUSES
export const VIDEO_JOB_STATUS = {
  PENDING: 'pending',
  GENERATING_SCRIPT: 'generating_script',
  GENERATING_VOICE: 'generating_voice',
  FETCHING_VIDEO: 'fetching_video',
  ASSEMBLING: 'assembling',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type VideoJobStatus = typeof VIDEO_JOB_STATUS[keyof typeof VIDEO_JOB_STATUS];

// STORYBOARD STATUSES
export const STORYBOARD_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  RENDERING: 'rendering',
  COMPLETE: 'complete',
  FAILED: 'failed',
} as const;

export type StoryboardStatus = typeof STORYBOARD_STATUS[keyof typeof STORYBOARD_STATUS];

// EXECUTION CONTEXTS (for logging/debugging)
export const EXECUTION_CONTEXT = {
  CLIENT: 'client',
  EDGE_FUNCTION: 'edge_function',
  DATABASE: 'database',
  WEBHOOK: 'webhook',
} as const;

export type ExecutionContext = typeof EXECUTION_CONTEXT[keyof typeof EXECUTION_CONTEXT];

// STEP TYPES (for execution tracking)
export const STEP_TYPE = {
  MAIN: 'main',
  SUB: 'sub',
  LOG: 'log',
  ERROR: 'error',
  WARNING: 'warning',
} as const;

export type StepType = typeof STEP_TYPE[keyof typeof STEP_TYPE];

// TEST MODE CONFIGURATION
export const TEST_MODE_CONFIG = {
  DEFAULT: {
    testMode: true,
    skipBilling: true,
    mode: 'auto' as const,
    persistenceEnabled: true,
  },
  PRODUCTION: {
    testMode: false,
    skipBilling: false,
    mode: 'manual' as const,
    persistenceEnabled: false,
  },
} as const;

// ACTIVE GENERATION STATUSES (for filtering)
export const ACTIVE_GENERATION_STATUSES: readonly GenerationStatus[] = [
  GENERATION_STATUS.PENDING,
  GENERATION_STATUS.PROCESSING,
] as const;

// TERMINAL GENERATION STATUSES (final states)
export const TERMINAL_GENERATION_STATUSES: readonly GenerationStatus[] = [
  GENERATION_STATUS.COMPLETED,
  GENERATION_STATUS.FAILED,
  GENERATION_STATUS.CANCELLED,
] as const;

// ACTIVE VIDEO JOB STATUSES (for filtering)
export const ACTIVE_VIDEO_JOB_STATUSES: readonly VideoJobStatus[] = [
  VIDEO_JOB_STATUS.PENDING,
  VIDEO_JOB_STATUS.GENERATING_SCRIPT,
  VIDEO_JOB_STATUS.GENERATING_VOICE,
  VIDEO_JOB_STATUS.FETCHING_VIDEO,
  VIDEO_JOB_STATUS.ASSEMBLING,
] as const;

// Type guards for runtime validation
export function isGenerationStatus(value: string): value is GenerationStatus {
  return Object.values(GENERATION_STATUS).includes(value as GenerationStatus);
}

export function isVideoJobStatus(value: string): value is VideoJobStatus {
  return Object.values(VIDEO_JOB_STATUS).includes(value as VideoJobStatus);
}

export function isStoryboardStatus(value: string): value is StoryboardStatus {
  return Object.values(STORYBOARD_STATUS).includes(value as StoryboardStatus);
}

export function isExecutionContext(value: string): value is ExecutionContext {
  return Object.values(EXECUTION_CONTEXT).includes(value as ExecutionContext);
}

export function isStepType(value: string): value is StepType {
  return Object.values(STEP_TYPE).includes(value as StepType);
}

// Helper functions
export function isTerminalStatus(status: GenerationStatus): boolean {
  return TERMINAL_GENERATION_STATUSES.includes(status);
}

export function isActiveStatus(status: GenerationStatus): boolean {
  return ACTIVE_GENERATION_STATUSES.includes(status);
}

export function isActiveVideoJob(status: VideoJobStatus): boolean {
  return ACTIVE_VIDEO_JOB_STATUSES.includes(status);
}
