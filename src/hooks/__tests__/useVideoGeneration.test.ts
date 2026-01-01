/**
 * useVideoGeneration Hook Tests
 * 
 * Tests the video generation hook that handles:
 * - Child video generation queries
 * - Realtime subscription for updates
 * - Video generation triggers
 * - Polling behavior for pending videos
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useVideoGeneration } from '../useVideoGeneration';

// Mock supabase client
const mockSupabaseChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn(),
    })),
    channel: vi.fn(() => mockSupabaseChannel),
    removeChannel: vi.fn(),
  },
}));

// Mock useGenerateSunoVideo hook
vi.mock('@/hooks/useGenerateSunoVideo', () => ({
  useGenerateSunoVideo: vi.fn(() => ({
    generateVideo: vi.fn(),
    isGenerating: false,
  })),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
  return Wrapper;
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
};

describe('useVideoGeneration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('initialization', () => {
    it('should return default state when parentGenerationId is null', () => {
      const { result } = renderHook(() => useVideoGeneration(null), {
        wrapper: createWrapper(),
      });

      expect(result.current.childVideoGenerations).toEqual([]);
      expect(result.current.generatingVideoIndex).toBeNull();
      expect(result.current.isGeneratingVideo).toBe(false);
    });

    it('should expose handleGenerateVideo function', () => {
      const { result } = renderHook(() => useVideoGeneration('parent-123'), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.handleGenerateVideo).toBe('function');
    });

    it('should expose setGeneratingVideoIndex function', () => {
      const { result } = renderHook(() => useVideoGeneration('parent-123'), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.setGeneratingVideoIndex).toBe('function');
    });
  });

  describe('query behavior', () => {
    it('should not query when parentGenerationId is null', async () => {
      const supabase = await import('@/integrations/supabase/client');

      renderHook(() => useVideoGeneration(null), {
        wrapper: createWrapper(),
      });

      // Query should not be executed
      expect(supabase.supabase.from).not.toHaveBeenCalled();
    });

    it('should query child generations when parentGenerationId is provided', async () => {
      const supabase = await import('@/integrations/supabase/client');
      
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockIn = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });

      vi.mocked(supabase.supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        in: mockIn,
        order: mockOrder,
      } as any);

      renderHook(() => useVideoGeneration('parent-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(supabase.supabase.from).toHaveBeenCalledWith('generations');
      });
    });
  });

  describe('realtime subscription', () => {
    it('should set up realtime subscription when parentGenerationId is provided', async () => {
      const supabase = await import('@/integrations/supabase/client');

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockIn = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });

      vi.mocked(supabase.supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        in: mockIn,
        order: mockOrder,
      } as any);

      renderHook(() => useVideoGeneration('parent-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(supabase.supabase.channel).toHaveBeenCalled();
      });
    });

    it('should cleanup subscription on unmount', async () => {
      const supabase = await import('@/integrations/supabase/client');

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockIn = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });

      vi.mocked(supabase.supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        in: mockIn,
        order: mockOrder,
      } as any);

      const { unmount } = renderHook(() => useVideoGeneration('parent-123'), {
        wrapper: createWrapper(),
      });

      unmount();

      await waitFor(() => {
        expect(supabase.supabase.removeChannel).toHaveBeenCalled();
      });
    });
  });

  describe('handleGenerateVideo', () => {
    it('should not call generateVideo when parentGenerationId is null', async () => {
      const useGenerateSunoVideoModule = await import('@/hooks/useGenerateSunoVideo');
      const mockGenerateVideo = vi.fn();
      
      vi.mocked(useGenerateSunoVideoModule.useGenerateSunoVideo).mockReturnValue({
        generateVideo: mockGenerateVideo,
        isGenerating: false,
      });

      const { result } = renderHook(() => useVideoGeneration(null), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleGenerateVideo(0);
      });

      expect(mockGenerateVideo).not.toHaveBeenCalled();
    });

    it('should call generateVideo with correct parameters', async () => {
      const supabase = await import('@/integrations/supabase/client');
      const useGenerateSunoVideoModule = await import('@/hooks/useGenerateSunoVideo');
      
      const mockGenerateVideo = vi.fn();
      vi.mocked(useGenerateSunoVideoModule.useGenerateSunoVideo).mockReturnValue({
        generateVideo: mockGenerateVideo,
        isGenerating: false,
      });

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockIn = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });

      vi.mocked(supabase.supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        in: mockIn,
        order: mockOrder,
      } as any);

      const { result } = renderHook(() => useVideoGeneration('parent-123'), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleGenerateVideo(2);
      });

      expect(mockGenerateVideo).toHaveBeenCalledWith(
        { generationId: 'parent-123', outputIndex: 2 },
        expect.any(Object)
      );
    });

    it('should set generatingVideoIndex when video generation starts', async () => {
      const supabase = await import('@/integrations/supabase/client');
      const useGenerateSunoVideoModule = await import('@/hooks/useGenerateSunoVideo');
      
      const mockGenerateVideo = vi.fn();
      vi.mocked(useGenerateSunoVideoModule.useGenerateSunoVideo).mockReturnValue({
        generateVideo: mockGenerateVideo,
        isGenerating: false,
      });

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockIn = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });

      vi.mocked(supabase.supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        in: mockIn,
        order: mockOrder,
      } as any);

      const { result } = renderHook(() => useVideoGeneration('parent-123'), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleGenerateVideo(1);
      });

      expect(result.current.generatingVideoIndex).toBe(1);
    });
  });

  describe('state management', () => {
    it('should allow manual setting of generatingVideoIndex', async () => {
      const supabase = await import('@/integrations/supabase/client');

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockIn = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });

      vi.mocked(supabase.supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        in: mockIn,
        order: mockOrder,
      } as any);

      const { result } = renderHook(() => useVideoGeneration('parent-123'), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setGeneratingVideoIndex(3);
      });

      expect(result.current.generatingVideoIndex).toBe(3);

      act(() => {
        result.current.setGeneratingVideoIndex(null);
      });

      expect(result.current.generatingVideoIndex).toBeNull();
    });
  });
});
