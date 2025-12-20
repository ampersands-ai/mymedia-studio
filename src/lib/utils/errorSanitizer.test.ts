import { describe, it, expect } from 'vitest';
import { 
  sanitizeProprietaryTerms, 
  sanitizeError, 
  containsProprietaryTerms 
} from './errorSanitizer';

describe('errorSanitizer', () => {
  describe('sanitizeProprietaryTerms', () => {
    it('should replace "kie.ai" with "provider"', () => {
      expect(sanitizeProprietaryTerms('kie.ai API failed')).toBe('provider API failed');
      expect(sanitizeProprietaryTerms('Error from Kie.ai service')).toBe('Error from provider service');
    });

    it('should replace "kie ai" with "provider"', () => {
      expect(sanitizeProprietaryTerms('kie ai timeout')).toBe('provider timeout');
      expect(sanitizeProprietaryTerms('Kie AI error occurred')).toBe('provider error occurred');
    });

    it('should replace "kie_ai" with "provider"', () => {
      expect(sanitizeProprietaryTerms('kie_ai connection failed')).toBe('provider connection failed');
    });

    it('should replace standalone "KIE" with "Provider" (preserving case)', () => {
      expect(sanitizeProprietaryTerms('KIE task error')).toBe('Provider task error');
      expect(sanitizeProprietaryTerms('Error in KIE system')).toBe('Error in Provider system');
    });

    it('should replace standalone "kie" with "provider"', () => {
      expect(sanitizeProprietaryTerms('kie error')).toBe('provider error');
      expect(sanitizeProprietaryTerms('Failed to connect to kie')).toBe('Failed to connect to provider');
    });

    it('should handle multiple occurrences', () => {
      expect(sanitizeProprietaryTerms('kie.ai failed, retry kie.ai later'))
        .toBe('provider failed, retry provider later');
      expect(sanitizeProprietaryTerms('KIE error: kie.ai timeout'))
        .toBe('Provider error: provider timeout');
    });

    it('should NOT affect words containing "kie" as substring', () => {
      expect(sanitizeProprietaryTerms('cookie monster')).toBe('cookie monster');
      expect(sanitizeProprietaryTerms('rookie mistake')).toBe('rookie mistake');
      expect(sanitizeProprietaryTerms('bookie error')).toBe('bookie error');
      expect(sanitizeProprietaryTerms('talkies failed')).toBe('talkies failed');
    });

    it('should handle null/undefined gracefully', () => {
      expect(sanitizeProprietaryTerms(null as unknown as string)).toBe(null);
      expect(sanitizeProprietaryTerms(undefined as unknown as string)).toBe(undefined);
    });

    it('should handle empty string', () => {
      expect(sanitizeProprietaryTerms('')).toBe('');
    });

    it('should handle non-string input gracefully', () => {
      expect(sanitizeProprietaryTerms(123 as unknown as string)).toBe(123);
      expect(sanitizeProprietaryTerms({} as unknown as string)).toEqual({});
    });

    it('should handle messages without proprietary terms unchanged', () => {
      const message = 'Network connection failed';
      expect(sanitizeProprietaryTerms(message)).toBe(message);
    });

    it('should handle complex error messages', () => {
      expect(sanitizeProprietaryTerms('Request to kie.ai/api/v1/generate failed with status 500'))
        .toBe('Request to provider/api/v1/generate failed with status 500');
    });
  });

  describe('sanitizeError', () => {
    it('should sanitize string errors', () => {
      expect(sanitizeError('kie.ai failed')).toBe('provider failed');
    });

    it('should sanitize Error instances', () => {
      const error = new Error('KIE task failed');
      const sanitized = sanitizeError(error) as Error;
      expect(sanitized.message).toBe('Provider task failed');
      expect(sanitized).toBeInstanceOf(Error);
    });

    it('should preserve Error properties', () => {
      const error = new Error('kie error');
      error.name = 'CustomError';
      const sanitized = sanitizeError(error) as Error;
      expect(sanitized.name).toBe('CustomError');
    });

    it('should sanitize objects with message property', () => {
      const obj = { message: 'kie.ai timeout', code: 500 };
      const sanitized = sanitizeError(obj) as typeof obj;
      expect(sanitized.message).toBe('provider timeout');
      expect(sanitized.code).toBe(500);
    });

    it('should sanitize objects with error property', () => {
      const obj = { error: 'KIE connection failed', status: 'failed' };
      const sanitized = sanitizeError(obj) as typeof obj;
      expect(sanitized.error).toBe('Provider connection failed');
      expect(sanitized.status).toBe('failed');
    });

    it('should sanitize objects with errorMessage property', () => {
      const obj = { errorMessage: 'kie_ai error' };
      const sanitized = sanitizeError(obj) as typeof obj;
      expect(sanitized.errorMessage).toBe('provider error');
    });

    it('should sanitize objects with details property', () => {
      const obj = { details: 'kie.ai API rate limited' };
      const sanitized = sanitizeError(obj) as typeof obj;
      expect(sanitized.details).toBe('provider API rate limited');
    });

    it('should sanitize arrays of errors', () => {
      const errors = ['kie error 1', 'KIE error 2'];
      const sanitized = sanitizeError(errors) as string[];
      expect(sanitized).toEqual(['provider error 1', 'Provider error 2']);
    });

    it('should handle null/undefined', () => {
      expect(sanitizeError(null)).toBe(null);
      expect(sanitizeError(undefined)).toBe(undefined);
    });

    it('should pass through non-sanitizable types', () => {
      expect(sanitizeError(123)).toBe(123);
      expect(sanitizeError(true)).toBe(true);
    });

    it('should not modify unrelated object properties', () => {
      const obj = { 
        message: 'kie error', 
        userId: 'user123',
        timestamp: 1234567890 
      };
      const sanitized = sanitizeError(obj) as typeof obj;
      expect(sanitized.message).toBe('provider error');
      expect(sanitized.userId).toBe('user123');
      expect(sanitized.timestamp).toBe(1234567890);
    });
  });

  describe('containsProprietaryTerms', () => {
    it('should return true for messages containing proprietary terms', () => {
      expect(containsProprietaryTerms('kie.ai error')).toBe(true);
      expect(containsProprietaryTerms('KIE failed')).toBe(true);
      expect(containsProprietaryTerms('kie_ai timeout')).toBe(true);
      expect(containsProprietaryTerms('kie error')).toBe(true);
    });

    it('should return false for messages without proprietary terms', () => {
      expect(containsProprietaryTerms('Network error')).toBe(false);
      expect(containsProprietaryTerms('Database connection failed')).toBe(false);
    });

    it('should return false for words containing "kie" as substring', () => {
      expect(containsProprietaryTerms('cookie error')).toBe(false);
      expect(containsProprietaryTerms('rookie mistake')).toBe(false);
    });

    it('should handle null/undefined/empty', () => {
      expect(containsProprietaryTerms(null as unknown as string)).toBe(false);
      expect(containsProprietaryTerms(undefined as unknown as string)).toBe(false);
      expect(containsProprietaryTerms('')).toBe(false);
    });
  });
});
