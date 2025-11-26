import { useRef, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

interface RealtimePayload {
  new: {
    id: string;
    status: string;
    storage_path?: string;
  };
}

interface UseRealtimeGenerationOptions {
  userId: string;
  generationId: string;
  onUpdate: (payload: RealtimePayload) => void;
  onChildUpdate: (payload: RealtimePayload) => void;
  onConnected: () => void;
  onError: () => void;
}

/**
 * Hook for managing realtime subscription to generation updates
 * Tier 1: Primary update mechanism via Supabase Realtime
 */
export const useRealtimeGeneration = ({
  userId,
  generationId,
  onUpdate,
  onChildUpdate,
  onConnected,
  onError,
}: UseRealtimeGenerationOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const subscribe = useCallback((targetGenerationId?: string) => {
    const genId = targetGenerationId || generationId;
    if (!userId || !genId) return;

    logger.info('Setting up Realtime subscription', { userId, generationId: genId } as any);

    // Create user-scoped channel
    const channel = supabase.channel(`user-${userId}-${genId}`)
      .on(
        'postgres_changes' as any,
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'generations',
          filter: `user_id=eq.${userId}`
        },
        (payload: RealtimePayload) => {
          logger.info('Realtime update received', {
            generationId: payload.new.id,
            status: payload.new.status
          } as any);

          if (payload.new.id === genId &&
            (payload.new.status === 'completed' || payload.new.status === 'failed' || payload.new.status === 'error')) {
            onUpdate(payload);
          }
        }
      )
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'generations',
          filter: `parent_generation_id=eq.${genId}`
        },
        (payload: RealtimePayload) => {
          logger.info('Child generation event', {
            childId: payload.new?.id,
            hasStoragePath: !!payload.new?.storage_path
          } as any);

          onChildUpdate(payload);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.info('Realtime connected', { userId } as any);
          setIsConnected(true);
          onConnected();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          logger.warn('Realtime connection failed', { status } as any);
          setIsConnected(false);
          onError();
        }
      });

    channelRef.current = channel;
  }, [userId, generationId, onUpdate, onChildUpdate, onConnected, onError]);

  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      logger.info('Cleaning up realtime subscription');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      setIsConnected(false);
    }
  }, []);

  return {
    isConnected,
    subscribe,
    unsubscribe,
  };
};
