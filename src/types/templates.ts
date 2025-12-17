/**
 * Explicit Template Type System
 * Eliminates fragile optional chaining patterns with strongly-typed variants
 */

import type { UserInputField } from "@/hooks/useWorkflowTemplates";

/**
 * Base workflow template (admin-only, from database)
 * Contains all workflow configuration including proprietary workflow_steps
 */
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  thumbnail_url: string | null;
  before_image_url: string | null;
  after_image_url: string | null;
  is_active: boolean;
  display_order: number;
  estimated_time_seconds: number | null;
  workflow_steps: WorkflowStep[];
  user_input_fields: UserInputField[];
  created_at: string;
  updated_at: string;
}

/**
 * Workflow step (admin-only, proprietary)
 */
export interface WorkflowStep {
  step_number: number;
  step_name: string;
  model_id: string;
  model_record_id?: string;
  prompt_template: string;
  parameters: Record<string, any>;
  input_mappings: Record<string, string>;
  output_key: string;
}

/**
 * Model metadata resolved from registry
 * Explicitly typed - no optional fields
 */
export interface ModelMetadata {
  recordId: string;
  modelId: string;
  modelName: string;
  baseCost: number;
  contentType: string;
  provider: string;
  estimatedTimeSeconds: number;
}

/**
 * Enriched template with full model metadata
 * Use when full model data is required (e.g., generation dialog)
 */
export interface EnrichedTemplate extends WorkflowTemplatePublic {
  modelMetadata: ModelMetadata;
}

/**
 * Public workflow template - safe for client exposure
 * Excludes workflow_steps but includes model reference
 */
export interface WorkflowTemplatePublic {
  id: string;
  name: string;
  description: string | null;
  category: string;
  thumbnail_url: string | null;
  before_image_url: string | null;
  after_image_url: string | null;
  is_active: boolean;
  display_order: number;
  estimated_time_seconds: number | null;
  user_input_fields: UserInputField[];
  created_at: string;
  updated_at: string;
  primary_model_record_id: string | null;
  primary_model_id: string | null;
}

/**
 * Lightweight template preview for UI lists
 * Uses synchronous extraction - no async registry lookups
 */
export interface TemplatePreview extends WorkflowTemplatePublic {
  primaryContentType: 'image' | 'video' | 'audio' | 'text';
  estimatedBaseCost: number;
  template_type: 'workflow';
}

/**
 * Type guard to check if template has model data
 */
export function hasModelReference(template: WorkflowTemplatePublic): boolean {
  return !!template.primary_model_record_id;
}

/**
 * Extract content type from model_id string (fallback heuristic)
 * Used only when model registry is unavailable
 */
export function inferContentTypeFromModelId(modelId?: string | null): 'image' | 'video' | 'audio' | 'text' {
  if (!modelId) return 'image';
  
  const lower = modelId.toLowerCase();
  if (lower.includes('video') || lower.includes('veo') || lower.includes('kling') || lower.includes('runway')) {
    return 'video';
  }
  if (lower.includes('audio') || lower.includes('tts') || lower.includes('eleven') || lower.includes('suno')) {
    return 'audio';
  }
  return 'image';
}
