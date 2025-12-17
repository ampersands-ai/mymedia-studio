/**
 * Public Workflow Template Types
 * Used for client-side queries - excludes proprietary workflow_steps
 */

import type { UserInputField } from "@/hooks/useWorkflowTemplates";

/**
 * Public workflow template - safe for client exposure
 * Excludes workflow_steps (proprietary logic) but includes model reference
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
  // Model reference extracted from first workflow step
  primary_model_record_id: string | null;
  primary_model_id: string | null;
}

/**
 * Lightweight preview for UI lists
 */
export interface WorkflowTemplatePreview extends WorkflowTemplatePublic {
  primaryContentType: 'image' | 'video' | 'audio' | 'text';
  estimatedBaseCost: number;
  template_type: 'workflow';
}
