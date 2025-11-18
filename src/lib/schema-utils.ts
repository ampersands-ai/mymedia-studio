import type { JsonSchema, JsonSchemaProperty, JsonSchemaType, ParameterValue } from "@/types/schema";

export interface Parameter {
  name: string;
  label: string;
  description: string;
  type: JsonSchemaType;
  required: boolean;
  default?: ParameterValue;
  enum?: Array<string | number>;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  items?: { type: string; format?: string };
  format?: string;
  showToUser?: boolean; // Control visibility in end-user forms (default: true)
  isAdvanced?: boolean; // Show in Advanced Options panel (default: false)
  renderer?: string; // Custom renderer type
  minItems?: number; // For array types
  maxItems?: number; // For array types
}

/**
 * Parse JSON Schema -> Parameter[]
 * This ensures existing models load correctly
 */
export function parseSchema(schema: JsonSchema): Parameter[] {
  const parameters: Parameter[] = [];
  const required = schema.required || [];
  const properties = schema.properties || {};

  // Use x-order if available, otherwise fall back to Object.keys
  const order = Array.isArray(schema["x-order"]) 
    ? schema["x-order"].filter((name: string) => properties[name])
    : Object.keys(properties);

  order.forEach(name => {
    const prop = properties[name];
    
    parameters.push({
      name,
      label: prop.title || formatLabel(name), // Use title from schema if available
      description: prop.description || '',
      type: prop.type,
      required: required.includes(name),
      default: prop.default,
      enum: prop.enum,
      minimum: prop.minimum,
      maximum: prop.maximum,
      minLength: prop.minLength,
      maxLength: prop.maxLength,
      items: prop.items,
      format: prop.format,
      showToUser: prop.showToUser !== undefined ? prop.showToUser : true, // Default to true for backward compatibility
      isAdvanced: prop.isAdvanced === true, // Default to false for backward compatibility
      renderer: prop.renderer,
      minItems: prop.minItems,
      maxItems: prop.maxItems
    });
  });

  return parameters;
}

/**
 * Generate JSON Schema from Parameter[]
 * This ensures we save in the correct format
 */
export function generateSchema(parameters: Parameter[], existingSchema?: JsonSchema): JsonSchema {
  const properties: Record<string, JsonSchemaProperty> = {};

  parameters.forEach(param => {
    const property: JsonSchemaProperty = {
      type: param.type,
    };

    // Save label as title in schema
    if (param.label && param.label !== formatLabel(param.name)) {
      property.title = param.label;
    }

    if (param.description) {
      property.description = param.description;
    }

    if (param.enum && param.enum.length > 0) {
      property.enum = param.enum;
    }

    if (param.default !== undefined && param.default !== null && param.default !== '') {
      property.default = param.default;
    }

    if (param.type === 'number' || param.type === 'integer') {
      if (param.minimum !== undefined) property.minimum = param.minimum;
      if (param.maximum !== undefined) property.maximum = param.maximum;
    }

    if (param.type === 'string') {
      if (param.minLength !== undefined) property.minLength = param.minLength;
      if (param.maxLength !== undefined) property.maxLength = param.maxLength;
      if (param.format) property.format = param.format;
    }

    if (param.type === 'array' && param.items) {
      property.items = {
        type: param.items.type as JsonSchemaType,
        format: param.items.format
      };
      
      // Preserve array constraints
      if (param.minItems !== undefined) property.minItems = param.minItems;
      if (param.maxItems !== undefined) property.maxItems = param.maxItems;
    }

    // Save showToUser flag (only if explicitly set to false, to keep backward compatibility)
    if (param.showToUser === false) {
      property.showToUser = false;
    }

    // Save isAdvanced flag (only if explicitly set to true)
    if (param.isAdvanced === true) {
      property.isAdvanced = true;
    }

    // Preserve renderer property
    if (param.renderer) {
      property.renderer = param.renderer;
    }

    properties[param.name] = property;
  });

  const newSchema: JsonSchema = {
    type: "object",
    required: parameters.filter(p => p.required).map(p => p.name),
    properties,
    "x-order": parameters.map(p => p.name)
  };

  // Preserve custom schema-level properties from existing schema
  if (existingSchema) {
    if (existingSchema.imageInputField) {
      newSchema.imageInputField = existingSchema.imageInputField;
    }
    // Preserve any other custom root-level properties
    Object.keys(existingSchema).forEach(key => {
      if (!['type', 'required', 'properties', 'x-order'].includes(key)) {
        (newSchema as any)[key] = (existingSchema as any)[key];
      }
    });
  }

  return newSchema;
}

/**
 * Format parameter name into readable label
 */
function formatLabel(name: string): string {
  return name
    .replace(/[_.]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Validate parameter name
 */
export function validateParameterName(name: string, existingNames: string[]): string | null {
  if (!name) return "Parameter name is required";
  if (!/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(name)) {
    return "Parameter name must start with a letter or underscore, and contain only letters, numbers, underscores, and dots";
  }
  if (existingNames.includes(name)) {
    return "Parameter name must be unique";
  }
  return null;
}
