/**
 * @deprecated These tests are outdated and test the old database-based approach.
 * useModels hook has been migrated to use the registry (file-based system).
 * Tests should be updated to test registry functionality instead of database queries.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useModels, useModelsByContentType, useModelByRecordId, AIModel } from './useModels';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
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
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockModels: AIModel[] = [
  {
    record_id: 'model-1',
    id: 'gpt-4',
    provider: 'openai',
    model_name: 'GPT-4',
    content_type: 'text',
    base_token_cost: 100,
    cost_multipliers: null,
    input_schema: null,
    api_endpoint: null,
    is_active: true,
    groups: null,
  },
  {
    record_id: 'model-2',
    id: 'dall-e-3',
    provider: 'openai',
    model_name: 'DALL-E 3',
    content_type: 'image',
    base_token_cost: 200,
    cost_multipliers: null,
    input_schema: null,
    api_endpoint: null,
    is_active: true,
    groups: null,
  },
];

describe('useModels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful data fetching', () => {
    it('should fetch all active models', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({ data: mockModels, error: null });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        order: mockOrder,
      });

      const { result } = renderHook(() => useModels(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(result.current.isSuccess).toBe(true);
      expect(result.current.data).toEqual(mockModels);
      expect(supabase.from).toHaveBeenCalledWith('ai_models');
      expect(mockEq).toHaveBeenCalledWith('is_active', true);
    });

    it('should return empty array when no models exist', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        order: mockOrder,
      });

      const { result } = renderHook(() => useModels(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(result.current.isSuccess).toBe(true);
      expect(result.current.data).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should handle database errors', async () => {
      const dbError = new Error('Database connection failed');
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({ data: null, error: dbError });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        order: mockOrder,
      });

      const { result } = renderHook(() => useModels(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toEqual(dbError);
    });
  });
});

describe('useModelsByContentType', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should group models by content type', async () => {
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockResolvedValue({ data: mockModels, error: null });

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
    });
    mockSelect.mockReturnValue({
      eq: mockEq,
    });
    mockEq.mockReturnValue({
      order: mockOrder,
    });

    const { result } = renderHook(() => useModelsByContentType(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(result.current.isSuccess).toBe(true);
    expect(result.current.modelsByContentType).toBeDefined();
    expect(result.current.models).toEqual(mockModels);
  });
});

describe('useModelByRecordId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch single model by record_id', async () => {
    const mockModel = mockModels[0];
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockModel, error: null });

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
    });
    mockSelect.mockReturnValue({
      eq: mockEq,
    });
    mockEq.mockReturnValue({
      maybeSingle: mockMaybeSingle,
    });

    const { result } = renderHook(() => useModelByRecordId('model-1'), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data).toEqual(mockModel);
    expect(mockEq).toHaveBeenCalledWith('record_id', 'model-1');
  });

  it('should not query when recordId is undefined', () => {
    const mockSelect = vi.fn();
    (supabase.from as any).mockReturnValue({
      select: mockSelect,
    });

    renderHook(() => useModelByRecordId(undefined), {
      wrapper: createWrapper(),
    });

    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('should return null when model not found', async () => {
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
    });
    mockSelect.mockReturnValue({
      eq: mockEq,
    });
    mockEq.mockReturnValue({
      maybeSingle: mockMaybeSingle,
    });

    const { result } = renderHook(() => useModelByRecordId('non-existent'), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data).toBeNull();
  });
});
