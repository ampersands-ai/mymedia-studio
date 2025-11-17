/**
 * Type-safe JSON Schema definitions
 * 
 * These types provide complete type safety for JSON schemas used throughout
 * the application, eliminating the need for `any` types in schema handling.
 */

import type { Json } from "@/integrations/supabase/types";

/**
 * Supported JSON Schema primitive types
 */
export type JsonSchemaType = 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';

/**
 * Supported parameter values
 * Extended to support arrays and objects for complex schemas
 */
export type ParameterValue = 
  | string 
  | number 
  | boolean 
  | string[]
  | number[]
  | Record<string, unknown>
  | null;

/**
 * JSON Schema property definition
 */
export interface JsonSchemaProperty {
  type: JsonSchemaType;
  title?: string;
  description?: string;
  default?: ParameterValue;
  enum?: Array<string | number>;
  showToUser?: boolean;
  isAdvanced?: boolean;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  format?: string;
  items?: JsonSchemaProperty;
  
  // Explicit renderer assignment (replaces heuristic detection)
  renderer?: 'prompt' | 'image' | 'voice' | 'duration' | 'increment' | 'output-format' | null;
}

/**
 * Complete JSON Schema definition
 */
export interface JsonSchema {
  type: 'object';
  properties: Record<string, JsonSchemaProperty>;
  required?: string[];
  'x-order'?: string[];
  
  // Legacy - kept for backward compatibility
  imageInputField?: string | null;
}

/**
 * Model configuration with strongly typed schema
 */
export interface ModelConfiguration {
  record_id: string;
  id: string;
  provider: string;
  model_name: string;
  content_type: string;
  base_token_cost: number;
  cost_multipliers: Record<string, number> | null;
  input_schema: JsonSchema;
  api_endpoint: string | null;
  is_active: boolean;
  groups?: string[];
  estimated_time_seconds?: number | null;
  payload_structure?: 'wrapper' | 'direct';
  max_images?: number | null;
  logo_url?: string | null;
  default_outputs?: number | null;
  model_family?: string;
  variant_name?: string;
  display_order_in_family?: number;
}

/**
 * Template parameter values
 */
export type TemplateParameters = Record<string, ParameterValue>;

/**
 * Content template configuration
 */
export interface TemplateConfiguration {
  id: string;
  category: string;
  name: string;
  description: string | null;
  model_id: string | null;
  preset_parameters: TemplateParameters;
  user_editable_fields?: string[];
  hidden_field_defaults?: TemplateParameters;
  is_custom_model?: boolean;
  enhancement_instruction: string | null;
  thumbnail_url: string | null;
  before_image_url: string | null;
  after_image_url: string | null;
  is_active: boolean;
  display_order: number;
  estimated_time_seconds?: number | null;
}

/**
 * Type guard to check if a value is a valid JsonSchema
 */
export function isJsonSchema(value: unknown): value is JsonSchema {
  if (typeof value !== 'object' || value === null) return false;
  const schema = value as Partial<JsonSchema>;
  return (
    schema.type === 'object' &&
    typeof schema.properties === 'object' &&
    schema.properties !== null
  );
}

/**
 * Type guard to check if a value is a valid JsonSchemaProperty
 */
export function isJsonSchemaProperty(value: unknown): value is JsonSchemaProperty {
  if (typeof value !== 'object' || value === null) return false;
  const prop = value as Partial<JsonSchemaProperty>;
  return (
    typeof prop.type === 'string' &&
    ['string', 'number', 'integer', 'boolean', 'array', 'object'].includes(prop.type)
  );
}

/**
 * Convert Json type to JsonSchema (for compatibility with Supabase types)
 */
export function jsonToSchema(json: Json): JsonSchema {
  if (typeof json === 'object' && json !== null && !Array.isArray(json)) {
    return json as unknown as JsonSchema;
  }
  // Fallback to empty schema
  return { type: 'object', properties: {} };
}

/**
 * Convert JsonSchema to Json (for compatibility with Supabase types)
 */
export function schemaToJson(schema: JsonSchema): Json {
  return schema as unknown as Json;
}
