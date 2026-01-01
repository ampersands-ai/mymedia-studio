/**
 * useRealtimeGeneration Hook Tests
 * 
 * Tests the realtime subscription hook that handles:
 * - Subscription initialization
 * - Update callback handling
 * - Child generation updates
 * - Connection state management
 * - Cleanup on unmount
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRealtimeGeneration } from '../useRealtimeGeneration';

// Store callback for simulating events
let subscriptionCallback: (status: string) => void;
let updateCallback: (payload: any) => void;
let childUpdateCallback: (payload: any) => void;

const mockChannel = {
  on: vi.fn().mockImplementation(function(this: any, _event: string, _options: any, callback: any) {
    // Store the callback based on filter
    if (_options.filter?.includes('parent_generation_id')) {
      childUpdateCallback = callback;
    } else {
      updateCallback = callback;
    }
    return this;
  }),
  subscribe: vi.fn().mockImplementation((callback) => {
    subscriptionCallback = callback;
    return mockChannel;
  }),
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: vi.fn(() => mockChannel),
    removeChannel: vi.fn(),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useRealtimeGeneration', () => {
  const defaultOptions = {
    userId: 'user-123',
    generationId: 'gen-456',
    onUpdate: vi.fn(),
    onChildUpdate: vi.fn(),
    onConnected: vi.fn(),
    onError: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('initialization', () => {
    it('should return isConnected as false initially', () => {
      const { result } = renderHook(() => useRealtimeGeneration(defaultOptions));

      expect(result.current.isConnected).toBe(false);
    });

    it('should expose subscribe and unsubscribe functions', () => {
      const { result } = renderHook(() => useRealtimeGeneration(defaultOptions));

      expect(typeof result.current.subscribe).toBe('function');
      expect(typeof result.current.unsubscribe).toBe('function');
    });
  });

  describe('subscription', () => {
    it('should not subscribe when userId is empty', async () => {
      const supabase = await import('@/integrations/supabase/client');

      const { result } = renderHook(() => 
        useRealtimeGeneration({ ...defaultOptions, userId: '' })
      );

      act(() => {
        result.current.subscribe();
      });

      expect(supabase.supabase.channel).not.toHaveBeenCalled();
    });

    it('should not subscribe when generationId is empty', async () => {
      const supabase = await import('@/integrations/supabase/client');

      const { result } = renderHook(() => 
        useRealtimeGeneration({ ...defaultOptions, generationId: '' })
      );

      act(() => {
        result.current.subscribe();
      });

      expect(supabase.supabase.channel).not.toHaveBeenCalled();
    });

    it('should create channel with correct name format', async () => {
      const supabase = await import('@/integrations/supabase/client');

      const { result } = renderHook(() => useRealtimeGeneration(defaultOptions));

      act(() => {
        result.current.subscribe();
      });

      expect(supabase.supabase.channel).toHaveBeenCalledWith('user-user-123-gen-456');
    });

    it('should subscribe to postgres_changes for updates', async () => {
      const { result } = renderHook(() => useRealtimeGeneration(defaultOptions));

      act(() => {
        result.current.subscribe();
      });

      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: 'UPDATE',
          schema: 'public',
          table: 'generations',
        }),
        expect.any(Function)
      );
    });

    it('should subscribe to child generation events', async () => {
      const { result } = renderHook(() => useRealtimeGeneration(defaultOptions));

      act(() => {
        result.current.subscribe();
      });

      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: '*',
          schema: 'public',
          table: 'generations',
          filter: expect.stringContaining('parent_generation_id'),
        }),
        expect.any(Function)
      );
    });
  });

  describe('connection state', () => {
    it('should set isConnected to true when SUBSCRIBED', async () => {
      const { result } = renderHook(() => useRealtimeGeneration(defaultOptions));

      act(() => {
        result.current.subscribe();
      });

      act(() => {
        subscriptionCallback('SUBSCRIBED');
      });

      expect(result.current.isConnected).toBe(true);
      expect(defaultOptions.onConnected).toHaveBeenCalled();
    });

    it('should set isConnected to false on CHANNEL_ERROR', async () => {
      const { result } = renderHook(() => useRealtimeGeneration(defaultOptions));

      act(() => {
        result.current.subscribe();
      });

      // First connect
      act(() => {
        subscriptionCallback('SUBSCRIBED');
      });

      expect(result.current.isConnected).toBe(true);

      // Then error
      act(() => {
        subscriptionCallback('CHANNEL_ERROR');
      });

      expect(result.current.isConnected).toBe(false);
      expect(defaultOptions.onError).toHaveBeenCalled();
    });

    it('should set isConnected to false on TIMED_OUT', async () => {
      const { result } = renderHook(() => useRealtimeGeneration(defaultOptions));

      act(() => {
        result.current.subscribe();
      });

      act(() => {
        subscriptionCallback('TIMED_OUT');
      });

      expect(result.current.isConnected).toBe(false);
      expect(defaultOptions.onError).toHaveBeenCalled();
    });
  });

  describe('update handling', () => {
    it('should call onUpdate when generation completes', async () => {
      const { result } = renderHook(() => useRealtimeGeneration(defaultOptions));

      act(() => {
        result.current.subscribe();
      });

      const payload = {
        new: {
          id: 'gen-456',
          status: 'completed',
          storage_path: '/path/to/file',
        },
      };

      act(() => {
        updateCallback(payload);
      });

      expect(defaultOptions.onUpdate).toHaveBeenCalledWith(payload);
    });

    it('should call onUpdate when generation fails', async () => {
      const { result } = renderHook(() => useRealtimeGeneration(defaultOptions));

      act(() => {
        result.current.subscribe();
      });

      const payload = {
        new: {
          id: 'gen-456',
          status: 'failed',
        },
      };

      act(() => {
        updateCallback(payload);
      });

      expect(defaultOptions.onUpdate).toHaveBeenCalledWith(payload);
    });

    it('should not call onUpdate for different generation id', async () => {
      const { result } = renderHook(() => useRealtimeGeneration(defaultOptions));

      act(() => {
        result.current.subscribe();
      });

      const payload = {
        new: {
          id: 'different-gen-id',
          status: 'completed',
        },
      };

      act(() => {
        updateCallback(payload);
      });

      expect(defaultOptions.onUpdate).not.toHaveBeenCalled();
    });

    it('should not call onUpdate for processing status', async () => {
      const { result } = renderHook(() => useRealtimeGeneration(defaultOptions));

      act(() => {
        result.current.subscribe();
      });

      const payload = {
        new: {
          id: 'gen-456',
          status: 'processing', // Not a terminal status
        },
      };

      act(() => {
        updateCallback(payload);
      });

      expect(defaultOptions.onUpdate).not.toHaveBeenCalled();
    });
  });

  describe('child update handling', () => {
    it('should call onChildUpdate for child generation events', async () => {
      const { result } = renderHook(() => useRealtimeGeneration(defaultOptions));

      act(() => {
        result.current.subscribe();
      });

      const payload = {
        new: {
          id: 'child-gen-789',
          storage_path: '/path/to/child',
        },
      };

      act(() => {
        childUpdateCallback(payload);
      });

      expect(defaultOptions.onChildUpdate).toHaveBeenCalledWith(payload);
    });
  });

  describe('unsubscription', () => {
    it('should remove channel on unsubscribe', async () => {
      const supabase = await import('@/integrations/supabase/client');

      const { result } = renderHook(() => useRealtimeGeneration(defaultOptions));

      act(() => {
        result.current.subscribe();
      });

      act(() => {
        result.current.unsubscribe();
      });

      expect(supabase.supabase.removeChannel).toHaveBeenCalled();
    });

    it('should set isConnected to false on unsubscribe', async () => {
      const { result } = renderHook(() => useRealtimeGeneration(defaultOptions));

      act(() => {
        result.current.subscribe();
      });

      act(() => {
        subscriptionCallback('SUBSCRIBED');
      });

      expect(result.current.isConnected).toBe(true);

      act(() => {
        result.current.unsubscribe();
      });

      expect(result.current.isConnected).toBe(false);
    });

    it('should not throw when unsubscribing without active subscription', async () => {
      const { result } = renderHook(() => useRealtimeGeneration(defaultOptions));

      expect(() => {
        act(() => {
          result.current.unsubscribe();
        });
      }).not.toThrow();
    });
  });

  describe('custom generationId in subscribe', () => {
    it('should use provided generationId over hook generationId', async () => {
      const supabase = await import('@/integrations/supabase/client');

      const { result } = renderHook(() => useRealtimeGeneration(defaultOptions));

      act(() => {
        result.current.subscribe('custom-gen-id');
      });

      expect(supabase.supabase.channel).toHaveBeenCalledWith('user-user-123-custom-gen-id');
    });
  });
});
