/**
 * useHybridGenerationPolling Hook Tests
 * 
 * Tests the three-tier hybrid polling system:
 * - Primary: Realtime subscription
 * - Fallback: Exponential backoff polling
 * - Guards: State sync and stall detection
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-123' },
  })),
}));

// Mock child hooks
vi.mock('../useRealtimeGeneration', () => ({
  useRealtimeGeneration: vi.fn(() => ({
    isConnected: false,
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  })),
}));

vi.mock('../usePollingFallback', () => ({
  usePollingFallback: vi.fn(() => ({
    startPolling: vi.fn(),
    stopPolling: vi.fn(),
  })),
}));

vi.mock('../useGenerationCompletion', () => ({
  useGenerationCompletion: vi.fn(() => ({
    processCompletion: vi.fn(),
    checkCompletion: vi.fn().mockResolvedValue({ isComplete: false, status: null }),
    clearCompletedCache: vi.fn(),
  })),
}));

vi.mock('../useGenerationStateSync', () => ({
  useGenerationStateSync: vi.fn(() => ({
    handleChildUpdate: vi.fn(),
    startStallGuard: vi.fn(),
    clearTimers: vi.fn(),
  })),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
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

describe('useHybridGenerationPolling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  describe('initialization', () => {
    it('should return default state', async () => {
      const { useHybridGenerationPolling } = await import('../useHybridGenerationPolling');

      const { result } = renderHook(
        () => useHybridGenerationPolling({
          onComplete: vi.fn(),
          onError: vi.fn(),
        }),
        { wrapper: createWrapper() }
      );

      expect(result.current.isPolling).toBe(false);
      expect(result.current.pollingId).toBeNull();
      expect(result.current.connectionTier).toBe('disconnected');
      expect(result.current.realtimeConnected).toBe(false);
    });

    it('should expose startPolling and stopPolling functions', async () => {
      const { useHybridGenerationPolling } = await import('../useHybridGenerationPolling');

      const { result } = renderHook(
        () => useHybridGenerationPolling({
          onComplete: vi.fn(),
        }),
        { wrapper: createWrapper() }
      );

      expect(typeof result.current.startPolling).toBe('function');
      expect(typeof result.current.stopPolling).toBe('function');
    });
  });

  describe('startPolling', () => {
    it('should not start polling without user', async () => {
      const authContext = await import('@/contexts/AuthContext');
      vi.mocked(authContext.useAuth).mockReturnValue({ user: null } as any);

      const { useHybridGenerationPolling } = await import('../useHybridGenerationPolling');

      const { result } = renderHook(
        () => useHybridGenerationPolling({
          onComplete: vi.fn(),
        }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.startPolling('gen-123');
      });

      expect(result.current.isPolling).toBe(false);
    });

    it('should set isPolling to true when starting', async () => {
      const authContext = await import('@/contexts/AuthContext');
      vi.mocked(authContext.useAuth).mockReturnValue({ user: { id: 'user-123' } } as any);

      const { useHybridGenerationPolling } = await import('../useHybridGenerationPolling');

      const { result } = renderHook(
        () => useHybridGenerationPolling({
          onComplete: vi.fn(),
        }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.startPolling('gen-123');
      });

      expect(result.current.isPolling).toBe(true);
      expect(result.current.pollingId).toBe('gen-123');
    });

    it('should check completion immediately', async () => {
      const authContext = await import('@/contexts/AuthContext');
      vi.mocked(authContext.useAuth).mockReturnValue({ user: { id: 'user-123' } } as any);

      const completionModule = await import('../useGenerationCompletion');
      const mockCheckCompletion = vi.fn().mockResolvedValue({ isComplete: false, status: null });
      vi.mocked(completionModule.useGenerationCompletion).mockReturnValue({
        processCompletion: vi.fn(),
        checkCompletion: mockCheckCompletion,
        clearCompletedCache: vi.fn(),
      });

      const { useHybridGenerationPolling } = await import('../useHybridGenerationPolling');

      const { result } = renderHook(
        () => useHybridGenerationPolling({
          onComplete: vi.fn(),
        }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.startPolling('gen-123');
      });

      expect(mockCheckCompletion).toHaveBeenCalledWith('gen-123');
    });

    it('should process completion immediately if already complete', async () => {
      const authContext = await import('@/contexts/AuthContext');
      vi.mocked(authContext.useAuth).mockReturnValue({ user: { id: 'user-123' } } as any);

      const mockProcessCompletion = vi.fn();
      const completionModule = await import('../useGenerationCompletion');
      vi.mocked(completionModule.useGenerationCompletion).mockReturnValue({
        processCompletion: mockProcessCompletion,
        checkCompletion: vi.fn().mockResolvedValue({ isComplete: true, status: 'completed' }),
        clearCompletedCache: vi.fn(),
      });

      const { useHybridGenerationPolling } = await import('../useHybridGenerationPolling');

      const { result } = renderHook(
        () => useHybridGenerationPolling({
          onComplete: vi.fn(),
        }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.startPolling('gen-123');
      });

      expect(mockProcessCompletion).toHaveBeenCalledWith('gen-123');
    });

    it('should start stall guard', async () => {
      const authContext = await import('@/contexts/AuthContext');
      vi.mocked(authContext.useAuth).mockReturnValue({ user: { id: 'user-123' } } as any);

      const mockStartStallGuard = vi.fn();
      const stateSyncModule = await import('../useGenerationStateSync');
      vi.mocked(stateSyncModule.useGenerationStateSync).mockReturnValue({
        handleChildUpdate: vi.fn(),
        startStallGuard: mockStartStallGuard,
        clearTimers: vi.fn(),
      });

      const { useHybridGenerationPolling } = await import('../useHybridGenerationPolling');

      const { result } = renderHook(
        () => useHybridGenerationPolling({
          onComplete: vi.fn(),
        }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.startPolling('gen-123');
      });

      expect(mockStartStallGuard).toHaveBeenCalled();
    });

    it('should subscribe to realtime', async () => {
      const authContext = await import('@/contexts/AuthContext');
      vi.mocked(authContext.useAuth).mockReturnValue({ user: { id: 'user-123' } } as any);

      const mockSubscribe = vi.fn();
      const realtimeModule = await import('../useRealtimeGeneration');
      vi.mocked(realtimeModule.useRealtimeGeneration).mockReturnValue({
        isConnected: false,
        subscribe: mockSubscribe,
        unsubscribe: vi.fn(),
      });

      const { useHybridGenerationPolling } = await import('../useHybridGenerationPolling');

      const { result } = renderHook(
        () => useHybridGenerationPolling({
          onComplete: vi.fn(),
        }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.startPolling('gen-123');
      });

      expect(mockSubscribe).toHaveBeenCalledWith('gen-123');
    });
  });

  describe('stopPolling', () => {
    it('should reset all state', async () => {
      const authContext = await import('@/contexts/AuthContext');
      vi.mocked(authContext.useAuth).mockReturnValue({ user: { id: 'user-123' } } as any);

      const { useHybridGenerationPolling } = await import('../useHybridGenerationPolling');

      const { result } = renderHook(
        () => useHybridGenerationPolling({
          onComplete: vi.fn(),
        }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.startPolling('gen-123');
      });

      expect(result.current.isPolling).toBe(true);

      act(() => {
        result.current.stopPolling();
      });

      expect(result.current.isPolling).toBe(false);
      expect(result.current.pollingId).toBeNull();
      expect(result.current.connectionTier).toBe('disconnected');
    });

    it('should clear timers and unsubscribe', async () => {
      const authContext = await import('@/contexts/AuthContext');
      vi.mocked(authContext.useAuth).mockReturnValue({ user: { id: 'user-123' } } as any);

      const mockUnsubscribe = vi.fn();
      const realtimeModule = await import('../useRealtimeGeneration');
      vi.mocked(realtimeModule.useRealtimeGeneration).mockReturnValue({
        isConnected: false,
        subscribe: vi.fn(),
        unsubscribe: mockUnsubscribe,
      });

      const mockClearTimers = vi.fn();
      const stateSyncModule = await import('../useGenerationStateSync');
      vi.mocked(stateSyncModule.useGenerationStateSync).mockReturnValue({
        handleChildUpdate: vi.fn(),
        startStallGuard: vi.fn(),
        clearTimers: mockClearTimers,
      });

      const mockStopFallbackPolling = vi.fn();
      const fallbackModule = await import('../usePollingFallback');
      vi.mocked(fallbackModule.usePollingFallback).mockReturnValue({
        startPolling: vi.fn(),
        stopPolling: mockStopFallbackPolling,
      });

      const { useHybridGenerationPolling } = await import('../useHybridGenerationPolling');

      const { result } = renderHook(
        () => useHybridGenerationPolling({
          onComplete: vi.fn(),
        }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.stopPolling();
      });

      expect(mockClearTimers).toHaveBeenCalled();
      expect(mockStopFallbackPolling).toHaveBeenCalled();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('cleanup on unmount', () => {
    it('should cleanup on unmount', async () => {
      const authContext = await import('@/contexts/AuthContext');
      vi.mocked(authContext.useAuth).mockReturnValue({ user: { id: 'user-123' } } as any);

      const mockUnsubscribe = vi.fn();
      const realtimeModule = await import('../useRealtimeGeneration');
      vi.mocked(realtimeModule.useRealtimeGeneration).mockReturnValue({
        isConnected: false,
        subscribe: vi.fn(),
        unsubscribe: mockUnsubscribe,
      });

      const mockClearTimers = vi.fn();
      const stateSyncModule = await import('../useGenerationStateSync');
      vi.mocked(stateSyncModule.useGenerationStateSync).mockReturnValue({
        handleChildUpdate: vi.fn(),
        startStallGuard: vi.fn(),
        clearTimers: mockClearTimers,
      });

      const { useHybridGenerationPolling } = await import('../useHybridGenerationPolling');

      const { unmount } = renderHook(
        () => useHybridGenerationPolling({
          onComplete: vi.fn(),
        }),
        { wrapper: createWrapper() }
      );

      unmount();

      expect(mockClearTimers).toHaveBeenCalled();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });
});
