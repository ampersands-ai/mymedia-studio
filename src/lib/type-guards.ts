/**
 * Type Guards for Explicit Type Safety
 * Eliminates fragile optional chaining patterns across the codebase
 */

import type { WorkflowTemplate, WorkflowStep } from '@/hooks/useWorkflowTemplates';

/**
 * Type guard: Check if template has workflow steps
 */
export function hasWorkflowSteps(template: any): template is WorkflowTemplate & { workflow_steps: WorkflowStep[] } {
  return Array.isArray(template?.workflow_steps) && template.workflow_steps.length > 0;
}

/**
 * Type guard: Check if generation has model metadata
 */
export interface GenerationWithModel {
  modelMetadata: {
    id: string;
    model_name: string;
    estimated_time_seconds: number;
  };
}

export function hasModelMetadata(generation: any): generation is GenerationWithModel {
  return generation?.modelMetadata !== null && generation?.modelMetadata !== undefined;
}

/**
 * Type guard: Check if step has model configuration
 */
export interface StepWithModel {
  model_id: string;
  model_record_id: string;
}

export function hasModelConfig(step: any): step is StepWithModel {
  return typeof step?.model_id === 'string' && 
         step.model_id.length > 0 &&
         typeof step?.model_record_id === 'string' &&
         step.model_record_id.length > 0;
}

/**
 * Type guard: Check if template has required fields
 */
export interface CompleteTemplate {
  id: string;
  name: string;
  workflow_steps: WorkflowStep[];
}

export function isCompleteTemplate(template: any): template is CompleteTemplate {
  return typeof template?.id === 'string' &&
         typeof template?.name === 'string' &&
         hasWorkflowSteps(template);
}

/**
 * Type guard: Check if value is a valid record
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Type guard: Check if array is non-empty
 */
export function isNonEmptyArray<T>(arr: T[] | null | undefined): arr is [T, ...T[]] {
  return Array.isArray(arr) && arr.length > 0;
}

/**
 * Type guard: Check if generation has complete metadata
 */
export interface GenerationWithMetadata {
  id: string;
  modelMetadata: {
    id: string;
    model_name: string;
    provider: string;
    content_type: string;
  };
}

export function hasGenerationMetadata(generation: unknown): generation is GenerationWithMetadata {
  if (!isRecord(generation)) return false;
  
  return (
    typeof generation.id === 'string' &&
    isRecord(generation.modelMetadata) &&
    typeof generation.modelMetadata.id === 'string' &&
    typeof generation.modelMetadata.model_name === 'string' &&
    typeof generation.modelMetadata.provider === 'string' &&
    typeof generation.modelMetadata.content_type === 'string'
  );
}

/**
 * Type guard: Check if cost multipliers are valid
 */
export interface ModelConfigWithMultipliers {
  costMultipliers: Record<string, number>;
}

export function hasValidCostMultipliers(config: unknown): config is ModelConfigWithMultipliers {
  if (!isRecord(config)) return false;
  
  return (
    isRecord(config.costMultipliers) &&
    Object.values(config.costMultipliers).every(v => typeof v === 'number')
  );
}

/**
 * Type guard: Check if value is a valid number (not NaN or Infinity)
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Type guard: Check if value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}
