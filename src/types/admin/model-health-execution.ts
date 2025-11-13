/**
 * Type-safe model health execution flow definitions
 * 
 * Provides complete type safety for AI model health monitoring,
 * test execution, and performance tracking.
 */

import type { ParameterValue } from "@/types/schema";

/**
 * Model parameters - can be any valid parameter value
 */
export type ModelParameters = Record<string, ParameterValue>;

/**
 * API payload structure for model requests
 */
export interface ApiPayload {
  prompt?: string;
  model?: string;
  parameters?: ModelParameters;
  images?: string[];
  [key: string]: unknown;
}

/**
 * Provider-specific metadata returned from API
 */
export interface ProviderMetadata {
  task_id?: string;
  status?: string;
  eta?: number;
  queue_position?: number;
  [key: string]: unknown;
}

/**
 * API response structure from providers
 */
export interface ApiResponse {
  status?: string;
  output?: string | string[];
  error?: string;
  metadata?: ProviderMetadata;
  [key: string]: unknown;
}

/**
 * Storage metadata for generated media
 */
export interface StorageMetadata {
  bucket?: string;
  path?: string;
  size_bytes?: number;
  mime_type?: string;
  url?: string;
  [key: string]: unknown;
}

/**
 * Step-specific metadata during execution
 */
export interface StepMetadata {
  attempt?: number;
  retry_count?: number;
  timeout_ms?: number;
  checkpoint?: string;
  [key: string]: unknown;
}

/**
 * Generic data container for flow steps
 */
export type FlowStepData = Record<string, unknown>;

/**
 * Details for flow step hover information
 */
export type FlowStepDetails = Record<string, unknown>;

/**
 * Type guard to check if value is ModelParameters
 */
export function isModelParameters(value: unknown): value is ModelParameters {
  if (typeof value !== 'object' || value === null) return false;
  return Object.values(value).every(v => 
    typeof v === 'string' || 
    typeof v === 'number' || 
    typeof v === 'boolean' || 
    v === null
  );
}

/**
 * Safely convert unknown to ModelParameters
 */
export function toModelParameters(value: unknown): ModelParameters {
  if (isModelParameters(value)) return value;
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        k,
        typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ? v : null
      ])
    );
  }
  return {};
}

/**
 * Type guard for API payload
 */
export function isApiPayload(value: unknown): value is ApiPayload {
  if (typeof value !== 'object' || value === null) return false;
  const payload = value as Partial<ApiPayload>;
  return (
    payload.prompt === undefined || typeof payload.prompt === 'string'
  ) && (
    payload.model === undefined || typeof payload.model === 'string'
  );
}

/**
 * Safe value renderer for unknown types
 */
export function renderUnknownValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return '[Complex Object]';
    }
  }
  return String(value);
}
