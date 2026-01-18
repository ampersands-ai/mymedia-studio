/**
 * useOutputProcessor - Progressive polling hook for generation outputs
 * 
 * Uses direct database polling (same pattern as History page) for reliable
 * output display. Polls every 2s for first 3 minutes, then 7s for up to 30 minutes.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { getModel } from "@/lib/models/registry";
import type { GenerationOutput, ProcessorStatus } from "@/lib/output/types";
import { 
  POLLING_INTERVAL_FAST_MS, 
  POLLING_INTERVAL_SLOW_MS,
  FAST_POLLING_DURATION_MS,
  MAX_POLLING_DURATION_MS 
} from "@/lib/output/constants";

interface UseOutputProcessorOptions {
  onComplete?: (outputs: GenerationOutput[], parentId: string) => void;
  onError?: (error: string) => void;
  onApiCallStarted?: (timestamp: number) => void;
  onBackgroundTransition?: (generationId: string) => void;
}

interface UseOutputProcessorReturn {
  outputs: GenerationOutput[];
  isProcessing: boolean;
  status: ProcessorStatus;
  error: string | null;
  startProcessing: (generationId: string) => void;
  stopProcessing: () => void;
}

export const useOutputProcessor = (options: UseOutputProcessorOptions = {}): UseOutputProcessorReturn => {
  const { user } = useAuth();
  const [outputs, setOutputs] = useState<GenerationOutput[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<ProcessorStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pollingStartTimeRef = useRef<number>(0);
  const generationIdRef = useRef<string | null>(null);
  const optionsRef = useRef(options);
  const hasCompletedRef = useRef(false);
  const apiCallStartedNotifiedRef = useRef(false);

  // Keep options ref updated
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Get current interval based on elapsed time
  const getCurrentInterval = useCallback((elapsedMs: number): number => {
    return elapsedMs < FAST_POLLING_DURATION_MS 
      ? POLLING_INTERVAL_FAST_MS 
      : POLLING_INTERVAL_SLOW_MS;
  }, []);

  const clearPolling = useCallback(() => {
    if (pollingTimerRef.current) {
      clearTimeout(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  }, []);

  const fetchOutputs = useCallback(async (generationId: string): Promise<{ outputs: GenerationOutput[] | null; apiCallStartedAt: string | null }> => {
    // Fetch parent generation
    const { data: parent, error: parentError } = await supabase
      .from('generations')
      .select('id, status, storage_path, type, model_id, model_record_id, provider_response, is_batch_output, api_call_started_at')
      .eq('id', generationId)
      .single();

    if (parentError || !parent) {
      logger.error('[useOutputProcessor] Failed to fetch parent', parentError);
      return { outputs: null, apiCallStartedAt: null };
    }

    // Handle failed/error status
    if (parent.status === 'failed' || parent.status === 'error') {
      const pr = (parent.provider_response || {}) as Record<string, unknown>;
      const errorObj = pr.error as { message?: string } | undefined;
      const detailed = pr.error || pr.message || pr.error_message || pr.detail || errorObj?.message;
      const errorMsg = detailed ? String(detailed) : `Generation ${parent.status}`;
      throw new Error(errorMsg);
    }

    // Not completed yet
    if (parent.status !== 'completed') {
      return { outputs: null, apiCallStartedAt: parent.api_call_started_at };
    }

    // Fetch children with storage_path (same query as History page)
    const { data: children } = await supabase
      .from('generations')
      .select('id, storage_path, output_index, provider_task_id, model_id, model_record_id, status')
      .eq('parent_generation_id', generationId)
      .eq('status', 'completed')
      .not('storage_path', 'is', null)
      .order('output_index');

    const outputList: GenerationOutput[] = [];

    // Add children with storage_path
    if (children && children.length > 0) {
      for (const child of children) {
        if (!child.storage_path || !child.model_record_id) continue;

        let provider = '';
        let modelFamily = '';
        try {
          const model = getModel(child.model_record_id);
          provider = model.MODEL_CONFIG.provider;
          modelFamily = model.MODEL_CONFIG.modelFamily || '';
        } catch {
          // Ignore registry errors
        }

        outputList.push({
          id: child.id,
          storage_path: child.storage_path,
          type: parent.type,
          output_index: child.output_index || 0,
          provider_task_id: child.provider_task_id || '',
          model_id: child.model_id || '',
          provider,
          modelFamily,
        });
      }
    }

    // If parent has storage_path and no children, use parent directly
    if (outputList.length === 0 && parent.storage_path) {
      let provider = '';
      let modelFamily = '';
      if (parent.model_record_id) {
        try {
          const model = getModel(parent.model_record_id);
          provider = model.MODEL_CONFIG.provider;
          modelFamily = model.MODEL_CONFIG.modelFamily || '';
        } catch {
          // Ignore
        }
      }

      outputList.push({
        id: parent.id,
        storage_path: parent.storage_path,
        type: parent.type,
        output_index: 0,
        model_id: parent.model_id || '',
        provider,
        modelFamily,
      });
    }

    return { outputs: outputList.length > 0 ? outputList : null, apiCallStartedAt: parent.api_call_started_at };
  }, []);

  const pollForOutputs = useCallback(async () => {
    const generationId = generationIdRef.current;
    if (!generationId || hasCompletedRef.current) return;

    const elapsedMs = Date.now() - pollingStartTimeRef.current;

    // Check for 180-minute max polling duration - gracefully transition to background
    if (elapsedMs >= MAX_POLLING_DURATION_MS) {
      logger.info('[useOutputProcessor] Max polling duration reached, transitioning to background', { generationId } as any);
      clearPolling();
      // Don't treat as error - generation continues in background
      setStatus('idle');
      setIsProcessing(false);
      // Notify parent component of background transition
      optionsRef.current.onBackgroundTransition?.(generationId);
      return;
    }

    try {
      const result = await fetchOutputs(generationId);
      
      // Notify when API call started (for progress tracking)
      if (result.apiCallStartedAt && !apiCallStartedNotifiedRef.current && optionsRef.current.onApiCallStarted) {
        apiCallStartedNotifiedRef.current = true;
        optionsRef.current.onApiCallStarted(new Date(result.apiCallStartedAt).getTime());
      }
      
      if (result.outputs && result.outputs.length > 0) {
        logger.info('[useOutputProcessor] Outputs found', { 
          generationId, 
          count: result.outputs.length,
          elapsedMs 
        } as any);
        
        hasCompletedRef.current = true;
        clearPolling();
        setOutputs(result.outputs);
        setStatus('completed');
        setIsProcessing(false);
        optionsRef.current.onComplete?.(result.outputs, generationId);
      } else {
        // Schedule next poll with dynamic interval
        const nextInterval = getCurrentInterval(elapsedMs);
        pollingTimerRef.current = setTimeout(pollForOutputs, nextInterval);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      logger.error('[useOutputProcessor] Fetch error', { generationId, error: errorMsg } as any);
      
      hasCompletedRef.current = true;
      clearPolling();
      setError(errorMsg);
      setStatus('error');
      setIsProcessing(false);
      optionsRef.current.onError?.(errorMsg);
    }
  }, [fetchOutputs, clearPolling, getCurrentInterval]);

  const startProcessing = useCallback((generationId: string) => {
    if (!user?.id) {
      logger.error('[useOutputProcessor] Cannot start: no user ID');
      setError('User not authenticated');
      return;
    }

    // Clean up any existing polling
    clearPolling();

    logger.info('[useOutputProcessor] Starting polling', { generationId, userId: user.id } as any);
    
    // Reset state
    generationIdRef.current = generationId;
    pollingStartTimeRef.current = Date.now();
    hasCompletedRef.current = false;
    apiCallStartedNotifiedRef.current = false;
    setOutputs([]);
    setError(null);
    setIsProcessing(true);
    setStatus('polling');

    // Immediate first check, then setTimeout schedules next polls
    pollForOutputs();
  }, [user?.id, clearPolling, pollForOutputs]);

  const stopProcessing = useCallback(() => {
    logger.info('[useOutputProcessor] Stopping');
    clearPolling();
    generationIdRef.current = null;
    hasCompletedRef.current = false;
    setIsProcessing(false);
    setStatus('idle');
  }, [clearPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearPolling();
    };
  }, [clearPolling]);

  return {
    outputs,
    isProcessing,
    status,
    error,
    startProcessing,
    stopProcessing,
  };
};
