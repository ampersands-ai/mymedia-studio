/**
 * Execution Constants
 *
 * Centralized constants for execution tracking, debugging, and model testing.
 * These replace hardcoded string literals throughout the codebase.
 *
 * Part of schema-driven architecture where types are defined once and reused.
 */

// ============================================================================
// EXECUTION CONTEXTS
// ============================================================================

/**
 * Execution context indicates where a step is running
 */
export const EXECUTION_CONTEXT = {
  CLIENT: 'client',
  EDGE_FUNCTION: 'edge_function',
  DATABASE: 'database',
  WEBHOOK: 'webhook',
} as const;

export type ExecutionContext = typeof EXECUTION_CONTEXT[keyof typeof EXECUTION_CONTEXT];

// ============================================================================
// STEP TYPES
// ============================================================================

/**
 * Step type indicates the hierarchical level of execution steps
 */
export const STEP_TYPE = {
  MAIN: 'main',
  SUB: 'sub',
  LOG: 'log',
  ERROR: 'error',
  WARNING: 'warning',
} as const;

export type StepType = typeof STEP_TYPE[keyof typeof STEP_TYPE];

// ============================================================================
// GENERATION STATUSES
// ============================================================================

/**
 * Status of a generation request throughout its lifecycle
 */
export const GENERATION_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

export type GenerationStatus = typeof GENERATION_STATUS[keyof typeof GENERATION_STATUS];

// ============================================================================
// TEST MODE CONFIGURATION
// ============================================================================

/**
 * Test mode configuration for comprehensive model tester
 */
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

export type TestModeConfig = typeof TEST_MODE_CONFIG.DEFAULT;

// ============================================================================
// EXECUTION MODES
// ============================================================================

/**
 * Execution mode for tracker behavior
 */
export const EXECUTION_MODE = {
  AUTO: 'auto',
  MANUAL: 'manual',
  STEP: 'step',
} as const;

export type ExecutionMode = typeof EXECUTION_MODE[keyof typeof EXECUTION_MODE];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Type guard to check if a string is a valid execution context
 */
export function isExecutionContext(value: string): value is ExecutionContext {
  return Object.values(EXECUTION_CONTEXT).includes(value as ExecutionContext);
}

/**
 * Type guard to check if a string is a valid step type
 */
export function isStepType(value: string): value is StepType {
  return Object.values(STEP_TYPE).includes(value as StepType);
}

/**
 * Type guard to check if a string is a valid generation status
 */
export function isGenerationStatus(value: string): value is GenerationStatus {
  return Object.values(GENERATION_STATUS).includes(value as GenerationStatus);
}
