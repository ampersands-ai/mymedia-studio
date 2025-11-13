import { describe, it, expect } from 'vitest';
import { 
  handleError, 
  AuthenticationError, 
  NetworkError, 
  ValidationError,
  StorageError,
  GenerationError,
  safeExecute
} from './errors';

describe('Error Handling', () => {
  describe('handleError', () => {
    it('should classify auth errors', () => {
      const error = new Error('Unauthorized access');
      const appError = handleError(error);
      expect(appError).toBeInstanceOf(AuthenticationError);
      expect(appError.recoverable).toBe(true);
      expect(appError.severity).toBe('high');
    });

    it('should classify network errors', () => {
      const error = new Error('Network request failed');
      const appError = handleError(error);
      expect(appError).toBeInstanceOf(NetworkError);
      expect(appError.code).toBe('NETWORK_ERROR');
    });

    it('should classify validation errors', () => {
      const error = new Error('Invalid parameters provided');
      const appError = handleError(error);
      expect(appError).toBeInstanceOf(ValidationError);
      expect(appError.severity).toBe('medium');
    });

    it('should handle unknown errors gracefully', () => {
      const error = 'string error';
      const appError = handleError(error);
      expect(appError.code).toBe('UNKNOWN_ERROR');
      expect(appError.recoverable).toBe(false);
    });

    it('should preserve existing AppError', () => {
      const error = new StorageError('FAILED', 'Storage failed');
      const appError = handleError(error);
      expect(appError).toBe(error);
      expect(appError.code).toBe('STORAGE_FAILED');
    });

    it('should attach context metadata', () => {
      const error = new Error('Test error');
      const context = { userId: '123', action: 'test' };
      const appError = handleError(error, context);
      expect(appError.metadata).toMatchObject(context);
    });
  });

  describe('safeExecute', () => {
    it('should return data on success', async () => {
      const result = await safeExecute(async () => 'success');
      expect(result.data).toBe('success');
      expect(result.error).toBeNull();
    });

    it('should return error on failure', async () => {
      const result = await safeExecute(async () => {
        throw new Error('Test error');
      });
      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error?.message).toBe('Test error');
    });
  });

  describe('Error Classes', () => {
    it('should create AuthenticationError correctly', () => {
      const error = new AuthenticationError('Auth failed');
      expect(error.code).toBe('AUTH_ERROR');
      expect(error.severity).toBe('high');
      expect(error.recoverable).toBe(true);
    });

    it('should create ValidationError correctly', () => {
      const error = new ValidationError('Validation failed');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.severity).toBe('medium');
    });

    it('should create GenerationError correctly', () => {
      const error = new GenerationError('TIMEOUT', 'Generation timeout');
      expect(error.code).toBe('GENERATION_TIMEOUT');
      expect(error.recoverable).toBe(true);
    });
  });
});
