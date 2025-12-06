/**
 * Validation Utilities
 * 
 * Centralized validation utilities for the application.
 * 
 * @module validation
 */

export {
  containsBase64Image,
  findBase64Fields,
  assertNoBase64Images,
  validateNoBase64Images,
  type Base64ValidationResult
} from './imageValidation';
