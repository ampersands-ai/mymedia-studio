/**
 * Central Type Definitions
 * Shared types, interfaces, and utilities used across the application
 */

import { z } from 'zod';

// ============= Common Base Types =============

export type UUID = string;
export type ISODateString = string;
export type JSONValue = string | number | boolean | null | JSONObject | JSONArray;
export type JSONObject = { [key: string]: JSONValue };
export type JSONArray = Array<JSONValue>;

// ============= API Response Types =============

export interface ApiResponse<T = unknown> {
  data: T | null;
  error: ApiError | null;
}

export interface ApiError {
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  metadata?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

// ============= Request Context Types =============

export interface RequestContext {
  requestId: string;
  userId?: string;
  operation: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface PerformanceContext extends RequestContext {
  startTime: number;
  duration?: number;
}

// ============= Database Common Types =============

export interface BaseEntity {
  id: UUID;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface UserOwnedEntity extends BaseEntity {
  user_id: UUID;
}

// ============= Hook Return Types =============

export interface QueryHookResult<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export interface MutationHookResult<TInput, TOutput = void> {
  mutate: (input: TInput) => void;
  mutateAsync: (input: TInput) => Promise<TOutput>;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
  reset: () => void;
}

// ============= Status and State Types =============

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export type ProcessingStatus = 
  | 'pending'
  | 'queued' 
  | 'processing' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

export interface AsyncState<T = unknown> {
  status: AsyncStatus;
  data: T | null;
  error: Error | null;
}

// ============= Validation Schemas =============

export const UUIDSchema = z.string().uuid();
export const ISODateSchema = z.string().datetime();
export const NonEmptyStringSchema = z.string().min(1);
export const PositiveNumberSchema = z.number().positive();
export const NonNegativeNumberSchema = z.number().nonnegative();

// ============= Type Guards =============

export function isUUID(value: unknown): value is UUID {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function isISODate(value: unknown): value is ISODateString {
  return typeof value === 'string' && !isNaN(Date.parse(value));
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'message' in value &&
    'severity' in value
  );
}

// ============= Utility Types =============

/**
 * Make specific properties required
 */
export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

/**
 * Make specific properties optional
 */
export type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Extract non-nullable properties
 */
export type NonNullable<T> = T extends null | undefined ? never : T;

/**
 * Deep partial (all nested properties optional)
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Async function type
 */
export type AsyncFunction<TArgs extends unknown[] = unknown[], TReturn = unknown> = 
  (...args: TArgs) => Promise<TReturn>;

/**
 * Extract promise return type
 */
export type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

// ============= Environment Variable Types =============

export interface EnvConfig {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_PUBLISHABLE_KEY: string;
  VITE_SUPABASE_PROJECT_ID: string;
  MODE: 'development' | 'production' | 'test';
  DEV: boolean;
  PROD: boolean;
}

// ============= Logging Types =============

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

export interface LogContext extends Record<string, unknown> {
  component?: string;
  operation?: string;
  requestId?: string;
  userId?: string;
  duration?: number;
  errorCode?: string;
}

// ============= Configuration Types =============

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface TimeoutConfig {
  request: number;
  operation: number;
}

// ============= Feature Flag Types =============

export type FeatureFlag = 
  | 'webhook_monitoring'
  | 'advanced_analytics'
  | 'ai_enhancement'
  | 'beta_features';

export interface FeatureFlags {
  [key: string]: boolean;
}

// ============= Export All =============

export type {
  // Re-export from other type files for convenience
} from './admin';
export type {
  // Re-export custom creation types
} from './custom-creation';
export type {
  // Re-export storyboard types
} from './storyboard';
export type {
  // Re-export video types  
} from './video';
