/**
 * Template Variables Utility
 *
 * Provides reusable template string variable replacement functions.
 * Extracted from duplicate implementations across template handling files.
 *
 * @module templateVariables
 */

/**
 * Template variable options
 */
export interface TemplateVariableOptions {
  /** Variable pattern regex (default: /\{\{(\w+)\}\}/g) */
  pattern?: RegExp;
  /** Throw error if variable not found (default: false) */
  strict?: boolean;
  /** Placeholder for missing variables (default: '') */
  missingPlaceholder?: string;
  /** Transform function for variable names */
  transformKey?: (key: string) => string;
  /** Transform function for variable values */
  transformValue?: (value: string, key: string) => string;
}

/**
 * Replace template variables in string
 *
 * Replaces {{variableName}} patterns with values from variables object
 *
 * @param template - Template string with variables
 * @param variables - Object with variable values
 * @returns String with variables replaced
 *
 * @example
 * ```typescript
 * const result = replaceTemplateVariables(
 *   'Hello {{name}}, you are {{age}} years old',
 *   { name: 'John', age: '30' }
 * );
 * // "Hello John, you are 30 years old"
 * ```
 */
export function replaceTemplateVariables(
  template: string,
  variables: Record<string, string | number | boolean>
): string {
  let result = template;

  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, String(value));
  }

  return result;
}

/**
 * Replace template variables with options
 *
 * @param template - Template string
 * @param variables - Variable values
 * @param options - Replacement options
 * @returns String with variables replaced
 *
 * @example
 * ```typescript
 * const result = replaceTemplateVariablesWithOptions(
 *   'Price: ${{price}}',
 *   { price: '99.99' },
 *   { transformValue: (val) => parseFloat(val).toFixed(2) }
 * );
 * // "Price: $99.99"
 * ```
 */
export function replaceTemplateVariablesWithOptions(
  template: string,
  variables: Record<string, string | number | boolean>,
  options: TemplateVariableOptions = {}
): string {
  const {
    pattern = /\{\{(\w+)\}\}/g,
    strict = false,
    missingPlaceholder = '',
    transformKey,
    transformValue,
  } = options;

  return template.replace(pattern, (_match, key) => {
    // Transform key if function provided
    const actualKey = transformKey ? transformKey(key) : key;

    // Check if variable exists
    if (!(actualKey in variables)) {
      if (strict) {
        throw new Error(`Template variable not found: ${actualKey}`);
      }
      return missingPlaceholder;
    }

    // Get value and transform if function provided
    const value = String(variables[actualKey]);
    return transformValue ? transformValue(value, actualKey) : value;
  });
}

/**
 * Extract variable names from template
 *
 * @param template - Template string
 * @param pattern - Variable pattern (default: /\{\{(\w+)\}\}/g)
 * @returns Array of variable names
 *
 * @example
 * ```typescript
 * const vars = extractTemplateVariables('Hello {{name}}, you are {{age}}');
 * // ['name', 'age']
 * ```
 */
export function extractTemplateVariables(
  template: string,
  pattern: RegExp = /\{\{(\w+)\}\}/g
): string[] {
  const variables: string[] = [];
  let match;

  // Reset regex lastIndex
  pattern.lastIndex = 0;

  while ((match = pattern.exec(template)) !== null) {
    variables.push(match[1]);
  }

  return [...new Set(variables)]; // Remove duplicates
}

/**
 * Validate template has all required variables
 *
 * @param template - Template string
 * @param variables - Available variables
 * @returns Validation result with missing variables
 *
 * @example
 * ```typescript
 * const result = validateTemplateVariables(
 *   'Hello {{name}}, you are {{age}}',
 *   { name: 'John' }
 * );
 * if (!result.valid) {
 *   console.log('Missing:', result.missing); // ['age']
 * }
 * ```
 */
export function validateTemplateVariables(
  template: string,
  variables: Record<string, unknown>
): { valid: boolean; missing: string[] } {
  const required = extractTemplateVariables(template);
  const missing = required.filter(key => !(key in variables));

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Replace variables with custom delimiter
 *
 * @param template - Template string
 * @param variables - Variable values
 * @param startDelimiter - Start delimiter (default: '{{')
 * @param endDelimiter - End delimiter (default: '}}')
 * @returns String with variables replaced
 *
 * @example
 * ```typescript
 * const result = replaceWithDelimiters(
 *   'Hello ${name}',
 *   { name: 'John' },
 *   '${', '}'
 * );
 * // "Hello John"
 * ```
 */
export function replaceWithDelimiters(
  template: string,
  variables: Record<string, string | number | boolean>,
  startDelimiter: string = '{{',
  endDelimiter: string = '}}'
): string {
  let result = template;

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `${startDelimiter}${key}${endDelimiter}`;
    result = result.split(placeholder).join(String(value));
  }

  return result;
}

/**
 * Replace variables with function
 *
 * Allows custom replacement logic for each variable
 *
 * @param template - Template string
 * @param replacer - Function that returns replacement value
 * @param pattern - Variable pattern
 * @returns String with variables replaced
 *
 * @example
 * ```typescript
 * const result = replaceWithFunction(
 *   'Hello {{name}}, {{greeting}}',
 *   (key) => {
 *     if (key === 'name') return 'John';
 *     if (key === 'greeting') return 'Welcome!';
 *     return '';
 *   }
 * );
 * // "Hello John, Welcome!"
 * ```
 */
export function replaceWithFunction(
  template: string,
  replacer: (key: string, match: string) => string,
  pattern: RegExp = /\{\{(\w+)\}\}/g
): string {
  return template.replace(pattern, (match, key) => {
    return replacer(key, match);
  });
}

/**
 * Escape template variable delimiters
 *
 * Prevents variable replacement in certain parts of template
 *
 * @param template - Template string
 * @returns Escaped template
 *
 * @example
 * ```typescript
 * const escaped = escapeTemplateVariables('Use {{variable}} syntax');
 * // "Use \{\{variable\}\} syntax"
 * ```
 */
export function escapeTemplateVariables(template: string): string {
  return template.replace(/\{\{/g, '\\{\\{').replace(/\}\}/g, '\\}\\}');
}

/**
 * Unescape template variable delimiters
 *
 * @param template - Escaped template string
 * @returns Unescaped template
 */
export function unescapeTemplateVariables(template: string): string {
  return template.replace(/\\{\\{/g, '{{').replace(/\\}\\}/g, '}}');
}

/**
 * Replace nested template variables
 *
 * Supports nested object access like {{user.name}}
 *
 * @param template - Template string
 * @param variables - Nested variables object
 * @returns String with variables replaced
 *
 * @example
 * ```typescript
 * const result = replaceNestedVariables(
 *   'Hello {{user.name}}, your score is {{stats.score}}',
 *   { user: { name: 'John' }, stats: { score: 100 } }
 * );
 * // "Hello John, your score is 100"
 * ```
 */
export function replaceNestedVariables(
  template: string,
  variables: Record<string, any>
): string {
  return template.replace(/\{\{([\w.]+)\}\}/g, (match, path) => {
    const keys = path.split('.');
    let value: any = variables;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return match; // Return original if path not found
      }
    }

    return String(value);
  });
}

/**
 * Compile template to function
 *
 * Creates reusable function for template with variables
 *
 * @param template - Template string
 * @returns Function that accepts variables and returns result
 *
 * @example
 * ```typescript
 * const greet = compileTemplate('Hello {{name}}, you are {{age}}');
 * greet({ name: 'John', age: 30 }); // "Hello John, you are 30"
 * greet({ name: 'Jane', age: 25 }); // "Hello Jane, you are 25"
 * ```
 */
export function compileTemplate(
  template: string
): (variables: Record<string, string | number | boolean>) => string {
  return (variables) => replaceTemplateVariables(template, variables);
}

/**
 * Batch replace templates
 *
 * Replace variables in multiple templates at once
 *
 * @param templates - Array of template strings
 * @param variables - Variable values
 * @returns Array of strings with variables replaced
 *
 * @example
 * ```typescript
 * const results = batchReplaceTemplates(
 *   ['Hello {{name}}', 'Age: {{age}}'],
 *   { name: 'John', age: 30 }
 * );
 * // ["Hello John", "Age: 30"]
 * ```
 */
export function batchReplaceTemplates(
  templates: string[],
  variables: Record<string, string | number | boolean>
): string[] {
  return templates.map(template => replaceTemplateVariables(template, variables));
}

/**
 * Create template from object
 *
 * Convert object to template string
 *
 * @param obj - Object to convert
 * @param options - Conversion options
 * @returns Template string
 *
 * @example
 * ```typescript
 * createTemplate({ greeting: 'Hello {{name}}', farewell: 'Goodbye {{name}}' })
 * // Returns object with template methods
 * ```
 */
export function createTemplateFromObject(
  obj: Record<string, string>
): Record<string, (variables: Record<string, string | number | boolean>) => string> {
  const result: Record<string, (variables: Record<string, string | number | boolean>) => string> = {};

  for (const [key, template] of Object.entries(obj)) {
    result[key] = compileTemplate(template);
  }

  return result;
}

/**
 * Format template with conditional sections
 *
 * Supports {{#if variable}}content{{/if}} syntax
 *
 * @param template - Template with conditional sections
 * @param variables - Variables including boolean conditions
 * @returns Formatted string
 *
 * @example
 * ```typescript
 * const result = formatConditionalTemplate(
 *   'Hello{{#if premium}} Premium{{/if}} User',
 *   { premium: true }
 * );
 * // "Hello Premium User"
 * ```
 */
export function formatConditionalTemplate(
  template: string,
  variables: Record<string, any>
): string {
  // Replace conditional blocks
  let result = template.replace(
    /\{\{#if (\w+)\}\}(.*?)\{\{\/if\}\}/gs,
    (_match, condition, content) => {
      return variables[condition] ? content : '';
    }
  );

  // Replace variables
  result = replaceTemplateVariables(result, variables);

  return result;
}
