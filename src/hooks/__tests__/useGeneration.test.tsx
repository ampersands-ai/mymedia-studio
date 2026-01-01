/**
 * useGeneration Hook Tests
 * 
 * Tests the core generation hook that handles:
 * - Session refresh and auth handling
 * - Generation parameter validation
 * - Edge function calls with retry logic
 * - Error handling (401, 402, 403, 429)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';
import { useGeneration } from '../useGeneration';

// Mock supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      refreshSession: vi.fn(),
      signOut: vi.fn(),
    },
    functions: {
      invoke: vi.fn(),
    },
  },
}));

// Mock model registry
vi.mock('@/lib/models/registry', () => ({
  getModel: vi.fn(() => ({
    MODEL_CONFIG: {
      modelId: 'test-model',
      recordId: 'test-record-id',
      provider: 'test_provider',
      baseCreditCost: 10,
    },
    SCHEMA: {
      type: 'object',
      properties: {
        prompt: { type: 'string' },
      },
    },
  })),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      startTimer: () => ({ end: vi.fn(() => 100) }),
    }),
  },
  generateRequestId: () => 'test-request-id',
}));

// Mock posthog
vi.mock('@/lib/posthog', () => ({
  trackEvent: vi.fn(),
}));

// Mock error handler
vi.mock('@/lib/errors', () => ({
  handleError: vi.fn((error) => error),
  GenerationError: class GenerationError extends Error {
    constructor(public code: string, message: string, public options?: { recoverable?: boolean }) {
      super(message);
    }
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>{children}</BrowserRouter>
      </QueryClientProvider>
    );
  };
};

describe('useGeneration', () => {
  let mockSupabase: typeof import('@/integrations/supabase/client').supabase;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await import('@/integrations/supabase/client');
    mockSupabase = module.supabase;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useGeneration(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isGenerating).toBe(false);
      expect(result.current.result).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should expose generate and clearError functions', () => {
      const { result } = renderHook(() => useGeneration(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.generate).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
    });
  });

  describe('session handling', () => {
    it('should refresh session before generation', async () => {
      vi.mocked(mockSupabase.auth.refreshSession).mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } as any },
        error: null,
      });

      vi.mocked(mockSupabase.functions.invoke).mockResolvedValue({
        data: { id: 'gen-123', status: 'pending' },
        error: null,
      });

      const { result } = renderHook(() => useGeneration(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.generate({
            model_record_id: 'test-record-id',
            prompt: 'test prompt',
          });
        } catch {
          // Expected to potentially fail, we just want to verify refresh was called
        }
      });

      expect(mockSupabase.auth.refreshSession).toHaveBeenCalled();
    });

    it('should sign out and throw error when session expired', async () => {
      vi.mocked(mockSupabase.auth.refreshSession).mockResolvedValue({
        data: { session: null },
        error: new Error('Session expired'),
      });

      const { result } = renderHook(() => useGeneration(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await expect(
          result.current.generate({
            model_record_id: 'test-record-id',
            prompt: 'test prompt',
          })
        ).rejects.toThrow();
      });

      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });
  });

  describe('generation flow', () => {
    it('should set isGenerating to true during generation', async () => {
      vi.mocked(mockSupabase.auth.refreshSession).mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } as any },
        error: null,
      });

      // Create a pending promise to keep generation in progress
      let resolveInvoke: (value: any) => void;
      const invokePromise = new Promise((resolve) => {
        resolveInvoke = resolve;
      });

      vi.mocked(mockSupabase.functions.invoke).mockReturnValue(invokePromise as any);

      const { result } = renderHook(() => useGeneration(), {
        wrapper: createWrapper(),
      });

      // Start generation without awaiting
      act(() => {
        result.current.generate({
          model_record_id: 'test-record-id',
          prompt: 'test prompt',
        });
      });

      // Should be generating
      expect(result.current.isGenerating).toBe(true);

      // Resolve the invoke
      await act(async () => {
        resolveInvoke!({ data: { id: 'gen-123', status: 'pending' }, error: null });
      });

      // Should no longer be generating
      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      });
    });

    it('should validate prompt length', async () => {
      vi.mocked(mockSupabase.auth.refreshSession).mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } as any },
        error: null,
      });

      const { result } = renderHook(() => useGeneration(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await expect(
          result.current.generate({
            model_record_id: 'test-record-id',
            prompt: 'a', // Too short
          })
        ).rejects.toThrow();
      });

      expect(result.current.error).toBeTruthy();
    });

    it('should return generation result on success', async () => {
      vi.mocked(mockSupabase.auth.refreshSession).mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } as any },
        error: null,
      });

      const mockResult = {
        id: 'gen-123',
        status: 'pending',
        tokens_used: 10,
        content_type: 'image',
      };

      vi.mocked(mockSupabase.functions.invoke).mockResolvedValue({
        data: mockResult,
        error: null,
      });

      const { result } = renderHook(() => useGeneration(), {
        wrapper: createWrapper(),
      });

      let generationResult: any;
      await act(async () => {
        generationResult = await result.current.generate({
          model_record_id: 'test-record-id',
          prompt: 'test prompt',
        });
      });

      expect(generationResult.id).toBe('gen-123');
      expect(result.current.result?.id).toBe('gen-123');
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      vi.mocked(mockSupabase.auth.refreshSession).mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } as any },
        error: null,
      });
    });

    it('should handle insufficient credits (402)', async () => {
      vi.mocked(mockSupabase.functions.invoke).mockResolvedValue({
        data: null,
        error: { status: 402, message: 'Insufficient credits required: 10, available: 5' },
      });

      const { result } = renderHook(() => useGeneration(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await expect(
          result.current.generate({
            model_record_id: 'test-record-id',
            prompt: 'test prompt',
          })
        ).rejects.toThrow();
      });
    });

    it('should handle rate limiting (429)', async () => {
      vi.mocked(mockSupabase.functions.invoke).mockResolvedValue({
        data: null,
        error: { status: 429, message: 'Rate limit exceeded' },
      });

      const { result } = renderHook(() => useGeneration(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await expect(
          result.current.generate({
            model_record_id: 'test-record-id',
            prompt: 'test prompt',
          })
        ).rejects.toThrow('Rate limit exceeded');
      });
    });

    it('should handle email not verified (403)', async () => {
      vi.mocked(mockSupabase.functions.invoke).mockResolvedValue({
        data: null,
        error: { status: 403, message: '"code":"EMAIL_NOT_VERIFIED","message":"Please verify email"' },
      });

      const { result } = renderHook(() => useGeneration(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await expect(
          result.current.generate({
            model_record_id: 'test-record-id',
            prompt: 'test prompt',
          })
        ).rejects.toThrow();
      });
    });

    it('should clear error when clearError is called', async () => {
      vi.mocked(mockSupabase.functions.invoke).mockResolvedValue({
        data: null,
        error: { status: 500, message: 'Server error' },
      });

      const { result } = renderHook(() => useGeneration(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.generate({
            model_record_id: 'test-record-id',
            prompt: 'test prompt',
          });
        } catch {
          // Expected
        }
      });

      expect(result.current.error).toBeTruthy();

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('retry logic', () => {
    it('should retry on token concurrency error (409)', async () => {
      vi.mocked(mockSupabase.auth.refreshSession).mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } as any },
        error: null,
      });

      // First call returns 409, second succeeds
      vi.mocked(mockSupabase.functions.invoke)
        .mockResolvedValueOnce({
          data: null,
          error: { status: 409, message: 'TOKEN_CONCURRENCY' },
        })
        .mockResolvedValueOnce({
          data: { id: 'gen-123', status: 'pending' },
          error: null,
        });

      const { result } = renderHook(() => useGeneration(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.generate({
          model_record_id: 'test-record-id',
          prompt: 'test prompt',
        });
      });

      // Should have retried
      expect(mockSupabase.functions.invoke).toHaveBeenCalledTimes(2);
      expect(result.current.result?.id).toBe('gen-123');
    });
  });
});
