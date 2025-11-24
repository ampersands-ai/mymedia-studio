/**
 * Parameter Sanitization Utility
 *
 * Provides reusable parameter filtering and sanitization functions.
 * Extracted from duplicate implementations across model files.
 *
 * @module parameterSanitization
 */

/**
 * Sanitization options
 */
export interface SanitizationOptions {
  /** Remove null values (default: true) */
  removeNull?: boolean;
  /** Remove undefined values (default: true) */
  removeUndefined?: boolean;
  /** Remove empty strings (default: false) */
  removeEmptyStrings?: boolean;
  /** Remove empty arrays (default: false) */
  removeEmptyArrays?: boolean;
  /** Remove empty objects (default: false) */
  removeEmptyObjects?: boolean;
  /** Trim string values (default: false) */
  trimStrings?: boolean;
  /** Convert to lowercase (for string values) */
  toLowerCase?: boolean;
  /** Convert to uppercase (for string values) */
  toUpperCase?: boolean;
}

/**
 * Sanitize parameters by removing null/undefined values
 *
 * @param inputs - Input parameters
 * @param allowedKeys - Array of allowed parameter keys
 * @returns Sanitized parameters
 *
 * @example
 * ```typescript
 * const sanitized = sanitizeParameters(
 *   { prompt: 'test', width: 1024, height: null, extra: 'value' },
 *   ['prompt', 'width', 'height']
 * );
 * // { prompt: 'test', width: 1024 }
 * ```
 */
export function sanitizeParameters(
  inputs: Record<string, unknown>,
  allowedKeys: string[]
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const key of allowedKeys) {
    if (key in inputs && inputs[key] !== undefined && inputs[key] !== null) {
      sanitized[key] = inputs[key];
    }
  }

  return sanitized;
}

/**
 * Sanitize parameters with options
 *
 * @param inputs - Input parameters
 * @param options - Sanitization options
 * @returns Sanitized parameters
 *
 * @example
 * ```typescript
 * const sanitized = sanitizeParametersWithOptions(
 *   { name: '  John  ', age: 30, city: '', tags: [] },
 *   { trimStrings: true, removeEmptyStrings: true, removeEmptyArrays: true }
 * );
 * // { name: 'John', age: 30 }
 * ```
 */
export function sanitizeParametersWithOptions(
  inputs: Record<string, unknown>,
  options: SanitizationOptions = {}
): Record<string, unknown> {
  const {
    removeNull = true,
    removeUndefined = true,
    removeEmptyStrings = false,
    removeEmptyArrays = false,
    removeEmptyObjects = false,
    trimStrings = false,
    toLowerCase = false,
    toUpperCase = false,
  } = options;

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(inputs)) {
    // Skip null values
    if (removeNull && value === null) {
      continue;
    }

    // Skip undefined values
    if (removeUndefined && value === undefined) {
      continue;
    }

    // Handle strings
    if (typeof value === 'string') {
      let stringValue = value;

      // Trim strings
      if (trimStrings) {
        stringValue = stringValue.trim();
      }

      // Skip empty strings
      if (removeEmptyStrings && stringValue === '') {
        continue;
      }

      // Convert case
      if (toLowerCase) {
        stringValue = stringValue.toLowerCase();
      } else if (toUpperCase) {
        stringValue = stringValue.toUpperCase();
      }

      sanitized[key] = stringValue;
      continue;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      if (removeEmptyArrays && value.length === 0) {
        continue;
      }
      sanitized[key] = value;
      continue;
    }

    // Handle objects
    if (value && typeof value === 'object') {
      if (removeEmptyObjects && Object.keys(value).length === 0) {
        continue;
      }
      sanitized[key] = value;
      continue;
    }

    // Add other values as-is
    sanitized[key] = value;
  }

  return sanitized;
}

/**
 * Filter parameters by allowed keys
 *
 * @param inputs - Input parameters
 * @param allowedKeys - Array of allowed keys
 * @returns Filtered parameters
 *
 * @example
 * ```typescript
 * const filtered = filterAllowedKeys(
 *   { prompt: 'test', width: 1024, unauthorized: 'value' },
 *   ['prompt', 'width']
 * );
 * // { prompt: 'test', width: 1024 }
 * ```
 */
export function filterAllowedKeys(
  inputs: Record<string, unknown>,
  allowedKeys: string[]
): Record<string, unknown> {
  const filtered: Record<string, unknown> = {};

  for (const key of allowedKeys) {
    if (key in inputs) {
      filtered[key] = inputs[key];
    }
  }

  return filtered;
}

/**
 * Remove specific keys from parameters
 *
 * @param inputs - Input parameters
 * @param keysToRemove - Array of keys to remove
 * @returns Parameters without specified keys
 *
 * @example
 * ```typescript
 * const cleaned = removeKeys(
 *   { prompt: 'test', apiKey: 'secret', data: 'public' },
 *   ['apiKey']
 * );
 * // { prompt: 'test', data: 'public' }
 * ```
 */
export function removeKeys(
  inputs: Record<string, unknown>,
  keysToRemove: string[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(inputs)) {
    if (!keysToRemove.includes(key)) {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Remove sensitive keys from parameters
 *
 * Useful for logging or displaying parameters
 *
 * @param inputs - Input parameters
 * @param sensitiveKeys - Array of sensitive keys (default: common sensitive keys)
 * @returns Parameters with sensitive values redacted
 *
 * @example
 * ```typescript
 * const safe = removeSensitiveKeys(
 *   { username: 'john', password: 'secret123', apiKey: 'key123' }
 * );
 * // { username: 'john', password: '[REDACTED]', apiKey: '[REDACTED]' }
 * ```
 */
export function removeSensitiveKeys(
  inputs: Record<string, unknown>,
  sensitiveKeys: string[] = ['password', 'token', 'apiKey', 'api_key', 'secret', 'authorization']
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(inputs)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveKeys.some(sensitive =>
      lowerKey.includes(sensitive.toLowerCase())
    );

    if (isSensitive) {
      result[key] = '[REDACTED]';
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Apply default values to parameters
 *
 * @param inputs - Input parameters
 * @param defaults - Default values
 * @returns Parameters with defaults applied
 *
 * @example
 * ```typescript
 * const params = applyDefaults(
 *   { width: 1024 },
 *   { width: 512, height: 512, quality: 'high' }
 * );
 * // { width: 1024, height: 512, quality: 'high' }
 * ```
 */
export function applyDefaults(
  inputs: Record<string, unknown>,
  defaults: Record<string, unknown>
): Record<string, unknown> {
  return { ...defaults, ...inputs };
}

/**
 * Pick specific keys from parameters
 *
 * @param inputs - Input parameters
 * @param keys - Keys to pick
 * @returns Object with only specified keys
 *
 * @example
 * ```typescript
 * const picked = pickKeys(
 *   { a: 1, b: 2, c: 3 },
 *   ['a', 'c']
 * );
 * // { a: 1, c: 3 }
 * ```
 */
export function pickKeys(
  inputs: Record<string, unknown>,
  keys: string[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const key of keys) {
    if (key in inputs) {
      result[key] = inputs[key];
    }
  }

  return result;
}

/**
 * Omit specific keys from parameters
 *
 * @param inputs - Input parameters
 * @param keys - Keys to omit
 * @returns Object without specified keys
 *
 * @example
 * ```typescript
 * const omitted = omitKeys(
 *   { a: 1, b: 2, c: 3 },
 *   ['b']
 * );
 * // { a: 1, c: 3 }
 * ```
 */
export function omitKeys(
  inputs: Record<string, unknown>,
  keys: string[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(inputs)) {
    if (!keys.includes(key)) {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Rename keys in parameters
 *
 * @param inputs - Input parameters
 * @param keyMap - Mapping of old keys to new keys
 * @returns Parameters with renamed keys
 *
 * @example
 * ```typescript
 * const renamed = renameKeys(
 *   { oldName: 'value', other: 'data' },
 *   { oldName: 'newName' }
 * );
 * // { newName: 'value', other: 'data' }
 * ```
 */
export function renameKeys(
  inputs: Record<string, unknown>,
  keyMap: Record<string, string>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(inputs)) {
    const newKey = keyMap[key] || key;
    result[newKey] = value;
  }

  return result;
}

/**
 * Deep clone parameters
 *
 * @param inputs - Input parameters
 * @returns Deep cloned parameters
 */
export function deepClone<T extends Record<string, unknown>>(inputs: T): T {
  return JSON.parse(JSON.stringify(inputs));
}

/**
 * Validate required keys are present
 *
 * @param inputs - Input parameters
 * @param requiredKeys - Array of required keys
 * @returns Validation result
 *
 * @example
 * ```typescript
 * const result = validateRequiredKeys(
 *   { prompt: 'test' },
 *   ['prompt', 'width']
 * );
 * if (!result.valid) {
 *   console.error(result.missingKeys); // ['width']
 * }
 * ```
 */
export function validateRequiredKeys(
  inputs: Record<string, unknown>,
  requiredKeys: string[]
): { valid: boolean; missingKeys: string[] } {
  const missingKeys = requiredKeys.filter(key => !(key in inputs) || inputs[key] === undefined);

  return {
    valid: missingKeys.length === 0,
    missingKeys,
  };
}

/**
 * Merge multiple parameter objects
 *
 * Later objects override earlier ones
 *
 * @param objects - Parameter objects to merge
 * @returns Merged parameters
 *
 * @example
 * ```typescript
 * const merged = mergeParameters(
 *   { a: 1, b: 2 },
 *   { b: 3, c: 4 },
 *   { c: 5, d: 6 }
 * );
 * // { a: 1, b: 3, c: 5, d: 6 }
 * ```
 */
export function mergeParameters(
  ...objects: Record<string, unknown>[]
): Record<string, unknown> {
  return Object.assign({}, ...objects);
}

/**
 * Convert parameters to query string
 *
 * @param params - Parameters object
 * @returns Query string (without leading '?')
 *
 * @example
 * ```typescript
 * toQueryString({ foo: 'bar', num: 42 })
 * // "foo=bar&num=42"
 * ```
 */
export function toQueryString(params: Record<string, unknown>): string {
  return Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
}

/**
 * Parse query string to parameters object
 *
 * @param queryString - Query string (with or without leading '?')
 * @returns Parameters object
 *
 * @example
 * ```typescript
 * fromQueryString('?foo=bar&num=42')
 * // { foo: 'bar', num: '42' }
 * ```
 */
export function fromQueryString(queryString: string): Record<string, string> {
  const params: Record<string, string> = {};
  const query = queryString.startsWith('?') ? queryString.slice(1) : queryString;

  query.split('&').forEach(pair => {
    const [key, value] = pair.split('=');
    if (key) {
      params[decodeURIComponent(key)] = decodeURIComponent(value || '');
    }
  });

  return params;
}
