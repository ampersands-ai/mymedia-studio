/**
 * Parameter Resolution and Templating
 * Handles template variable replacement, input mappings, and schema coercion
 */

/**
 * Get nested object values using dot notation
 */
export function getNestedValue(obj: unknown, path: string): unknown {
  return path.split('.').reduce((current: unknown, key: string) => {
    if (current && typeof current === 'object' && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/**
 * Replace template variables in format {{path.to.value}}
 */
export function replaceTemplateVariables(
  template: string,
  context: Record<string, unknown>
): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path): string => {
    const value = getNestedValue(context, path.trim());
    return value !== undefined && value !== null ? String(value) : match;
  });
}

/**
 * Resolve input mappings from context
 */
export function resolveInputMappings(
  mappings: Record<string, string>,
  context: Record<string, unknown>
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};
  for (const [paramKey, rawMapping] of Object.entries(mappings)) {
    let mapping = rawMapping;
    if (typeof mapping === 'string') {
      mapping = mapping.replace(/^user_input\./, 'user.');
    }

    let value = getNestedValue(context, mapping as string);

    if ((value === undefined || value === null) && typeof rawMapping === 'string') {
      const alternate = rawMapping.startsWith('user.')
        ? rawMapping.replace(/^user\./, 'user_input.')
        : rawMapping.replace(/^user_input\./, 'user.');
      value = getNestedValue(context, alternate);
    }

    if (value !== undefined && value !== null) {
      resolved[paramKey] = value;
    }
  }
  return resolved;
}

interface JsonSchema {
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
}

/**
 * Coerce a single value to match schema type
 */
function coerceValueToSchema(value: unknown, schema: JsonSchema): unknown {
  const declaredType = Array.isArray(schema?.type) ? schema.type[0] : schema?.type;
  if (!declaredType) return value;

  switch (declaredType) {
    case 'array': {
      if (Array.isArray(value)) return value;
      if (value === undefined || value === null) return value;
      return [value];
    }
    case 'string': {
      if (value === undefined || value === null) return value;
      if (Array.isArray(value)) return String(value[0]);
      return typeof value === 'string' ? value : String(value);
    }
    case 'number': {
      if (value === undefined || value === null) return value;
      const strValue = Array.isArray(value) ? String(value[0]) : String(value);
      const n = parseFloat(strValue);
      return Number.isNaN(n) ? value : n;
    }
    case 'integer': {
      if (value === undefined || value === null) return value;
      const strValue = Array.isArray(value) ? String(value[0]) : String(value);
      const n = parseInt(strValue, 10);
      return Number.isNaN(n) ? value : n;
    }
    case 'boolean': {
      let v = value;
      if (Array.isArray(v)) v = v[0];
      if (typeof v === 'boolean') return v;
      if (typeof v === 'string') {
        const s = v.toLowerCase();
        if (s === 'true') return true;
        if (s === 'false') return false;
      }
      return !!v;
    }
    case 'object':
    default:
      return value;
  }
}

/**
 * Coerce parameters to match model's input schema
 */
export function coerceParametersToSchema(
  params: Record<string, unknown>,
  inputSchema: JsonSchema
): Record<string, unknown> {
  if (!inputSchema || typeof inputSchema !== 'object') return params;
  const props = inputSchema.properties || {};
  const out: Record<string, unknown> = { ...params };

  for (const [key, schema] of Object.entries(props)) {
    if (!(key in out)) continue;
    out[key] = coerceValueToSchema(out[key], schema);
  }

  return out;
}
