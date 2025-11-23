/**
 * Explicit Template Type System
 * Eliminates fragile optional chaining patterns with strongly-typed variants
 */

import type { WorkflowStep, UserInputField } from "@/hooks/useWorkflowTemplates";

/**
 * Base workflow template (directly from database)
 * Contains all workflow configuration but NO model metadata
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
export interface EnrichedTemplate extends WorkflowTemplate {
  modelMetadata: ModelMetadata;
}

/**
 * Lightweight template preview for UI lists
 * Uses synchronous extraction - no async registry lookups
 * Extends base workflow fields for backward compatibility
 */
export interface TemplatePreview extends WorkflowTemplate {
  primaryModelRecordId: string;
  primaryContentType: 'image' | 'video' | 'audio' | 'text';
  estimatedBaseCost: number;
  template_type: 'workflow'; // For backward compatibility with MergedTemplate
}

/**
 * Type guard to check if template has model data in first step
 */
export function hasModelInFirstStep(template: WorkflowTemplate): boolean {
  return !!(template.workflow_steps?.[0]?.model_record_id);
}

/**
 * Extract content type from model_id string (fallback heuristic)
 * Used only when model registry is unavailable
 */
export function inferContentTypeFromModelId(modelId?: string): 'image' | 'video' | 'audio' | 'text' {
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
