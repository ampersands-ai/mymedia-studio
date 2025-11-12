import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useGeneration } from './useGeneration';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
    auth: {
      refreshSession: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    child: vi.fn(() => ({
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      startTimer: vi.fn(() => ({
        end: vi.fn(),
      })),
    })),
  },
  generateRequestId: vi.fn(() => 'test-request-id'),
}));

vi.mock('@/lib/posthog', () => ({
  trackEvent: vi.fn(),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useGeneration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.auth.refreshSession as any).mockResolvedValue({
      data: { session: { access_token: 'mock-token' } },
      error: null,
    });
  });

  describe('successful generation', () => {
    it('should generate content successfully', async () => {
      const mockResponse = {
        data: {
          id: 'gen-123',
          output_url: 'https://storage.url/image.png',
          storage_path: 'path/to/image.png',
          tokens_used: 100,
          status: 'completed',
          content_type: 'image',
          enhanced: false,
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGeneration(), {
        wrapper: createWrapper(),
      });

      let response: any;
      await act(async () => {
        response = await result.current.generate({
          model_id: 'dall-e-3',
          model_record_id: 'model-123',
          prompt: 'A beautiful sunset',
        });
      });

      expect(response).toEqual(mockResponse.data);
      expect(supabase.functions.invoke).toHaveBeenCalledWith('generate-content', {
        body: expect.objectContaining({
          model_id: 'dall-e-3',
          model_record_id: 'model-123',
          prompt: 'A beautiful sunset',
        }),
      });
    });

    it('should handle custom parameters', async () => {
      const mockResponse = {
        data: {
          id: 'gen-123',
          output_url: 'https://storage.url/image.png',
          tokens_used: 100,
          status: 'completed',
          content_type: 'image',
          enhanced: false,
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGeneration(), {
        wrapper: createWrapper(),
      });

      const customParams = {
        width: 1024,
        height: 1024,
        steps: 30,
      };

      await act(async () => {
        await result.current.generate({
          model_id: 'stable-diffusion',
          model_record_id: 'model-456',
          prompt: 'Test prompt',
          custom_parameters: customParams,
        });
      });

      expect(supabase.functions.invoke).toHaveBeenCalledWith('generate-content', {
        body: expect.objectContaining({
          custom_parameters: customParams,
        }),
      });
    });
  });

  describe('error handling', () => {
    it('should handle edge function errors', async () => {
      const mockError = {
        data: null,
        error: {
          message: 'Insufficient tokens',
        },
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockError);

      const { result } = renderHook(() => useGeneration(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.generate({
            model_id: 'dall-e-3',
            model_record_id: 'model-123',
            prompt: 'Test',
          });
        } catch (error) {
          expect((error as Error).message).toContain('Insufficient tokens');
        }
      });
    });

    it('should handle session expiration', async () => {
      (supabase.auth.refreshSession as any).mockResolvedValue({
        data: { session: null },
        error: new Error('Session expired'),
      });

      const { result } = renderHook(() => useGeneration(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.generate({
            model_id: 'gpt-4',
            model_record_id: 'model-123',
            prompt: 'Test',
          });
        } catch (error) {
          expect((error as Error).message).toBe('SESSION_EXPIRED');
        }
      });

      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it('should validate prompt length', async () => {
      const { result } = renderHook(() => useGeneration(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.generate({
            model_id: 'gpt-4',
            model_record_id: 'model-123',
            prompt: 'a', // Too short
          });
        } catch (error) {
          expect((error as Error).message).toContain('Prompt is required');
        }
      });
    });
  });

  describe('loading states', () => {
    it('should track loading state during generation', async () => {
      const mockResponse = {
        data: {
          id: 'gen-123',
          output_url: 'https://storage.url/image.png',
          tokens_used: 100,
          status: 'completed',
          content_type: 'image',
          enhanced: false,
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGeneration(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isGenerating).toBe(false);

      await act(async () => {
        const promise = result.current.generate({
          model_id: 'gpt-4',
          model_record_id: 'model-123',
          prompt: 'Test',
        });
        
        // Should be generating during the promise
        expect(result.current.isGenerating).toBe(true);
        
        await promise;
      });

      expect(result.current.isGenerating).toBe(false);
    });
  });

  describe('result tracking', () => {
    it('should store generation result', async () => {
      const mockResponse = {
        data: {
          id: 'gen-456',
          output_url: 'https://storage.url/result.png',
          tokens_used: 150,
          status: 'completed',
          content_type: 'image',
          enhanced: true,
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGeneration(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.generate({
          model_id: 'dall-e-3',
          model_record_id: 'model-123',
          prompt: 'A landscape',
          enhance_prompt: true,
        });
      });

      expect(result.current.result).toEqual(mockResponse.data);
      expect(result.current.error).toBeNull();
    });

    it('should clear previous results on new generation', async () => {
      const mockResponse1 = {
        data: {
          id: 'gen-1',
          output_url: 'https://storage.url/result1.png',
          tokens_used: 100,
          status: 'completed',
          content_type: 'image',
          enhanced: false,
        },
        error: null,
      };

      const mockResponse2 = {
        data: {
          id: 'gen-2',
          output_url: 'https://storage.url/result2.png',
          tokens_used: 200,
          status: 'completed',
          content_type: 'image',
          enhanced: false,
        },
        error: null,
      };

      (supabase.functions.invoke as any)
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);

      const { result } = renderHook(() => useGeneration(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.generate({
          model_id: 'dall-e-3',
          model_record_id: 'model-123',
          prompt: 'First prompt',
        });
      });

      expect(result.current.result?.id).toBe('gen-1');

      await act(async () => {
        await result.current.generate({
          model_id: 'dall-e-3',
          model_record_id: 'model-123',
          prompt: 'Second prompt',
        });
      });

      expect(result.current.result?.id).toBe('gen-2');
    });
  });

  describe('edge cases', () => {
    it('should handle template_id without prompt', async () => {
      const mockResponse = {
        data: {
          id: 'gen-789',
          output_url: 'https://storage.url/template-result.png',
          tokens_used: 75,
          status: 'completed',
          content_type: 'image',
          enhanced: false,
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGeneration(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.generate({
          template_id: 'template-123',
          model_record_id: 'model-123',
        });
      });

      expect(supabase.functions.invoke).toHaveBeenCalledWith('generate-content', {
        body: expect.objectContaining({
          template_id: 'template-123',
        }),
      });
    });

    it('should handle undefined custom parameters', async () => {
      const mockResponse = {
        data: {
          id: 'gen-123',
          output_url: 'https://storage.url/result.png',
          tokens_used: 100,
          status: 'completed',
          content_type: 'image',
          enhanced: false,
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGeneration(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.generate({
          model_id: 'gpt-4',
          model_record_id: 'model-123',
          prompt: 'Test',
          custom_parameters: undefined,
        });
      });

      expect(supabase.functions.invoke).toHaveBeenCalled();
    });
  });
});
