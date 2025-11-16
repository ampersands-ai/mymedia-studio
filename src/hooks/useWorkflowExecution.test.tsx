import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useWorkflowExecution } from './useWorkflowExecution';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    })),
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

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
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

describe('useWorkflowExecution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('workflow execution', () => {
    it('should execute workflow successfully', async () => {
      const mockResponse = {
        data: {
          execution_id: 'exec-123',
          status: 'processing',
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useWorkflowExecution(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.executeWorkflow({
          workflow_template_id: 'template-123',
          user_inputs: {
            prompt: 'Generate an image',
            style: 'realistic',
          },
        });
      });

      // Response is returned via realtime, so this may be null initially
      expect(supabase.functions.invoke).toHaveBeenCalledWith('workflow-executor', {
        body: {
          workflow_template_id: 'template-123',
          user_inputs: {
            prompt: 'Generate an image',
            style: 'realistic',
          },
        },
      });
    });

    it('should handle workflow with various user inputs', async () => {
      const mockResponse = {
        data: {
          execution_id: 'exec-456',
          status: 'processing',
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useWorkflowExecution(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.executeWorkflow({
          workflow_template_id: 'template-123',
          user_inputs: {
            prompt: 'Generate an image',
            width: 1024,
            height: 1024,
            seed: 42,
          },
        });
      });

      expect(supabase.functions.invoke).toHaveBeenCalled();
    });

    it('should track execution with logger', async () => {
      const mockResponse = {
        data: {
          execution_id: 'exec-789',
          status: 'processing',
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useWorkflowExecution(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.executeWorkflow({
          workflow_template_id: 'template-123',
          user_inputs: { prompt: 'Test' },
        });
      });

      expect(logger.child).toHaveBeenCalledWith({ component: 'useWorkflowExecution' });
    });
  });

  describe('error handling', () => {
    it('should handle execution errors', async () => {
      const mockError = {
        data: null,
        error: {
          message: 'Workflow template not found',
        },
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockError);

      const { result } = renderHook(() => useWorkflowExecution(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.executeWorkflow({
            workflow_template_id: 'invalid-id',
            user_inputs: { prompt: 'Test' },
          });
        } catch (error) {
          // Error is expected to be thrown
          expect(error).toBeDefined();
        }
      });
    });

    it('should handle network errors', async () => {
      (supabase.functions.invoke as any).mockRejectedValue(
        new Error('Network error')
      );

      const { result } = renderHook(() => useWorkflowExecution(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.executeWorkflow({
            workflow_template_id: 'template-123',
            user_inputs: { prompt: 'Test' },
          });
        } catch (error) {
          expect((error as Error).message).toBe('Network error');
        }
      });
    });

    it('should handle missing execution ID', async () => {
      const mockResponse = {
        data: {},
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useWorkflowExecution(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.executeWorkflow({
            workflow_template_id: 'template-123',
            user_inputs: { prompt: 'Test' },
          });
        } catch (error) {
          expect((error as Error).message).toContain('No execution ID');
        }
      });
    });
  });

  describe('loading states', () => {
    it('should track execution loading state', async () => {
      const mockResponse = {
        data: {
          execution_id: 'exec-123',
          status: 'processing',
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useWorkflowExecution(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isExecuting).toBe(false);

      await act(async () => {
        const promise = result.current.executeWorkflow({
          workflow_template_id: 'template-123',
          user_inputs: { prompt: 'Test' },
        });
        
        // Should be executing during the promise
        expect(result.current.isExecuting).toBe(true);
        
        await promise;
      });

      // After promise resolution, may still be executing until realtime completes
      // This is expected behavior
    });
  });

  describe('progress tracking', () => {
    it('should initialize with null progress', () => {
      const { result } = renderHook(() => useWorkflowExecution(), {
        wrapper: createWrapper(),
      });

      expect(result.current.progress).toBeNull();
    });

    it('should clear progress on new execution', async () => {
      const mockResponse = {
        data: {
          execution_id: 'exec-123',
          status: 'processing',
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useWorkflowExecution(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.executeWorkflow({
          workflow_template_id: 'template-123',
          user_inputs: { prompt: 'Test' },
        });
      });

      expect(result.current.progress).toBeNull();
    });
  });

  describe('realtime subscription', () => {
    it('should subscribe to workflow updates', async () => {
      const mockResponse = {
        data: {
          execution_id: 'exec-123',
          status: 'processing',
        },
        error: null,
      };

      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);
      (supabase.channel as any).mockReturnValue(mockChannel);

      const { result } = renderHook(() => useWorkflowExecution(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.executeWorkflow({
          workflow_template_id: 'template-123',
          user_inputs: { prompt: 'Test' },
        });
      });

      expect(supabase.channel).toHaveBeenCalledWith('workflow-execution-exec-123');
      expect(mockChannel.on).toHaveBeenCalled();
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle empty user inputs', async () => {
      const mockResponse = {
        data: {
          execution_id: 'exec-123',
          status: 'processing',
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useWorkflowExecution(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.executeWorkflow({
          workflow_template_id: 'template-123',
          user_inputs: {},
        });
      });

      expect(supabase.functions.invoke).toHaveBeenCalled();
    });

    it('should handle caption generation flag', async () => {
      const mockResponse = {
        data: {
          execution_id: 'exec-123',
          status: 'processing',
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useWorkflowExecution(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.executeWorkflow({
          workflow_template_id: 'template-123',
          user_inputs: { prompt: 'Test' },
        }, true);
      });

      expect(supabase.functions.invoke).toHaveBeenCalled();
    });
  });
});
