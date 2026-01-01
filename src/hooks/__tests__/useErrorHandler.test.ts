import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useErrorHandler } from '../useErrorHandler';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock client logger
vi.mock('@/lib/logging/client-logger', () => ({
  clientLogger: {
    error: vi.fn(() => Promise.resolve()),
  },
}));

// Mock custom errors
vi.mock('@/lib/errors/custom-errors', async () => {
  const actual = await vi.importActual('@/lib/errors/custom-errors');
  return {
    ...actual,
    getUserErrorMessage: vi.fn((error) => error.message || 'An error occurred'),
    getErrorCode: vi.fn(() => 'UNKNOWN_ERROR'),
  };
});

describe('useErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('execute', () => {
    it('should execute operation successfully', async () => {
      const { result } = renderHook(() => useErrorHandler());

      const mockOperation = vi.fn().mockResolvedValue({ data: 'success' });

      let executeResult: { data: string } | null = null;
      await act(async () => {
        executeResult = await result.current.execute(mockOperation);
      });

      expect(mockOperation).toHaveBeenCalled();
      expect(executeResult).toEqual({ data: 'success' });
      expect(result.current.error).toBeNull();
    });

    it('should handle operation errors', async () => {
      const { result } = renderHook(() => useErrorHandler());

      const testError = new Error('Test error');
      const mockOperation = vi.fn().mockRejectedValue(testError);

      let executeResult: unknown = undefined;
      await act(async () => {
        executeResult = await result.current.execute(mockOperation);
      });

      expect(mockOperation).toHaveBeenCalled();
      expect(executeResult).toBeNull();
      expect(result.current.error).toEqual(testError);
    });

    it('should track isExecuting state', async () => {
      const { result } = renderHook(() => useErrorHandler());

      expect(result.current.isExecuting).toBe(false);

      let resolveOperation: () => void;
      const mockOperation = vi.fn(() => new Promise<void>((resolve) => {
        resolveOperation = resolve;
      }));

      let promise: Promise<unknown>;
      act(() => {
        promise = result.current.execute(mockOperation);
      });

      // Should be executing during the operation
      expect(result.current.isExecuting).toBe(true);

      await act(async () => {
        resolveOperation!();
        await promise;
      });

      expect(result.current.isExecuting).toBe(false);
    });

    it('should call onSuccess callback on success', async () => {
      const { result } = renderHook(() => useErrorHandler());

      const mockOperation = vi.fn().mockResolvedValue('result');
      const onSuccess = vi.fn();

      await act(async () => {
        await result.current.execute(mockOperation, { onSuccess });
      });

      expect(onSuccess).toHaveBeenCalled();
    });

    it('should call onError callback on error', async () => {
      const { result } = renderHook(() => useErrorHandler());

      const testError = new Error('Test error');
      const mockOperation = vi.fn().mockRejectedValue(testError);
      const onError = vi.fn();

      await act(async () => {
        await result.current.execute(mockOperation, { onError });
      });

      expect(onError).toHaveBeenCalledWith(testError);
    });
  });

  describe('clearError', () => {
    it('should clear the error state', async () => {
      const { result } = renderHook(() => useErrorHandler());

      const testError = new Error('Test error');
      const mockOperation = vi.fn().mockRejectedValue(testError);

      await act(async () => {
        await result.current.execute(mockOperation);
      });

      expect(result.current.error).toEqual(testError);

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('string error handling', () => {
    it('should convert string errors to Error objects', async () => {
      const { result } = renderHook(() => useErrorHandler());

      const mockOperation = vi.fn().mockRejectedValue('String error');

      await act(async () => {
        await result.current.execute(mockOperation);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('String error');
    });
  });
});
