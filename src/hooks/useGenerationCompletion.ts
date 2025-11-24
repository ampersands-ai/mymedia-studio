import { useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { getModel } from "@/lib/models/registry";
import type { GenerationOutput } from "./useGenerationState";

interface ChildGeneration {
  id: string;
  storage_path: string | null;
  output_index: number | null;
  provider_task_id: string | null;
  model_id: string | null;
  model_record_id: string;
}

interface UseGenerationCompletionOptions {
  onComplete: (outputs: GenerationOutput[], parentId: string) => void;
  onError?: (error: string) => void;
}

/**
 * Hook for processing completed generations
 * Handles fetching outputs and calling completion callback
 */
export const useGenerationCompletion = ({ onComplete, onError }: UseGenerationCompletionOptions) => {
  const completedGenerationsRef = useRef<Set<string>>(new Set());

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
        logger.warn('Failed to load model from registry', { modelRecordId: parentData.model_record_id, error: e });
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
            .filter((child: ChildGeneration) => child.storage_path)
            .map((child: ChildGeneration) => {
              // ADR 007: Get provider from registry for each child
              let childProvider = '';
              try {
                const model = getModel(child.model_record_id);
                childProvider = model.MODEL_CONFIG.provider;
              } catch (e) {
                logger.warn('Failed to load model from registry', { modelRecordId: child.model_record_id, error: e });
              }

              return {
                id: child.id,
                storage_path: child.storage_path!,
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

        onComplete(outputs, parentData.id);
      } else if (parentData.status === 'failed' || parentData.status === 'error') {
        const pr = (parentData.provider_response || {}) as Record<string, unknown>;
        const errorObj = pr.error as { message?: string } | undefined;
        const detailed = pr.error || pr.message || pr.error_message || pr.detail || errorObj?.message;
        const errorMsg = detailed ? String(detailed) : `Generation ${parentData.status}`;
        onError?.(errorMsg);
      }
    } catch (error) {
      logger.error('Error processing completion', error, { generationId });
      onError?.('Failed to fetch generation results');
    }
  }, [onComplete, onError]);

  const checkCompletion = useCallback(async (generationId: string): Promise<{ isComplete: boolean; status: string | null }> => {
    try {
      const { data, error } = await supabase
        .from('generations')
        .select('status')
        .eq('id', generationId)
        .single();

      if (!error && data && ['completed', 'failed', 'error'].includes(data.status)) {
        return { isComplete: true, status: data.status };
      }

      return { isComplete: false, status: data?.status || null };
    } catch (err) {
      logger.error('Failed to check completion status', err as any);
      return { isComplete: false, status: null };
    }
  }, []);

  const clearCompletedCache = useCallback(() => {
    completedGenerationsRef.current.clear();
  }, []);

  return {
    processCompletion,
    checkCompletion,
    clearCompletedCache,
  };
};
