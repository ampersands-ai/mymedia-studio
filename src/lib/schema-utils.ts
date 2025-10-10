export interface Parameter {
  name: string;
  label: string;
  description: string;
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array';
  required: boolean;
  default?: any;
  enum?: any[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  items?: { type: string; format?: string };
  format?: string;
}

/**
 * Parse JSON Schema -> Parameter[]
 * This ensures existing models load correctly
 */
export function parseSchema(schema: Record<string, any>): Parameter[] {
  const parameters: Parameter[] = [];
  const required = schema.required || [];
  const properties = schema.properties || {};

  Object.keys(properties).forEach(name => {
    const prop = properties[name];
    
    parameters.push({
      name,
      label: formatLabel(name),
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
      format: prop.format
    });
  });

  return parameters;
}

/**
 * Generate JSON Schema from Parameter[]
 * This ensures we save in the correct format
 */
export function generateSchema(parameters: Parameter[]): Record<string, any> {
  const schema: any = {
    type: "object",
    required: parameters.filter(p => p.required).map(p => p.name),
    properties: {}
  };

  parameters.forEach(param => {
    const property: any = {
      type: param.type,
    };

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
      property.items = param.items;
    }

    schema.properties[param.name] = property;
  });

  return schema;
}

/**
 * Format parameter name into readable label
 */
function formatLabel(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Validate parameter name
 */
export function validateParameterName(name: string, existingNames: string[]): string | null {
  if (!name) return "Parameter name is required";
  if (!/^[a-z_][a-z0-9_]*$/.test(name)) {
    return "Parameter name must be lowercase, start with a letter, and contain only letters, numbers, and underscores";
  }
  if (existingNames.includes(name)) {
    return "Parameter name must be unique";
  }
  return null;
}
