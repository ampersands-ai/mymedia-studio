/**
 * Type definitions for model schemas and parameters
 * Eliminates 'any' types in ModelParameterForm and SchemaInput
 */

/**
 * JSON Schema property types
 */
export type JsonSchemaType = 
  | 'string' 
  | 'number' 
  | 'integer'
  | 'boolean' 
  | 'array' 
  | 'object'
  | 'null';

/**
 * JSON Schema property definition
 * Type is optional to handle dynamic property extraction
 * Compatible with src/types/schema.ts
 */
export interface JsonSchemaProperty {
  type?: JsonSchemaType | JsonSchemaType[];
  title?: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  items?: JsonSchemaProperty;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  showToUser?: boolean;
  isAdvanced?: boolean;
  examples?: unknown[];
}

/**
 * Complete JSON Schema structure for AI models
 * Type is optional to handle partial schemas
 */
export interface ModelJsonSchema {
  type?: 'object';
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  'x-order'?: string[];
  fieldDependencies?: FieldDependencies;
  [key: string]: unknown;
}

/**
 * Field dependency rules
 * Maps a field to dependent fields and their allowed values
 */
export interface FieldDependencies {
  [fieldName: string]: {
    [dependentField: string]: {
      [dependentValue: string]: unknown[];
    };
  };
}

/**
 * Model parameter value types
 * Aligned with SchemaValue to support all schema input types
 */
export type ModelParameterValue = 
  | string 
  | number 
  | boolean 
  | string[]
  | number[]
  | Record<string, unknown>
  | null
  | undefined;

/**
 * Model parameters collection
 */
export interface ModelParameters {
  [key: string]: ModelParameterValue;
}

/**
 * Props for schema input components
 */
export interface SchemaInputContext {
  allValues?: ModelParameters;
  modelSchema?: ModelJsonSchema;
  modelId?: string;
  provider?: string;
}

/**
 * Type guard for JSON Schema property
 */
export function isJsonSchemaProperty(value: unknown): value is JsonSchemaProperty {
  if (!value || typeof value !== 'object') return false;
  
  const prop = value as Record<string, unknown>;
  return (
    typeof prop.type === 'string' ||
    (Array.isArray(prop.type) && prop.type.every((t) => typeof t === 'string'))
  );
}

/**
 * Type guard for Model JSON Schema
 */
export function isModelJsonSchema(value: unknown): value is ModelJsonSchema {
  if (!value || typeof value !== 'object') return false;
  
  const schema = value as Record<string, unknown>;
  return (
    schema.type === 'object' &&
    typeof schema.properties === 'object' &&
    schema.properties !== null
  );
}

/**
 * Type guard for model parameter value
 */
export function isModelParameterValue(value: unknown): value is ModelParameterValue {
  const valueType = typeof value;
  if (value === null || value === undefined) return true;
  if (valueType === 'string' || valueType === 'number' || valueType === 'boolean') return true;
  if (Array.isArray(value)) {
    return value.every((item) => typeof item === 'string');
  }
  return false;
}

/**
 * Safely converts unknown value to ModelParameterValue
 */
export function toModelParameterValue(value: unknown): ModelParameterValue {
  if (isModelParameterValue(value)) {
    return value;
  }
  
  // Convert objects to string as fallback
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }
  
  return null;
}

/**
 * Safely converts unknown value to ModelJsonSchema
 */
export function toModelJsonSchema(value: unknown): ModelJsonSchema | null {
  if (isModelJsonSchema(value)) {
    return value;
  }
  return null;
}

/**
 * Gets a property from a schema safely
 */
export function getSchemaProperty(
  schema: ModelJsonSchema | null | undefined,
  propertyName: string
): JsonSchemaProperty | null {
  if (!schema?.properties) return null;
  
  const prop = schema.properties[propertyName];
  return isJsonSchemaProperty(prop) ? prop : null;
}

/**
 * Gets enum options from a schema property
 */
export function getEnumOptions(property: JsonSchemaProperty | null): unknown[] {
  if (!property?.enum) return [];
  return Array.isArray(property.enum) ? property.enum : [];
}

/**
 * Checks if a field is required in the schema
 */
export function isFieldRequired(
  schema: ModelJsonSchema | null | undefined,
  fieldName: string
): boolean {
  if (!schema?.required) return false;
  return schema.required.includes(fieldName);
}

/**
 * Gets the default value from a schema property
 */
export function getDefaultValue(property: JsonSchemaProperty | null): ModelParameterValue {
  if (!property) return undefined;
  return toModelParameterValue(property.default);
}

/**
 * Gets the order of fields from schema
 */
export function getFieldOrder(schema: ModelJsonSchema | null | undefined): string[] {
  if (!schema) return [];
  
  if (Array.isArray(schema['x-order'])) {
    return schema['x-order'] as string[];
  }
  
  if (schema.properties) {
    return Object.keys(schema.properties);
  }
  
  return [];
}

/**
 * Filters enum values based on field dependencies
 */
export function getFilteredEnum(
  schema: ModelJsonSchema | null | undefined,
  fieldName: string,
  property: JsonSchemaProperty,
  currentValues: ModelParameters
): unknown[] | undefined {
  if (!schema?.fieldDependencies || !property.enum) return undefined;
  
  const dependencies = schema.fieldDependencies[fieldName];
  if (!dependencies) return undefined;
  
  // Check each dependency rule
  for (const [dependentField, rules] of Object.entries(dependencies)) {
    const currentValue = currentValues[dependentField];
    if (currentValue !== undefined && currentValue !== null) {
      const allowedValues = rules[String(currentValue)];
      if (allowedValues) {
        return allowedValues;
      }
    }
  }
  
  return undefined;
}

/**
 * Initializes parameters with default values from schema
 */
export function initializeParameters(
  schema: ModelJsonSchema | null | undefined,
  currentValues: ModelParameters = {}
): ModelParameters {
  if (!schema?.properties) return currentValues;
  
  const initialized: ModelParameters = {};
  
  Object.entries(schema.properties).forEach(([key, property]) => {
    if (!isJsonSchemaProperty(property)) return;
    
    if (currentValues[key] !== undefined) {
      initialized[key] = currentValues[key];
    } else if (property.default !== undefined) {
      initialized[key] = toModelParameterValue(property.default);
    }
  });
  
  return initialized;
}

/**
 * Validates parameter value against schema property
 */
export function validateParameterValue(
  value: unknown,
  property: JsonSchemaProperty
): { valid: boolean; error?: string } {
  const paramValue = toModelParameterValue(value);
  
  // Check enum constraints
  if (property.enum && paramValue !== null && paramValue !== undefined) {
    if (!property.enum.includes(paramValue)) {
      return {
        valid: false,
        error: `Value must be one of: ${property.enum.join(', ')}`,
      };
    }
  }
  
  // Check number constraints
  if (typeof paramValue === 'number') {
    if (property.minimum !== undefined && paramValue < property.minimum) {
      return { valid: false, error: `Value must be at least ${property.minimum}` };
    }
    if (property.maximum !== undefined && paramValue > property.maximum) {
      return { valid: false, error: `Value must be at most ${property.maximum}` };
    }
  }
  
  // Check string constraints
  if (typeof paramValue === 'string') {
    if (property.minLength !== undefined && paramValue.length < property.minLength) {
      return { valid: false, error: `Must be at least ${property.minLength} characters` };
    }
    if (property.maxLength !== undefined && paramValue.length > property.maxLength) {
      return { valid: false, error: `Must be at most ${property.maxLength} characters` };
    }
    if (property.pattern) {
      const regex = new RegExp(property.pattern);
      if (!regex.test(paramValue)) {
        return { valid: false, error: 'Invalid format' };
      }
    }
  }
  
  return { valid: true };
}
