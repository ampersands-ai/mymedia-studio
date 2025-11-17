import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { POLLING_CONFIG } from "@/constants/generation";
import type { GenerationOutput } from "./useGenerationState";
import { logger } from "@/lib/logger";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type ConnectionTier = 'realtime' | 'polling' | 'disconnected';

interface UseHybridGenerationPollingOptions {
  onComplete: (outputs: GenerationOutput[], parentId: string) => void;
  onError?: (error: string) => void;
  onTimeout?: () => void;
}

/**
 * Three-tier hybrid polling system:
 * 1. Primary: User-scoped Realtime subscription
 * 2. Backup: Database trigger notifications (pg_notify)
 * 3. Fallback: Exponential backoff polling
 */
export const useHybridGenerationPolling = (options: UseHybridGenerationPollingOptions) => {
  const { user } = useAuth();
  const [isPolling, setIsPolling] = useState(false);
  const [pollingId, setPollingId] = useState<string | null>(null);
  const [connectionTier, setConnectionTier] = useState<ConnectionTier>('disconnected');
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const intervalsRef = useRef<NodeJS.Timeout[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const fallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const completedGenerationsRef = useRef<Set<string>>(new Set());

  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const clearAllTimers = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    intervalsRef.current.forEach(clearInterval);
    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current);
      fallbackTimeoutRef.current = null;
    }
    timeoutsRef.current = [];
    intervalsRef.current = [];
  }, []);

  /**
   * Process completed generation
   */
  const processCompletion = useCallback(async (generationId: string) => {
    // Prevent duplicate processing
    if (completedGenerationsRef.current.has(generationId)) {
      return;
    }
    completedGenerationsRef.current.add(generationId);

    try {
      logger.info('Processing completed generation', { generationId } as any);

      // Fetch parent and children
      const { data: parentData, error } = await supabase
        .from('generations')
        .select(`
          id,
          status,
          storage_path,
          type,
          created_at,
          provider_task_id,
          model_id,
          model_record_id,
          provider_response,
          ai_models!inner(provider)
        `)
        .eq('id', generationId)
        .single();

      if (error) throw error;

      if (parentData.status === 'completed') {
        const { data: childrenData } = await supabase
          .from('generations')
          .select(`id, storage_path, output_index, provider_task_id, model_id, ai_models!inner(provider)`)
          .eq('parent_generation_id', parentData.id)
          .order('output_index');

        const outputs: GenerationOutput[] = [];

        // Add child generations (batch outputs)
        if (childrenData && childrenData.length > 0) {
          outputs.push(...childrenData.map((child: any) => ({
            id: child.id,
            storage_path: child.storage_path || '',
            type: parentData.type,
            output_index: child.output_index || 0,
            provider_task_id: child.provider_task_id || '',
            model_id: child.model_id || '',
            provider: child.ai_models?.provider || '',
          })));
        }

        // Also add parent if it has output (single output models)
        if (parentData.storage_path) {
          outputs.push({
            id: parentData.id,
            storage_path: parentData.storage_path,
            type: parentData.type,
            output_index: 0,
            provider_task_id: parentData.provider_task_id || '',
            model_id: parentData.model_id || '',
            provider: parentData.ai_models?.provider || '',
          });
        }

        optionsRef.current.onComplete(outputs, parentData.id);
      } else if (parentData.status === 'failed' || parentData.status === 'error') {
        const pr: any = parentData.provider_response || {};
        const detailed = pr?.error || pr?.message || pr?.error_message || pr?.detail || (pr?.error && pr?.error?.message);
        const errorMsg = detailed ? String(detailed) : `Generation ${parentData.status}`;
        optionsRef.current.onError?.(errorMsg);
      }

      clearAllTimers();
      setIsPolling(false);
      setPollingId(null);
    } catch (error) {
      logger.error('Error processing completion', error, { generationId });
      optionsRef.current.onError?.('Failed to fetch generation results');
    }
  }, [clearAllTimers]);

  /**
   * Tier 3: Exponential backoff polling (fallback)
   */
  const startFallbackPolling = useCallback((generationId: string) => {
    logger.info('Starting fallback polling', { generationId } as any);
    setConnectionTier('polling');
    
    toast.info('Using slower updates mode', {
      description: 'Real-time updates unavailable, polling for status',
      duration: 3000,
    });

    const intervals = [3000, 5000, 10000, 30000];
    let attempt = 0;

    const poll = async () => {
      try {
        const { data, error } = await supabase
          .from('generations')
          .select('status, id, provider_response')
          .eq('id', generationId)
          .single();

        if (error) throw error;

        if (data?.status === 'completed' || data?.status === 'failed' || data?.status === 'error') {
          await processCompletion(generationId);
          return;
        }

        // Schedule next poll with exponential backoff
        const interval = intervals[Math.min(attempt, intervals.length - 1)];
        attempt++;
        
        const timeout = setTimeout(poll, interval);
        timeoutsRef.current.push(timeout);
      } catch (error) {
        logger.error('Polling error', error, { generationId });
        optionsRef.current.onError?.('Failed to check generation status');
      }
    };

    poll();
  }, [processCompletion]);

  /**
   * Tier 1: User-scoped Realtime subscription (primary)
   */
  const setupRealtimeSubscription = useCallback((userId: string, generationId: string) => {
    if (!userId) return;

    logger.info('Setting up Realtime subscription', { userId, generationId } as any);

    // Create user-scoped channel
    const channel = supabase.channel(`user-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'generations',
          filter: `user_id=eq.${userId}`
        },
        (payload: any) => {
          logger.info('Realtime update received', { 
            generationId: payload.new.id,
            status: payload.new.status 
          } as any);

          if (payload.new.id === generationId && 
              (payload.new.status === 'completed' || payload.new.status === 'failed' || payload.new.status === 'error')) {
            processCompletion(payload.new.id);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.info('Realtime connected', { userId } as any);
          setRealtimeConnected(true);
          setConnectionTier('realtime');
          
          // Clear fallback timeout
          if (fallbackTimeoutRef.current) {
            clearTimeout(fallbackTimeoutRef.current);
            fallbackTimeoutRef.current = null;
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          logger.warn('Realtime connection failed', { status } as any);
          setRealtimeConnected(false);
        }
      });

    channelRef.current = channel;

    // Set fallback timeout (5 seconds)
    fallbackTimeoutRef.current = setTimeout(() => {
      if (!realtimeConnected) {
        logger.warn('Realtime timeout, falling back to polling', { generationId } as any);
        startFallbackPolling(generationId);
      }
    }, 5000);
  }, [processCompletion, startFallbackPolling, realtimeConnected]);

  /**
   * Start polling for a generation
   */
  const startPolling = useCallback((generationId: string) => {
    if (!user?.id) {
      logger.error('Cannot start polling: no user ID');
      return;
    }

    logger.info('Starting hybrid polling', { generationId, userId: user.id } as any);
    
    completedGenerationsRef.current.clear();
    setIsPolling(true);
    setPollingId(generationId);
    
    // Try Realtime first
    setupRealtimeSubscription(user.id, generationId);
  }, [user?.id, setupRealtimeSubscription]);

  /**
   * Stop polling
   */
  const stopPolling = useCallback(() => {
    logger.info('Stopping polling');
    
    clearAllTimers();
    
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    
    setIsPolling(false);
    setPollingId(null);
    setRealtimeConnected(false);
    setConnectionTier('disconnected');
    completedGenerationsRef.current.clear();
  }, [clearAllTimers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      clearAllTimers();
    };
  }, [clearAllTimers]);

  return {
    startPolling,
    stopPolling,
    isPolling,
    pollingId,
    connectionTier,
    realtimeConnected,
  };
};
