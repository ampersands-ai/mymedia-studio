/**
 * useActiveGenerations Hook Tests
 * 
 * Tests the active generations hook that handles:
 * - Fetching active generations for a user
 * - Stale generation filtering
 * - Model metadata enrichment from registry
 * - Realtime subscription integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock AuthContext before importing the hook
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-123' },
  })),
}));

// Mock supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
  },
}));

// Mock model registry
vi.mock('@/lib/models/registry', () => ({
  getModel: vi.fn((recordId: string) => {
    if (recordId === 'known-model-id') {
      return {
        MODEL_CONFIG: {
          modelName: 'Test Model',
          contentType: 'prompt_to_image',
        },
      };
    }
    throw new Error('Model not found');
  }),
}));

// Mock realtime subscription hook
vi.mock('@/hooks/useRealtimeSubscription', () => ({
  useUserRealtimeSubscription: vi.fn(),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock constants
vi.mock('@/constants/generation-status', () => ({
  ACTIVE_GENERATION_STATUSES: ['pending', 'processing'],
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
  return Wrapper;
    );
  };
};

describe('useActiveGenerations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  describe('initialization', () => {
    it('should return empty array initially', async () => {
      const { useActiveGenerations } = await import('../useActiveGenerations');
      
      const { result } = renderHook(() => useActiveGenerations(), {
        wrapper: createWrapper(),
      });

      expect(result.current.data).toBeUndefined();
    });

    it('should fetch active generations when user is present', async () => {
      const supabase = await import('@/integrations/supabase/client');
      const { useActiveGenerations } = await import('../useActiveGenerations');

      const mockLimit = vi.fn().mockResolvedValue({ 
        data: [
          {
            id: 'gen-1',
            model_id: 'model-1',
            prompt: 'test prompt',
            status: 'pending',
            created_at: '2024-01-15T11:30:00Z',
            model_record_id: 'known-model-id',
          },
        ], 
        error: null 
      });

      vi.mocked(supabase.supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: mockLimit,
      } as any);

      const { result } = renderHook(() => useActiveGenerations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(supabase.supabase.from).toHaveBeenCalledWith('generations');
    });
  });

  describe('query disabled when no user', () => {
    it('should not fetch when user is null', async () => {
      const authContext = await import('@/contexts/AuthContext');
      vi.mocked(authContext.useAuth).mockReturnValue({ user: null } as any);

      const supabase = await import('@/integrations/supabase/client');
      const { useActiveGenerations } = await import('../useActiveGenerations');

      renderHook(() => useActiveGenerations(), {
        wrapper: createWrapper(),
      });

      // Give it time to potentially make a call
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(supabase.supabase.from).not.toHaveBeenCalled();
    });
  });

  describe('stale generation filtering', () => {
    it('should filter out generations older than 1 hour', async () => {
      const supabase = await import('@/integrations/supabase/client');
      const authContext = await import('@/contexts/AuthContext');
      vi.mocked(authContext.useAuth).mockReturnValue({ user: { id: 'user-123' } } as any);

      const { useActiveGenerations } = await import('../useActiveGenerations');

      const mockLimit = vi.fn().mockResolvedValue({ 
        data: [
          {
            id: 'gen-fresh',
            model_id: 'model-1',
            prompt: 'fresh',
            status: 'pending',
            created_at: '2024-01-15T11:30:00Z', // 30 min old
            model_record_id: 'known-model-id',
          },
          {
            id: 'gen-stale',
            model_id: 'model-2',
            prompt: 'stale',
            status: 'pending',
            created_at: '2024-01-15T10:00:00Z', // 2 hours old
            model_record_id: 'known-model-id',
          },
        ], 
        error: null 
      });

      vi.mocked(supabase.supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: mockLimit,
      } as any);

      const { result } = renderHook(() => useActiveGenerations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
        expect(result.current.data?.length).toBe(1);
        expect(result.current.data?.[0].id).toBe('gen-fresh');
      });
    });
  });

  describe('model enrichment', () => {
    it('should enrich generations with model metadata from registry', async () => {
      const supabase = await import('@/integrations/supabase/client');
      const authContext = await import('@/contexts/AuthContext');
      vi.mocked(authContext.useAuth).mockReturnValue({ user: { id: 'user-123' } } as any);

      const { useActiveGenerations } = await import('../useActiveGenerations');

      const mockLimit = vi.fn().mockResolvedValue({ 
        data: [
          {
            id: 'gen-1',
            model_id: 'model-1',
            prompt: 'test',
            status: 'pending',
            created_at: '2024-01-15T11:30:00Z',
            model_record_id: 'known-model-id',
          },
        ], 
        error: null 
      });

      vi.mocked(supabase.supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: mockLimit,
      } as any);

      const { result } = renderHook(() => useActiveGenerations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data?.[0].model_name).toBe('Test Model');
        expect(result.current.data?.[0].content_type).toBe('prompt_to_image');
      });
    });

    it('should use fallback values when model not found in registry', async () => {
      const supabase = await import('@/integrations/supabase/client');
      const authContext = await import('@/contexts/AuthContext');
      vi.mocked(authContext.useAuth).mockReturnValue({ user: { id: 'user-123' } } as any);

      const { useActiveGenerations } = await import('../useActiveGenerations');

      const mockLimit = vi.fn().mockResolvedValue({ 
        data: [
          {
            id: 'gen-1',
            model_id: 'model-1',
            prompt: 'test',
            status: 'pending',
            created_at: '2024-01-15T11:30:00Z',
            model_record_id: 'unknown-model-id', // Not in registry
          },
        ], 
        error: null 
      });

      vi.mocked(supabase.supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: mockLimit,
      } as any);

      const { result } = renderHook(() => useActiveGenerations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data?.[0].model_name).toBe('Unknown');
        expect(result.current.data?.[0].content_type).toBe('unknown');
      });
    });
  });

  describe('realtime subscription', () => {
    it('should set up realtime subscription for user generations', async () => {
      const realtimeModule = await import('@/hooks/useRealtimeSubscription');
      const authContext = await import('@/contexts/AuthContext');
      vi.mocked(authContext.useAuth).mockReturnValue({ user: { id: 'user-123' } } as any);

      const { useActiveGenerations } = await import('../useActiveGenerations');

      renderHook(() => useActiveGenerations(), {
        wrapper: createWrapper(),
      });

      expect(realtimeModule.useUserRealtimeSubscription).toHaveBeenCalledWith(
        'generations',
        'user-123',
        ['active-generations', 'user-123'],
        { event: '*' }
      );
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      const supabase = await import('@/integrations/supabase/client');
      const authContext = await import('@/contexts/AuthContext');
      vi.mocked(authContext.useAuth).mockReturnValue({ user: { id: 'user-123' } } as any);

      const { useActiveGenerations } = await import('../useActiveGenerations');

      const mockLimit = vi.fn().mockResolvedValue({ 
        data: null, 
        error: new Error('Database error') 
      });

      vi.mocked(supabase.supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: mockLimit,
      } as any);

      const { result } = renderHook(() => useActiveGenerations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });
    });
  });
});
