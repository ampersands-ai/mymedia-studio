/**
 * useModels Hook Tests
 * 
 * Tests the model registry hook that handles:
 * - Loading models from .ts file registry
 * - Filtering by visibility settings
 * - Transforming ModelModule[] to AIModel[]
 * - Content type grouping
 * - Single model lookup by recordId
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock model registry
vi.mock('@/lib/models/registry', () => ({
  getAllModels: vi.fn(() => [
    {
      MODEL_CONFIG: {
        recordId: 'model-1',
        modelId: 'test/model-1',
        provider: 'test_provider',
        modelName: 'Test Model 1',
        contentType: 'prompt_to_image',
        baseCreditCost: 10,
        costMultipliers: null,
        apiEndpoint: '/api/v1/generate',
        payloadStructure: 'wrapper',
        maxImages: 1,
        estimatedTimeSeconds: 30,
        defaultOutputs: 1,
        isActive: true,
        logoUrl: '/logos/test.png',
        modelFamily: 'Test',
        variantName: 'Test 1',
        displayOrderInFamily: 1,
        isLocked: true,
        lockedFilePath: 'src/lib/models/locked/test.ts',
        showNotifyOnCompletion: true,
      },
      SCHEMA: {
        type: 'object',
        properties: { prompt: { type: 'string' } },
      },
    },
    {
      MODEL_CONFIG: {
        recordId: 'model-2',
        modelId: 'test/model-2',
        provider: 'test_provider',
        modelName: 'Test Model 2',
        contentType: 'prompt_to_video',
        baseCreditCost: 20,
        costMultipliers: { duration: 2 },
        apiEndpoint: '/api/v1/generate-video',
        payloadStructure: 'flat',
        maxImages: 0,
        estimatedTimeSeconds: 60,
        defaultOutputs: 1,
        isActive: true,
        logoUrl: '/logos/test2.png',
        modelFamily: 'Test',
        variantName: 'Test 2',
        displayOrderInFamily: 2,
        isLocked: false,
        lockedFilePath: null,
        showNotifyOnCompletion: false,
      },
      SCHEMA: {
        type: 'object',
        properties: { prompt: { type: 'string' } },
      },
    },
    {
      MODEL_CONFIG: {
        recordId: 'model-inactive',
        modelId: 'test/model-inactive',
        provider: 'test_provider',
        modelName: 'Inactive Model',
        contentType: 'prompt_to_image',
        baseCreditCost: 5,
        isActive: false,
        isLocked: false,
      },
      SCHEMA: {},
    },
  ]),
}));

// Mock supabase client for visibility settings
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ 
        data: { 
          setting_value: { 
            visible: {}, 
            deactivated: {} 
          } 
        }, 
        error: null 
      }),
    })),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
};

describe('useModels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('useModels hook', () => {
    it('should load active models from registry', async () => {
      const { useModels } = await import('../useModels');

      const { result } = renderHook(() => useModels(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      // Should only include active models
      expect(result.current.data?.length).toBe(2);
      expect(result.current.data?.some(m => m.record_id === 'model-inactive')).toBe(false);
    });

    it('should transform ModelModule to AIModel format', async () => {
      const { useModels } = await import('../useModels');

      const { result } = renderHook(() => useModels(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      const model = result.current.data?.find(m => m.record_id === 'model-1');
      expect(model).toEqual(expect.objectContaining({
        record_id: 'model-1',
        id: 'test/model-1',
        provider: 'test_provider',
        model_name: 'Test Model 1',
        content_type: 'prompt_to_image',
        base_token_cost: 10,
        api_endpoint: '/api/v1/generate',
        payload_structure: 'wrapper',
        max_images: 1,
        estimated_time_seconds: 30,
        default_outputs: 1,
        is_active: true,
        logo_url: '/logos/test.png',
        model_family: 'Test',
        variant_name: 'Test 1',
        display_order_in_family: 1,
        is_locked: true,
        locked_file_path: 'src/lib/models/locked/test.ts',
        show_notify_on_completion: true,
      }));
    });

    it('should include groups array from contentType', async () => {
      const { useModels } = await import('../useModels');

      const { result } = renderHook(() => useModels(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      const model = result.current.data?.find(m => m.record_id === 'model-1');
      expect(model?.groups).toEqual(['prompt_to_image']);
    });

    it('should include input_schema from SCHEMA export', async () => {
      const { useModels } = await import('../useModels');

      const { result } = renderHook(() => useModels(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      const model = result.current.data?.find(m => m.record_id === 'model-1');
      expect(model?.input_schema).toEqual({
        type: 'object',
        properties: { prompt: { type: 'string' } },
      });
    });

    it('should respect visibility settings from database', async () => {
      const supabase = await import('@/integrations/supabase/client');
      
      vi.mocked(supabase.supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ 
          data: { 
            setting_value: { 
              visible: { 'model-1': false },
              deactivated: {} 
            } 
          }, 
          error: null 
        }),
      } as any);

      const { useModels } = await import('../useModels');

      const { result } = renderHook(() => useModels(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      // model-1 should be filtered out due to visibility: false
      expect(result.current.data?.some(m => m.record_id === 'model-1')).toBe(false);
    });

    it('should filter out deactivated models', async () => {
      const supabase = await import('@/integrations/supabase/client');
      
      vi.mocked(supabase.supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ 
          data: { 
            setting_value: { 
              visible: {},
              deactivated: { 'model-2': true } 
            } 
          }, 
          error: null 
        }),
      } as any);

      const { useModels } = await import('../useModels');

      const { result } = renderHook(() => useModels(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(result.current.data?.some(m => m.record_id === 'model-2')).toBe(false);
    });
  });

  describe('useModelsByContentType', () => {
    it('should group models by content type', async () => {
      const { useModelsByContentType } = await import('../useModels');

      const { result } = renderHook(() => useModelsByContentType(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.modelsByContentType).toBeDefined();
      });

      expect(result.current.modelsByContentType?.['prompt_to_image']).toBeDefined();
      expect(result.current.modelsByContentType?.['prompt_to_video']).toBeDefined();
      expect(result.current.modelsByContentType?.['prompt_to_image']?.length).toBe(1);
      expect(result.current.modelsByContentType?.['prompt_to_video']?.length).toBe(1);
    });

    it('should also expose models array', async () => {
      const { useModelsByContentType } = await import('../useModels');

      const { result } = renderHook(() => useModelsByContentType(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.models).toBeDefined();
      });

      expect(result.current.models?.length).toBe(2);
    });
  });

  describe('useModelByRecordId', () => {
    it('should return null when recordId is undefined', async () => {
      const { useModelByRecordId } = await import('../useModels');

      const { result } = renderHook(() => useModelByRecordId(undefined), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isFetched).toBe(false);
      });
    });

    it('should return model when found', async () => {
      const { useModelByRecordId } = await import('../useModels');

      const { result } = renderHook(() => useModelByRecordId('model-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(result.current.data?.record_id).toBe('model-1');
      expect(result.current.data?.model_name).toBe('Test Model 1');
    });

    it('should return null when model not found', async () => {
      const { useModelByRecordId } = await import('../useModels');

      const { result } = renderHook(() => useModelByRecordId('nonexistent-model'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isFetched).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });

    it('should transform single model to AIModel format', async () => {
      const { useModelByRecordId } = await import('../useModels');

      const { result } = renderHook(() => useModelByRecordId('model-2'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(result.current.data).toEqual(expect.objectContaining({
        record_id: 'model-2',
        id: 'test/model-2',
        provider: 'test_provider',
        model_name: 'Test Model 2',
        content_type: 'prompt_to_video',
        base_token_cost: 20,
        cost_multipliers: { duration: 2 },
        is_locked: false,
      }));
    });
  });
});
