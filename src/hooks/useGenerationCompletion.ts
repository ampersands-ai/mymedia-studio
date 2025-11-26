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
      logger.debug('Skipping duplicate completion processing', { generationId } as any);
      return;
    }
    completedGenerationsRef.current.add(generationId);

    try {
      logger.info('Processing completed generation', { generationId } as any);

      // Fetch parent and children
      const { data: parentData, error } = await supabase
        .from('generations')
        .select("id, status, storage_path, type, created_at, provider_task_id, model_id, model_record_id, provider_response, is_batch_output")
        .eq('id', generationId)
        .single();

      if (error) {
        logger.error('Failed to fetch parent generation', error, { generationId });
        throw error;
      }

      if (!parentData) {
        logger.error('Parent generation not found', new Error('Parent not found'), { generationId });
        throw new Error('Parent generation not found');
      }

      logger.info('Parent generation fetched', {
        generationId,
        status: parentData.status,
        hasStoragePath: !!parentData.storage_path,
        isBatchOutput: parentData.is_batch_output
      } as any);

      // ADR 007: Get provider from registry
      let parentProvider = '';
      try {
        const model = getModel(parentData.model_record_id);
        parentProvider = model.MODEL_CONFIG.provider;
      } catch (e) {
        logger.warn('Failed to load model from registry', { modelRecordId: parentData.model_record_id, error: e });
      }

      if (parentData.status === 'completed') {
        logger.info('Parent is completed, fetching child generations', {
          generationId,
          parentId: parentData.id,
          isBatchOutput: parentData.is_batch_output
        } as any);

        const { data: childrenData, error: childrenError } = await supabase
          .from('generations')
          .select("id, storage_path, output_index, provider_task_id, model_id, model_record_id, status")
          .eq('parent_generation_id', parentData.id)
          .eq('status', 'completed')
          .order('output_index');

        if (childrenError) {
          logger.error('Failed to fetch child generations', childrenError, { generationId, parentId: parentData.id });
        } else {
          logger.info('Child generations query result', {
            generationId,
            parentId: parentData.id,
            childrenCount: childrenData?.length || 0,
            children: childrenData?.map(c => ({ id: c.id, hasStoragePath: !!c.storage_path, outputIndex: c.output_index }))
          } as any);
        }

        const outputs: GenerationOutput[] = [];

        // Add child generations (batch outputs)
        if (childrenData && childrenData.length > 0) {
          const childrenWithStorage = childrenData.filter((child: ChildGeneration) => child.storage_path);
          
          logger.info('Found child generations', {
            generationId,
            totalChildren: childrenData.length,
            childrenWithStorage: childrenWithStorage.length,
            childIds: childrenData.map((c: ChildGeneration) => c.id)
          } as any);

          outputs.push(...childrenWithStorage
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
        } else if (parentData.is_batch_output) {
          // For batch outputs, if no children found, wait a bit and retry once
          logger.warn('No child generations found for batch output parent, retrying...', {
            generationId,
            parentId: parentData.id,
            parentStoragePath: parentData.storage_path
          } as any);
          
          // Wait 1 second and retry once
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const { data: retryChildrenData, error: retryError } = await supabase
            .from('generations')
            .select("id, storage_path, output_index, provider_task_id, model_id, model_record_id, status")
            .eq('parent_generation_id', parentData.id)
            .eq('status', 'completed')
            .order('output_index');
          
          if (retryError) {
            logger.error('Retry failed to fetch child generations', retryError, { generationId, parentId: parentData.id });
          } else if (retryChildrenData && retryChildrenData.length > 0) {
            const retryChildrenWithStorage = retryChildrenData.filter((child: ChildGeneration) => child.storage_path);
            
            logger.info('Found child generations on retry', {
              generationId,
              totalChildren: retryChildrenData.length,
              childrenWithStorage: retryChildrenWithStorage.length
            } as any);
            
            outputs.push(...retryChildrenWithStorage
              .map((child: ChildGeneration) => {
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
          } else {
            logger.error('Still no child generations found after retry for batch output', {
              generationId,
              parentId: parentData.id
            } as any);
          }
        } else {
          logger.info('No child generations found (not a batch output)', {
            generationId,
            parentId: parentData.id,
            parentStoragePath: parentData.storage_path
          } as any);
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
