/**
 * usePromptEnhancement Hook Tests
 * 
 * Tests the prompt enhancement hook that handles:
 * - Calling the enhance-prompt edge function
 * - Loading state management
 * - Error handling
 * - Input validation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePromptEnhancement } from '../usePromptEnhancement';

// Mock supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe('usePromptEnhancement', () => {
  let mockSupabase: typeof import('@/integrations/supabase/client').supabase;
  let mockToast: typeof import('sonner').toast;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSupabase = (await import('@/integrations/supabase/client')).supabase;
    mockToast = (await import('sonner')).toast;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with isEnhancing as false', () => {
      const { result } = renderHook(() => usePromptEnhancement());

      expect(result.current.isEnhancing).toBe(false);
    });

    it('should expose enhancePrompt function', () => {
      const { result } = renderHook(() => usePromptEnhancement());

      expect(typeof result.current.enhancePrompt).toBe('function');
    });
  });

  describe('input validation', () => {
    it('should show error toast for empty prompt', async () => {
      const { result } = renderHook(() => usePromptEnhancement());

      let enhanced: string | null;
      await act(async () => {
        enhanced = await result.current.enhancePrompt('');
      });

      expect(enhanced!).toBeNull();
      expect(mockToast.error).toHaveBeenCalledWith('Please enter a prompt first');
    });

    it('should show error toast for whitespace-only prompt', async () => {
      const { result } = renderHook(() => usePromptEnhancement());

      let enhanced: string | null;
      await act(async () => {
        enhanced = await result.current.enhancePrompt('   ');
      });

      expect(enhanced!).toBeNull();
      expect(mockToast.error).toHaveBeenCalledWith('Please enter a prompt first');
    });
  });

  describe('enhancement flow', () => {
    it('should set isEnhancing to true during enhancement', async () => {
      let resolveInvoke: (value: any) => void;
      const invokePromise = new Promise((resolve) => {
        resolveInvoke = resolve;
      });

      vi.mocked(mockSupabase.functions.invoke).mockReturnValue(invokePromise as any);

      const { result } = renderHook(() => usePromptEnhancement());

      // Start enhancement without awaiting
      act(() => {
        result.current.enhancePrompt('test prompt');
      });

      expect(result.current.isEnhancing).toBe(true);

      // Resolve the invoke
      await act(async () => {
        resolveInvoke!({ data: { enhanced_prompt: 'enhanced' }, error: null });
      });

      await waitFor(() => {
        expect(result.current.isEnhancing).toBe(false);
      });
    });

    it('should call edge function with correct parameters', async () => {
      vi.mocked(mockSupabase.functions.invoke).mockResolvedValue({
        data: { enhanced_prompt: 'enhanced prompt' },
        error: null,
      });

      const { result } = renderHook(() => usePromptEnhancement());

      await act(async () => {
        await result.current.enhancePrompt('test prompt', 'cinematic');
      });

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('enhance-prompt', {
        body: { prompt: 'test prompt', category: 'cinematic' },
      });
    });

    it('should return enhanced prompt on success', async () => {
      vi.mocked(mockSupabase.functions.invoke).mockResolvedValue({
        data: { enhanced_prompt: 'A beautifully enhanced version of your prompt' },
        error: null,
      });

      const { result } = renderHook(() => usePromptEnhancement());

      let enhanced: string | null;
      await act(async () => {
        enhanced = await result.current.enhancePrompt('original prompt');
      });

      expect(enhanced!).toBe('A beautifully enhanced version of your prompt');
    });

    it('should work without category parameter', async () => {
      vi.mocked(mockSupabase.functions.invoke).mockResolvedValue({
        data: { enhanced_prompt: 'enhanced' },
        error: null,
      });

      const { result } = renderHook(() => usePromptEnhancement());

      await act(async () => {
        await result.current.enhancePrompt('test prompt');
      });

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('enhance-prompt', {
        body: { prompt: 'test prompt', category: undefined },
      });
    });
  });

  describe('error handling', () => {
    it('should return null and show toast on invoke error', async () => {
      vi.mocked(mockSupabase.functions.invoke).mockResolvedValue({
        data: null,
        error: new Error('Network error'),
      });

      const { result } = renderHook(() => usePromptEnhancement());

      let enhanced: string | null;
      await act(async () => {
        enhanced = await result.current.enhancePrompt('test prompt');
      });

      expect(enhanced!).toBeNull();
      expect(mockToast.error).toHaveBeenCalled();
    });

    it('should return null and show toast when data contains error', async () => {
      vi.mocked(mockSupabase.functions.invoke).mockResolvedValue({
        data: { error: 'Enhancement failed' },
        error: null,
      });

      const { result } = renderHook(() => usePromptEnhancement());

      let enhanced: string | null;
      await act(async () => {
        enhanced = await result.current.enhancePrompt('test prompt');
      });

      expect(enhanced!).toBeNull();
      expect(mockToast.error).toHaveBeenCalledWith('Enhancement failed', { duration: 2000 });
    });

    it('should return null when enhanced_prompt is missing', async () => {
      vi.mocked(mockSupabase.functions.invoke).mockResolvedValue({
        data: { some_other_field: 'value' },
        error: null,
      });

      const { result } = renderHook(() => usePromptEnhancement());

      let enhanced: string | null;
      await act(async () => {
        enhanced = await result.current.enhancePrompt('test prompt');
      });

      expect(enhanced!).toBeNull();
      expect(mockToast.error).toHaveBeenCalledWith('No enhanced prompt received', { duration: 2000 });
    });

    it('should set isEnhancing back to false on error', async () => {
      vi.mocked(mockSupabase.functions.invoke).mockRejectedValue(new Error('Unexpected error'));

      const { result } = renderHook(() => usePromptEnhancement());

      await act(async () => {
        await result.current.enhancePrompt('test prompt');
      });

      expect(result.current.isEnhancing).toBe(false);
    });

    it('should log errors with context', async () => {
      const loggerModule = await import('@/lib/logger');
      
      vi.mocked(mockSupabase.functions.invoke).mockRejectedValue(new Error('API error'));

      const { result } = renderHook(() => usePromptEnhancement());

      await act(async () => {
        await result.current.enhancePrompt('test prompt', 'portrait');
      });

      expect(loggerModule.logger.error).toHaveBeenCalledWith(
        'Prompt enhancement failed',
        expect.any(Error),
        expect.objectContaining({
          component: 'usePromptEnhancement',
          operation: 'enhancePrompt',
          category: 'portrait',
          promptLength: 11,
        })
      );
    });
  });

  describe('concurrent calls', () => {
    it('should handle multiple sequential calls correctly', async () => {
      vi.mocked(mockSupabase.functions.invoke)
        .mockResolvedValueOnce({ data: { enhanced_prompt: 'first enhanced' }, error: null })
        .mockResolvedValueOnce({ data: { enhanced_prompt: 'second enhanced' }, error: null });

      const { result } = renderHook(() => usePromptEnhancement());

      let first: string | null;
      let second: string | null;

      await act(async () => {
        first = await result.current.enhancePrompt('first prompt');
      });

      await act(async () => {
        second = await result.current.enhancePrompt('second prompt');
      });

      expect(first!).toBe('first enhanced');
      expect(second!).toBe('second enhanced');
      expect(mockSupabase.functions.invoke).toHaveBeenCalledTimes(2);
    });
  });
});
