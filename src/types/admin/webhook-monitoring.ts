/**
 * Type definitions for webhook monitoring and alert system
 * Eliminates any types in webhook-related components
 */

/**
 * Provider response structure from generations
 */
export interface ProviderResponse {
  error?: string;
  storage_error?: string;
  timestamp?: string;
  auto_fixed?: boolean;
  status?: string;
  message?: string;
  [key: string]: unknown;
}

/**
 * Alert configuration for a provider
 * Matches webhook_alert_config table structure
 */
export interface AlertConfig {
  id: string;
  provider: string;
  success_rate_threshold: number;
  failure_threshold: number;
  timeout_threshold_ms: number;
  alert_cooldown_minutes: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Alert history filters
 */
export interface AlertHistoryFilters {
  alertType?: string;
  severity?: string;
  isResolved?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Alert settings value type
 */
export type AlertSettingsValue = 
  | boolean
  | number
  | string
  | string[]
  | undefined;

/**
 * Webhook statistics
 */
export interface WebhookStats {
  successRate: number;
  totalWebhooks: number;
  completedCount: number;
  failedCount: number;
  processingCount: number;
  storageFailures: number;
  stuckGenerations: number;
  averageLatency: number;
}

/**
 * Recent webhook data
 */
export interface RecentWebhook {
  id: string;
  created_at: string;
  status: string;
  model_id: string;
  storage_path: string | null;
  provider_response: ProviderResponse | Record<string, unknown> | null;
  tokens_used: number;
  provider_task_id: string;
  user_id: string;
}

/**
 * Storage failure record
 */
export interface StorageFailure {
  id: string;
  created_at: string;
  model_id: string;
  error_message: string;
  storage_error: string;
  user_id: string;
}

/**
 * Provider statistics
 */
export interface ProviderStat {
  model_id: string;
  success_count: number;
  fail_count: number;
  failure_rate: number;
}

/**
 * Stuck generation record
 */
export interface StuckGeneration {
  id: string;
  created_at: string;
  status: string;
  model_id: string;
  user_id: string;
  provider_task_id: string;
  tokens_used: number;
}

/**
 * Type guard to check if an object is a ProviderResponse
 */
export function isProviderResponse(value: unknown): value is ProviderResponse {
  if (!value || typeof value !== 'object') return false;
  // Provider responses are flexible objects, so just check it's an object
  return true;
}

/**
 * Safely extract error message from provider response
 */
export function extractErrorFromResponse(response: unknown): string {
  if (!response || typeof response !== 'object') return 'Unknown error';
  const resp = response as ProviderResponse;
  return resp.error || resp.storage_error || resp.message || 'Unknown error';
}

/**
 * Safely extract storage error from provider response
 */
export function extractStorageError(response: unknown): string {
  if (!response || typeof response !== 'object') return '';
  const resp = response as ProviderResponse;
  return resp.storage_error || '';
}
