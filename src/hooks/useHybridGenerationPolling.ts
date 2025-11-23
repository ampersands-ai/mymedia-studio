import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { POLLING_CONFIG } from "@/constants/generation";
import type { GenerationOutput } from "./useGenerationState";
import { logger } from "@/lib/logger";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { getModel } from "@/lib/models/registry";

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
  const stallGuardRef = useRef<NodeJS.Timeout | null>(null);
  const childDebounceRef = useRef<NodeJS.Timeout | null>(null);
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
    if (stallGuardRef.current) {
      clearTimeout(stallGuardRef.current);
      stallGuardRef.current = null;
    }
    if (childDebounceRef.current) {
      clearTimeout(childDebounceRef.current);
      childDebounceRef.current = null;
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
        .select("id, status, storage_path, type, created_at, provider_task_id, model_id, model_record_id, provider_response")
        .eq('id', generationId)
        .single();

      if (error) throw error;

      // ADR 007: Get provider from registry
      let parentProvider = '';
      try {
        const model = getModel(parentData.model_record_id);
        parentProvider = model.MODEL_CONFIG.provider;
      } catch (e) {
        console.warn(`Failed to load model from registry:`, parentData.model_record_id, e);
      }

      if (parentData.status === 'completed') {
        const { data: childrenData } = await supabase
          .from('generations')
          .select("id, storage_path, output_index, provider_task_id, model_id, model_record_id")
          .eq('parent_generation_id', parentData.id)
          .order('output_index');

        const outputs: GenerationOutput[] = [];

        // Add child generations (batch outputs)
        if (childrenData && childrenData.length > 0) {
          outputs.push(...childrenData
            .filter((child: any) => child.storage_path) // Only include children with valid storage_path
            .map((child: any) => {
              // ADR 007: Get provider from registry for each child
              let childProvider = '';
              try {
                const model = getModel(child.model_record_id);
                childProvider = model.MODEL_CONFIG.provider;
              } catch (e) {
                console.warn(`Failed to load model from registry:`, child.model_record_id, e);
              }

              return {
                id: child.id,
                storage_path: child.storage_path,
                type: parentData.type,
                output_index: child.output_index || 0,
                provider_task_id: child.provider_task_id || '',
                model_id: child.model_id || '',
                provider: childProvider,
              };
            }));
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
            provider: parentProvider,
          });
        }

        logger.info('Outputs prepared for completion callback', {
          totalOutputs: outputs.length,
          outputIds: outputs.map(o => o.id),
          hasStoragePaths: outputs.every(o => !!o.storage_path)
        } as any);

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

    // More responsive intervals: 2s → 3s → 5s → 8s (max)
    const intervals = [2000, 3000, 5000, 8000];
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

        // Schedule next poll with exponential backoff (max 8s instead of 30s)
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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'generations',
          filter: `parent_generation_id=eq.${generationId}`
        },
        (payload: any) => {
          logger.info('Child generation event', { 
            childId: payload.new?.id,
            hasStoragePath: !!payload.new?.storage_path 
          } as any);

          // If child has output, parent might be complete soon
          if (payload.new?.storage_path) {
            // Debounce to allow parent to flip to completed
            if (childDebounceRef.current) {
              clearTimeout(childDebounceRef.current);
            }
            childDebounceRef.current = setTimeout(() => {
              logger.info('Child output detected, processing completion', { generationId } as any);
              processCompletion(generationId);
            }, 1000);
          }

          // Reset stall guard on any child activity
          if (stallGuardRef.current) {
            clearTimeout(stallGuardRef.current);
            stallGuardRef.current = setTimeout(() => {
              logger.warn('Stall guard triggered, switching to polling', { generationId } as any);
              startFallbackPolling(generationId);
            }, 20000);
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
  const startPolling = useCallback(async (generationId: string) => {
    if (!user?.id) {
      logger.error('Cannot start polling: no user ID');
      return;
    }

    logger.info('Starting hybrid polling', { generationId, userId: user.id } as any);
    
    completedGenerationsRef.current.clear();
    setIsPolling(true);
    setPollingId(generationId);
    
    // Immediate status check - catch already-completed generations
    try {
      const { data, error } = await supabase
        .from('generations')
        .select('status')
        .eq('id', generationId)
        .single();

      if (!error && data && ['completed', 'failed', 'error'].includes(data.status)) {
        logger.info('Generation already complete, processing immediately', { 
          generationId, 
          status: data.status 
        } as any);
        processCompletion(generationId);
        return;
      }
    } catch (err) {
      logger.error('Immediate status check failed', err as any);
    }
    
    // Set up stall guard (20 seconds)
    stallGuardRef.current = setTimeout(() => {
      logger.warn('Stall guard triggered, switching to polling', { generationId } as any);
      startFallbackPolling(generationId);
    }, 20000);

    // Try Realtime first
    setupRealtimeSubscription(user.id, generationId);
  }, [user?.id, setupRealtimeSubscription, processCompletion, startFallbackPolling]);

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
