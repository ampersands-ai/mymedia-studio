export interface FlowStep {
  step_name: string;
  step_number: number;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  status: 'pending' | 'running' | 'completed' | 'failed';
  data: Record<string, any>;
  error: string | null;
}

export interface ModelTestResult {
  id: string;
  model_record_id: string;
  test_started_at: string;
  test_completed_at: string | null;
  test_prompt: string;
  test_parameters: Record<string, any>;
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
}

export interface ModelTestConfig {
  id: string;
  model_record_id: string;
  prompt_template: string;
  custom_parameters: Record<string, any>;
  num_outputs: number;
  deduct_credits: boolean;
  test_user_id: string | null;
  timeout_seconds: number;
  retry_on_failure: boolean;
  max_retries: number;
  save_outputs: boolean;
  expected_format: 'image' | 'video' | 'audio' | 'text' | null;
  max_latency_threshold: number;
  validate_file_accessible: boolean;
  created_at: string;
  updated_at: string;
}

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

export interface SystemHealthMetrics {
  totalModels: number;
  activeModels: number;
  testedLast24h: number;
  successRate: number;
  avgLatency: number;
  failedModels: number;
}
