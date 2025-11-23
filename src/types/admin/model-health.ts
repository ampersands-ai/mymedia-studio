import type {
  FlowStepData,
  FlowStepDetails,
  ModelParameters,
  ApiPayload,
  ApiResponse,
  StorageMetadata,
  StepMetadata
} from "./model-health-execution";

export interface FlowStepHoverData {
  title: string;
  details: FlowStepDetails;
  preview_url?: string;
  actions?: Array<{ label: string; action: string }>;
}

export interface FlowStep {
  step_name: string;
  step_number: number;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  status: 'pending' | 'running' | 'completed' | 'failed';
  data: FlowStepData;
  error: string | null;
  substatus?: 'preparing' | 'executing' | 'completed' | 'failed';
  hover_data?: FlowStepHoverData;
  progress_percent?: number;
  retryable?: boolean;
}

export interface ModelTestResult {
  id: string;
  model_record_id: string;
  test_started_at: string;
  test_completed_at: string | null;
  test_prompt: string;
  test_parameters: ModelParameters;
  test_user_id: string | null;
  flow_steps: FlowStep[];
  status: 'running' | 'success' | 'failed' | 'timeout' | 'error';
  generation_id: string | null;
  output_url: string | null;
  error_code: string | null;
  error_message: string | null;
  error_stack: string | null;
  total_latency_ms: number | null;
  credit_check_ms: number | null;
  credit_deduct_ms: number | null;
  generation_submit_ms: number | null;
  polling_duration_ms: number | null;
  output_receive_ms: number | null;
  storage_save_ms: number | null;
  credits_required: number | null;
  credits_available_before: number | null;
  credits_deducted: boolean;
  credits_refunded: boolean;
  created_at: string;
  updated_at: string;
  api_request_payload?: ApiPayload;
  api_first_response?: ApiResponse;
  api_final_response?: ApiResponse;
  storage_metadata?: StorageMetadata;
  media_preview_url?: string;
  step_metadata?: StepMetadata;
}

export interface ModelHealthFilter {
  provider?: string;
  contentType?: string;
  status?: 'all' | 'success' | 'warning' | 'error' | 'never-tested';
  search?: string;
}

export interface ModelHealthSort {
  field: 'model_name' | 'success_rate' | 'avg_latency' | 'last_test' | 'provider';
  direction: 'asc' | 'desc';
}

export interface TestExecutionProgress {
  modelRecordId: string;
  modelName: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  currentStep?: number;
  totalSteps: number;
  error?: string;
}

/**
 * Simplified model health summary for registry-based models
 * Used by model testing UI components
 */
export interface ModelHealthSummary {
  record_id: string;
  model_id: string;
  model_name: string;
  provider: string;
  content_type: string;
  is_active: boolean;
  groups: string[] | null;
  total_tests_24h: number;
  successful_tests_24h: number;
  failed_tests_24h: number;
  success_rate_percent_24h: number | null;
  avg_latency_ms: number | null;
  max_latency_ms: number | null;
  min_latency_ms: number | null;
  last_test_at: string | null;
  recent_error_codes: string[] | null;
  deduct_credits: boolean | null;
  timeout_seconds: number | null;
}

export interface SystemHealthMetrics {
  totalModels: number;
  activeModels: number;
  testedLast24h: number;
  successRate: number;
  avgLatency: number;
  failedModels: number;
}

