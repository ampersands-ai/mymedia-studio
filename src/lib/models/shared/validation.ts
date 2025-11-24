/**
 * Enhanced Model Validation Utilities
 * 
 * Comprehensive validation with security checks for:
 * - Prompt length and content
 * - XSS/injection detection
 * - URL validation
 * - Parameter type checking
 * 
 * Phase 1 Implementation: Strengthen validation across all models
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Comprehensive prompt validation with security checks
 * 
 * @param prompt - User-provided prompt text
 * @param options - Validation options (min/max length)
 * @returns ValidationResult with detailed error messages
 */
export function validatePrompt(
  prompt: string | undefined | null,
  options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    fieldName?: string;
  } = {}
): ValidationResult {
  const {
    required = true,
    minLength = 3,
    maxLength = 10000,
    fieldName = 'Prompt'
  } = options;

  // Check if prompt exists
  if (!prompt || prompt.trim() === '') {
    if (required) {
      return { valid: false, error: `${fieldName} is required` };
    }
    return { valid: true };
  }

  const trimmedPrompt = prompt.trim();

  // Length validation
  if (trimmedPrompt.length < minLength) {
    return {
      valid: false,
      error: `${fieldName} must be at least ${minLength} characters long`
    };
  }

  if (trimmedPrompt.length > maxLength) {
    return {
      valid: false,
      error: `${fieldName} must be less than ${maxLength} characters`
    };
  }

  // XSS/injection detection
  const dangerousPatterns = [
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /onerror=/gi,
    /onclick=/gi,
    /onload=/gi,
    /<iframe/gi,
    /eval\(/gi,
    /expression\(/gi
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(trimmedPrompt)) {
      return {
        valid: false,
        error: 'Invalid characters detected in prompt. Please remove potentially harmful content.'
      };
    }
  }

  return { valid: true };
}

/**
 * Validate URL format and protocol
 * 
 * @param url - URL to validate
 * @param options - Validation options
 * @returns ValidationResult
 */
export function validateUrl(
  url: string | undefined | null,
  options: {
    required?: boolean;
    allowedProtocols?: string[];
    fieldName?: string;
  } = {}
): ValidationResult {
  const {
    required = false,
    allowedProtocols = ['http', 'https'],
    fieldName = 'URL'
  } = options;

  if (!url) {
    if (required) {
      return { valid: false, error: `${fieldName} is required` };
    }
    return { valid: true };
  }

  try {
    const parsedUrl = new URL(url);
    
    if (!allowedProtocols.includes(parsedUrl.protocol.replace(':', ''))) {
      return {
        valid: false,
        error: `${fieldName} must use ${allowedProtocols.join(' or ')} protocol`
      };
    }

    return { valid: true };
  } catch {
    return {
      valid: false,
      error: `${fieldName} is not a valid URL`
    };
  }
}

/**
 * Validate numeric parameter within range
 * 
 * @param value - Numeric value to validate
 * @param options - Validation options (min/max/required)
 * @returns ValidationResult
 */
export function validateNumber(
  value: number | undefined | null,
  options: {
    required?: boolean;
    min?: number;
    max?: number;
    integer?: boolean;
    fieldName?: string;
  } = {}
): ValidationResult {
  const {
    required = false,
    min,
    max,
    integer = false,
    fieldName = 'Value'
  } = options;

  if (value === undefined || value === null) {
    if (required) {
      return { valid: false, error: `${fieldName} is required` };
    }
    return { valid: true };
  }

  if (typeof value !== 'number' || isNaN(value)) {
    return { valid: false, error: `${fieldName} must be a valid number` };
  }

  if (integer && !Number.isInteger(value)) {
    return { valid: false, error: `${fieldName} must be an integer` };
  }

  if (min !== undefined && value < min) {
    return { valid: false, error: `${fieldName} must be at least ${min}` };
  }

  if (max !== undefined && value > max) {
    return { valid: false, error: `${fieldName} must be at most ${max}` };
  }

  return { valid: true };
}

/**
 * Validate enum value
 * 
 * @param value - Value to validate
 * @param allowedValues - Array of allowed values
 * @param options - Validation options
 * @returns ValidationResult
 */
export function validateEnum(
  value: any,
  allowedValues: any[],
  options: {
    required?: boolean;
    fieldName?: string;
  } = {}
): ValidationResult {
  const { required = false, fieldName = 'Value' } = options;

  if (value === undefined || value === null || value === '') {
    if (required) {
      return { valid: false, error: `${fieldName} is required` };
    }
    return { valid: true };
  }

  if (!allowedValues.includes(value)) {
    return {
      valid: false,
      error: `${fieldName} must be one of: ${allowedValues.join(', ')}`
    };
  }

  return { valid: true };
}

/**
 * Combine multiple validation results
 * Returns first error encountered, or success if all pass
 * 
 * @param results - Array of validation results
 * @returns Combined ValidationResult
 */
export function combineValidations(...results: ValidationResult[]): ValidationResult {
  for (const result of results) {
    if (!result.valid) {
      return result;
    }
  }
  return { valid: true };
}
