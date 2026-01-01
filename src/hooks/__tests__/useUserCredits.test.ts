import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUserCredits } from '../useUserCredits';
import { supabase } from '@/integrations/supabase/client';
import React from 'react';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-123' },
  })),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );
};

describe('useUserCredits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful data fetching', () => {
    it('should return credit data when authenticated', async () => {
      const mockCreditsData = {
        user_id: 'user-123',
        total_credits: 1000,
        reserved_credits: 100,
        available_credits: 900,
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockCreditsData,
              error: null,
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useUserCredits(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.totalCredits).toBe(1000);
      expect(result.current.reservedCredits).toBe(100);
      expect(result.current.availableCredits).toBe(900);
    });
  });

  describe('default values', () => {
    it('should return zero values when data is null', async () => {
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useUserCredits(), {
        wrapper: createWrapper(),
      });

      // Before data loads, should have defaults
      expect(result.current.totalCredits).toBe(0);
      expect(result.current.reservedCredits).toBe(0);
      expect(result.current.availableCredits).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle fetch errors gracefully', async () => {
      const mockError = new Error('Database error');

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: mockError,
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useUserCredits(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('refetch functionality', () => {
    it('should provide refetch function', () => {
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { total_credits: 500, reserved_credits: 0, available_credits: 500 },
              error: null,
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useUserCredits(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.refetch).toBe('function');
    });
  });
});
