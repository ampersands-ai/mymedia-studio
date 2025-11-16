/**
 * Type definitions for workflow display and input components
 * Eliminates 'any' types in workflow visualization and input forms
 */

import type { WorkflowStep, UserInputField } from "@/hooks/useWorkflowTemplates";

/**
 * Possible input value types that can be collected from users
 */
export type WorkflowInputValue = 
  | string 
  | number 
  | boolean 
  | string[] // For multiple file uploads or multi-select
  | File
  | File[];

/**
 * Map of input field names to their values
 */
export interface WorkflowInputs {
  [fieldName: string]: WorkflowInputValue;
}

/**
 * Schema property definition for workflow parameters
 */
export interface SchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: string[];
  items?: SchemaProperty;
  properties?: Record<string, SchemaProperty>;
  required?: string[];
  [key: string]: unknown;
}

/**
 * Input schema structure for AI models
 */
export interface ModelInputSchema {
  type?: 'object';
  properties?: Record<string, SchemaProperty>;
  required?: string[];
  [key: string]: unknown;
}

/**
 * Extended user input field with runtime properties
 */
export interface WorkflowInputFieldConfig extends UserInputField {
  options?: string[];
  max_files?: number;
  min_value?: number;
  max_value?: number;
}

/**
 * Data structure for workflow step node visualization
 */
export interface StepNodeData {
  step: WorkflowStep;
}

/**
 * Data structure for user input node visualization
 */
export interface UserInputNodeData {
  fields: UserInputField[];
}

/**
 * Data structure for output node visualization
 */
export type OutputNodeData = Record<string, never>;

/**
 * Type guard to check if a value is a valid workflow input value
 */
export function isWorkflowInputValue(value: unknown): value is WorkflowInputValue {
  if (value === null || value === undefined) return false;
  
  const valueType = typeof value;
  if (valueType === 'string' || valueType === 'number' || valueType === 'boolean') {
    return true;
  }
  
  if (value instanceof File) {
    return true;
  }
  
  if (Array.isArray(value)) {
    return value.every(item => 
      typeof item === 'string' || item instanceof File
    );
  }
  
  return false;
}

/**
 * Type guard for schema property
 */
export function isSchemaProperty(value: unknown): value is SchemaProperty {
  if (!value || typeof value !== 'object') return false;
  
  const prop = value as Record<string, unknown>;
  return typeof prop.type === 'string';
}

/**
 * Type guard for model input schema
 */
export function isModelInputSchema(value: unknown): value is ModelInputSchema {
  if (!value || typeof value !== 'object') return false;
  
  const schema = value as Record<string, unknown>;
  return (
    schema.type === 'object' || 
    typeof schema.properties === 'object' ||
    Array.isArray(schema.required)
  );
}

/**
 * Safely converts unknown value to WorkflowInputValue
 */
export function toWorkflowInputValue(value: unknown): WorkflowInputValue | null {
  if (isWorkflowInputValue(value)) {
    return value;
  }
  
  // Attempt coercion for common cases
  if (value === null || value === undefined) {
    return null;
  }
  
  // Convert to string as fallback
  return String(value);
}

/**
 * Safely converts unknown value to ModelInputSchema
 */
export function toModelInputSchema(value: unknown): ModelInputSchema | null {
  if (isModelInputSchema(value)) {
    return value;
  }
  return null;
}

/**
 * Gets a schema property safely from a schema object
 */
export function getSchemaProperty(
  schema: ModelInputSchema | null | undefined,
  propertyName: string
): SchemaProperty | null {
  if (!schema?.properties) return null;
  
  const prop = schema.properties[propertyName];
  return isSchemaProperty(prop) ? prop : null;
}
