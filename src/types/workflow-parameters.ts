/**
 * Type-safe workflow parameter definitions
 * 
 * Provides complete type safety for workflow execution, parameter configuration,
 * and step form handling, eliminating `any` types across workflow components.
 */

import type { JsonSchema, JsonSchemaProperty, ParameterValue } from "./schema";

/**
 * Workflow step parameter value (can be any valid parameter value)
 */
export type WorkflowParameterValue = ParameterValue | File | string[];

/**
 * Workflow step parameters map
 */
export type WorkflowStepParameters = Record<string, WorkflowParameterValue>;

/**
 * User input values for workflow execution
 */
export type WorkflowTestInputs = Record<string, WorkflowParameterValue>;

/**
 * Parameter configuration for template forms
 */
export interface ParameterConfiguration {
  name: string;
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
  description?: string;
  required?: boolean;
  enum?: string[];
  default?: ParameterValue;
  userEditable: boolean;
  defaultValue: ParameterValue;
}

/**
 * Model data structure from Supabase
 */
export interface WorkflowModelData {
  input_schema: JsonSchema;
  max_images?: number | null;
  content_type: string;
  provider: string;
}

/**
 * Step models map for workflow testing
 */
export type WorkflowStepModels = Record<number, WorkflowModelData>;

/**
 * Field schema information for workflow input mapping
 */
export interface FieldSchemaInfo {
  stepNumber: number;
  modelParam: string;
  paramSchema: JsonSchemaProperty;
  contentType: string;
  maxImages?: number | null;
  expectsArray: boolean;
  isRequired: boolean;
}

/**
 * Mapping source for workflow parameter configuration
 */
export interface MappingSource {
  value: string;
  label: string;
}

/**
 * Parameter mode for workflow step configuration
 */
export type ParameterMode = 'static' | 'mapped';

/**
 * Parameter modes map
 */
export type ParameterModes = Record<string, ParameterMode>;

/**
 * Model schema with properties and required fields
 */
export interface ModelSchema {
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
}

/**
 * Type guard to check if a value is a valid ModelSchema
 */
export function isModelSchema(value: unknown): value is ModelSchema {
  if (typeof value !== 'object' || value === null) return false;
  const schema = value as Partial<ModelSchema>;
  return (
    typeof schema.properties === 'object' ||
    Array.isArray(schema.required)
  );
}

/**
 * Convert unknown schema to ModelSchema safely
 */
export function toModelSchema(schema: unknown): ModelSchema | null {
  if (!schema || typeof schema !== 'object') return null;
  
  const obj = schema as Record<string, unknown>;
  return {
    properties: typeof obj.properties === 'object' && obj.properties !== null
      ? obj.properties as Record<string, JsonSchemaProperty>
      : undefined,
    required: Array.isArray(obj.required)
      ? obj.required.filter((r): r is string => typeof r === 'string')
      : undefined
  };
}

/**
 * Type guard for WorkflowParameterValue
 */
export function isWorkflowParameterValue(value: unknown): value is WorkflowParameterValue {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null ||
    value instanceof File
  );
}

/**
 * Safely convert value to WorkflowParameterValue
 */
export function toWorkflowParameterValue(value: unknown): WorkflowParameterValue {
  if (isWorkflowParameterValue(value)) return value;
  if (value === undefined) return null;
  return String(value);
}
