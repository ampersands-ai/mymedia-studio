import type { Database } from '@/integrations/supabase/types';

// Database table types
export type Generation = Database['public']['Tables']['generations']['Row'];
export type GenerationInsert = Database['public']['Tables']['generations']['Insert'];
export type GenerationUpdate = Database['public']['Tables']['generations']['Update'];

export type WorkflowTemplate = Database['public']['Tables']['workflow_templates']['Row'];
export type WorkflowTemplateInsert = Database['public']['Tables']['workflow_templates']['Insert'];

export type VideoJob = Database['public']['Tables']['video_jobs']['Row'];
export type VideoJobInsert = Database['public']['Tables']['video_jobs']['Insert'];

export type WorkflowExecution = Database['public']['Tables']['workflow_executions']['Row'];
export type WorkflowExecutionInsert = Database['public']['Tables']['workflow_executions']['Insert'];

export type AzureVoice = Database['public']['Tables']['azure_voices']['Row'];
export type Storyboard = Database['public']['Tables']['storyboards']['Row'];
export type StoryboardInsert = Database['public']['Tables']['storyboards']['Insert'];

// API Response types
export interface GenerationResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  storage_path?: string;
  error_message?: string;
  tokens_used: number;
  created_at: string;
  model_id?: string;
  prompt?: string;
}

export interface ModelListResponse {
  models: any[];
  count: number;
}

export interface WorkflowTemplateResponse {
  template: WorkflowTemplate;
}

export interface VideoJobResponse {
  id: string;
  status: 'pending' | 'processing' | 'rendering' | 'completed' | 'failed';
  video_url?: string;
  error_message?: string;
  progress?: number;
}

export interface WorkflowExecutionResponse {
  execution_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  step_outputs: Record<string, unknown>;
  final_output_url?: string;
  error_message?: string;
}

export interface StoryboardResponse {
  id: string;
  status: 'draft' | 'rendering' | 'complete' | 'failed';
  video_url?: string;
  scenes: StoryboardScene[];
  error_message?: string;
}

export interface StoryboardScene {
  id: string;
  prompt: string;
  image_url?: string;
  duration?: number;
  order: number;
}

// Webhook payload types
export interface WebhookPayload {
  task_id: string;
  status: 'pending' | 'completed' | 'failed';
  output_url?: string;
  error_message?: string;
  provider_response?: Record<string, unknown>;
}

// Error response types
export interface ErrorResponse {
  error: string;
  message?: string;
  details?: Record<string, unknown>;
  code?: string;
}

// Pagination types
export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

// Custom parameters type
export type CustomParameters = Record<string, string | number | boolean | undefined>;
