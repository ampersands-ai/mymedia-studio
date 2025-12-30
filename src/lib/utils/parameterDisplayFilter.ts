/**
 * Centralized Parameter Display Filter - ADR Compliant
 * 
 * Single source of truth for filtering hidden parameters from UI display.
 * Respects schema's showToUser: false property and filters system parameters.
 */

import { RECORD_ID_REGISTRY } from '@/lib/models/locked/index';

/**
 * System/internal parameter keys that should NEVER be shown to users.
 * These are infrastructure-level fields, not user-configurable parameters.
 */
const SYSTEM_PARAMETER_KEYS = new Set([
  // Webhook/internal
  '_webhook_token',
  'webhook_token',
  
  // Content fields (shown separately)
  'prompt',
  'imageUrls',
  'image_url',
  'audio_url',
  'video_url',
  'maskUrl',
  'mask_url',
  
  // Auth/system
  'model',
  'userId',
  'user_id',
  
  // Internal processing
  'taskType',
  'taskUUID',
  'uploadEndpoint',
  'outputType',
  'includeCost',
  'checkNSFW',
  
  // Webhook/callback
  'callbackUrl',
  'callback_url',
]);

/**
 * Parameters that are commonly hidden across models.
 * Used as fallback when schema lookup fails.
 */
const COMMON_HIDDEN_KEYS = new Set([
  'seed',
  'sync_mode',
  'enableFallback',
  'fallbackModel',
  'isEnhance',
  'return_timestamps',
  'previous_text',
  'next_text',
  'prompt_expansion',
  'prompt_optimizer',
  'safety_checker',
  'numberResults',
  'num_frames',
  'shift',
  'frames_per_second',
  'guidance_scale',
  'sample_rate',
  'bitrate',
]);

export interface DisplayParameter {
  key: string;      // Original key name
  label: string;    // Formatted label (Title Case)
  value: string;    // Formatted value
}

/**
 * Format a parameter key into a readable label
 * e.g., "aspect_ratio" -> "Aspect Ratio"
 */
function formatLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Format a parameter value for display
 * Returns null if value shouldn't be displayed (too long, complex object, etc.)
 */
function formatValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    // Skip URLs and very long strings
    if (value.startsWith('http') || value.startsWith('data:')) return null;
    if (value.length > 50) return null;
    return value;
  }
  // Skip arrays and objects
  if (Array.isArray(value) || typeof value === 'object') return null;
  return null;
}

/**
 * Get hidden parameter keys from model schema
 */
function getSchemaHiddenKeys(modelRecordId: string | null | undefined): Set<string> {
  const hiddenKeys = new Set<string>();
  
  if (!modelRecordId) return hiddenKeys;
  
  try {
    const module = RECORD_ID_REGISTRY[modelRecordId];
    if (!module?.SCHEMA?.properties) return hiddenKeys;
    
    const properties = module.SCHEMA.properties as Record<string, { showToUser?: boolean }>;
    
    for (const [key, prop] of Object.entries(properties)) {
      // Explicitly check for showToUser: false
      if (prop && prop.showToUser === false) {
        hiddenKeys.add(key);
      }
    }
  } catch {
    // Schema lookup failed, return empty set (will use fallback)
  }
  
  return hiddenKeys;
}

export interface DisplayFilterOptions {
  /** If true, shows all parameters including hidden ones (for admin use) */
  showHidden?: boolean;
  /** Maximum number of parameters to return */
  maxParams?: number;
}

/**
 * Filter and format settings for display.
 * 
 * This is the SINGLE SOURCE OF TRUTH for determining which parameters
 * should be shown to users across the entire application.
 * 
 * Filtering logic (in order of precedence):
 * 1. SYSTEM_PARAMETER_KEYS - Always hidden (infrastructure fields)
 * 2. Schema showToUser: false - Hidden per model definition
 * 3. COMMON_HIDDEN_KEYS - Fallback for when schema lookup fails
 * 
 * @param settings - The settings/parameters object from a generation
 * @param modelRecordId - The model's record ID for schema lookup
 * @param options - Optional configuration
 * @returns Array of displayable parameters with formatted labels and values
 */
export function getDisplayableParameters(
  settings: Record<string, unknown> | null | undefined,
  modelRecordId: string | null | undefined,
  options: DisplayFilterOptions = {}
): DisplayParameter[] {
  if (!settings || Object.keys(settings).length === 0) {
    return [];
  }
  
  const { showHidden = false, maxParams } = options;
  
  // Get schema-defined hidden keys
  const schemaHiddenKeys = getSchemaHiddenKeys(modelRecordId);
  
  const displayParams: DisplayParameter[] = [];
  
  for (const [key, value] of Object.entries(settings)) {
    // Skip system parameters (always hidden)
    if (SYSTEM_PARAMETER_KEYS.has(key)) continue;
    
    // Skip schema-hidden parameters (unless showHidden is true)
    if (!showHidden && schemaHiddenKeys.has(key)) continue;
    
    // Skip common hidden parameters as fallback
    if (!showHidden && schemaHiddenKeys.size === 0 && COMMON_HIDDEN_KEYS.has(key)) continue;
    
    // Format the value
    const formattedValue = formatValue(value);
    if (formattedValue === null) continue;
    
    displayParams.push({
      key,
      label: formatLabel(key),
      value: formattedValue,
    });
  }
  
  // Apply max params limit if specified
  if (maxParams && displayParams.length > maxParams) {
    return displayParams.slice(0, maxParams);
  }
  
  return displayParams;
}

/**
 * Format parameters as a single string (for compact display)
 * Returns null if no displayable parameters
 */
export function getDisplayableParametersString(
  settings: Record<string, unknown> | null | undefined,
  modelRecordId: string | null | undefined,
  options: DisplayFilterOptions = {}
): string | null {
  const params = getDisplayableParameters(settings, modelRecordId, options);
  if (params.length === 0) return null;
  
  return params.map(p => `${p.label}: ${p.value}`).join(' • ');
}
