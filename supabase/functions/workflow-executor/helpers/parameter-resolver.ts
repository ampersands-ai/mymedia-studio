/**
 * Parameter Resolution and Templating
 * Handles template variable replacement, input mappings, and schema coercion
 */

/**
 * Get nested object values using dot notation
 */
export function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Replace template variables in format {{path.to.value}}
 */
export function replaceTemplateVariables(
  template: string,
  context: Record<string, any>
): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const value = getNestedValue(context, path.trim());
    return value ?? match;
  });
}

/**
 * Resolve input mappings from context
 */
export function resolveInputMappings(
  mappings: Record<string, string>,
  context: Record<string, any>
): Record<string, any> {
  const resolved: Record<string, any> = {};
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

/**
 * Coerce a single value to match schema type
 */
function coerceValueToSchema(value: any, schema: any): any {
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
      const n = Array.isArray(value) ? parseFloat(value[0]) : parseFloat(value);
      return Number.isNaN(n) ? value : n;
    }
    case 'integer': {
      if (value === undefined || value === null) return value;
      const n = Array.isArray(value) ? parseInt(value[0]) : parseInt(value);
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
  params: Record<string, any>,
  inputSchema: any
): Record<string, any> {
  if (!inputSchema || typeof inputSchema !== 'object') return params;
  const props = (inputSchema as any).properties || {};
  const out: Record<string, any> = { ...params };

  for (const [key, schema] of Object.entries<any>(props)) {
    if (!(key in out)) continue;
    out[key] = coerceValueToSchema(out[key], schema);
  }

  return out;
}
