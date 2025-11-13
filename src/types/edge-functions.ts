import type { CustomParameters } from './api-responses';

// Edge function request types
export interface GenerateContentRequest {
  model_id: string;
  model_record_id: string;
  prompt: string;
  custom_parameters?: CustomParameters;
  template_id?: string;
  enhance_prompt?: boolean;
  user_id?: string; // For service role calls
}

export interface TestModelRequest {
  model_id: string;
  test_prompt: string;
  custom_parameters?: CustomParameters;
}

export interface WorkflowExecutorRequest {
  template_id: string;
  user_input: Record<string, unknown>;
}

export interface CancelGenerationRequest {
  generation_id: string;
}

export interface ApproveVoiceoverRequest {
  voiceover_id: string;
  approved: boolean;
  rejection_reason?: string;
}

export interface CreateVideoJobRequest {
  prompt: string;
  voice_id?: string;
  music_prompt?: string;
  custom_parameters?: CustomParameters;
}

export interface UpdateStoryboardRequest {
  storyboard_id: string;
  scenes?: Array<{
    prompt: string;
    duration?: number;
    order: number;
  }>;
  video_url?: string;
  status?: 'draft' | 'rendering' | 'complete' | 'failed';
}

// Edge function response types
export interface EdgeFunctionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ValidationErrorResponse {
  error: 'Validation failed';
  details: Record<string, string[]>;
}

// Webhook types
export interface WebhookRequest {
  task_id: string;
  status: 'pending' | 'completed' | 'failed';
  output_url?: string;
  error_message?: string;
  provider_response?: Record<string, unknown>;
}
