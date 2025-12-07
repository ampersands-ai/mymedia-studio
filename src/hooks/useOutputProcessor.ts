/**
 * useOutputProcessor - Simplified polling hook for generation outputs
 * 
 * Uses direct database polling (same pattern as History page) for reliable
 * output display. Polls every 2 seconds for up to 90 seconds.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { getModel } from "@/lib/models/registry";
import type { GenerationOutput, ProcessorStatus } from "@/lib/output/types";
import { POLLING_INTERVAL_MS, POLLING_MAX_ATTEMPTS } from "@/lib/output/constants";

interface UseOutputProcessorOptions {
  onComplete?: (outputs: GenerationOutput[], parentId: string) => void;
  onError?: (error: string) => void;
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
  const pollAttemptsRef = useRef(0);
  const generationIdRef = useRef<string | null>(null);
  const optionsRef = useRef(options);
  const hasCompletedRef = useRef(false);

  // Keep options ref updated
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const clearPolling = useCallback(() => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  }, []);

  const fetchOutputs = useCallback(async (generationId: string): Promise<GenerationOutput[] | null> => {
    // Fetch parent generation
    const { data: parent, error: parentError } = await supabase
      .from('generations')
      .select('id, status, storage_path, type, model_id, model_record_id, provider_response, is_batch_output')
      .eq('id', generationId)
      .single();

    if (parentError || !parent) {
      logger.error('[useOutputProcessor] Failed to fetch parent', parentError);
      return null;
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
      return null;
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
        try {
          const model = getModel(child.model_record_id);
          provider = model.MODEL_CONFIG.provider;
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
        });
      }
    }

    // If parent has storage_path and no children, use parent directly
    if (outputList.length === 0 && parent.storage_path) {
      let provider = '';
      if (parent.model_record_id) {
        try {
          const model = getModel(parent.model_record_id);
          provider = model.MODEL_CONFIG.provider;
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
      });
    }

    return outputList.length > 0 ? outputList : null;
  }, []);

  const pollForOutputs = useCallback(async () => {
    const generationId = generationIdRef.current;
    if (!generationId || hasCompletedRef.current) return;

    pollAttemptsRef.current++;

    if (pollAttemptsRef.current >= POLLING_MAX_ATTEMPTS) {
      logger.error('[useOutputProcessor] Max polling attempts reached', { generationId } as any);
      clearPolling();
      setError('Generation timed out');
      setStatus('error');
      setIsProcessing(false);
      optionsRef.current.onError?.('Generation timed out');
      return;
    }

    try {
      const result = await fetchOutputs(generationId);
      
      if (result && result.length > 0) {
        logger.info('[useOutputProcessor] Outputs found', { 
          generationId, 
          count: result.length 
        } as any);
        
        hasCompletedRef.current = true;
        clearPolling();
        setOutputs(result);
        setStatus('completed');
        setIsProcessing(false);
        optionsRef.current.onComplete?.(result, generationId);
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
  }, [fetchOutputs, clearPolling]);

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
    pollAttemptsRef.current = 0;
    hasCompletedRef.current = false;
    setOutputs([]);
    setError(null);
    setIsProcessing(true);
    setStatus('polling');

    // Immediate first check
    pollForOutputs();

    // Start polling interval
    pollingTimerRef.current = setInterval(pollForOutputs, POLLING_INTERVAL_MS);
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
