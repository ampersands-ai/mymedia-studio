/**
 * Async Handler Module
 * Handles webhook-based asynchronous generation flow
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../../_shared/edge-logger.ts";
import { refundTokens } from "../services/credit-service.ts";
import type { Model } from "./validation.ts";

export interface AsyncProviderResponse {
  metadata?: {
    task_id?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Check if response is from a webhook-based provider
 */
export function isWebhookProvider(
  provider: string,
  response: AsyncProviderResponse
): boolean {
  return (provider === 'kie_ai' || provider === 'runware') && !!response.metadata?.task_id;
}

/**
 * Save provider task ID for async tracking
 */
export async function saveProviderTaskId(
  supabase: SupabaseClient,
  generationId: string,
  taskId: string,
  providerRequest: Record<string, unknown>,
  providerResponse: Record<string, unknown> | undefined,
  userId: string,
  tokenCost: number,
  isTestMode: boolean,
  logger: EdgeLogger,
  model: Model
): Promise<{ success: true } | { success: false; error: string }> {
  logger.info('CRITICAL: Saving provider_task_id for async generation', {
    userId,
    metadata: { 
      taskId, 
      generationId,
      model_id: model.id,
      provider: model.provider
    }
  });

  const { error: updateError, data: updateData } = await supabase
    .from('generations')
    .update({
      provider_task_id: taskId,
      status: 'processing',
      provider_request: providerRequest,
      provider_response: providerResponse
    })
    .eq('id', generationId)
    .select('id, provider_task_id');

  if (updateError) {
    logger.error('CRITICAL: Failed to save provider_task_id', updateError instanceof Error ? updateError : new Error(String(updateError) || 'Database error'), {
      userId,
      metadata: { 
        taskId, 
        generation_id: generationId,
        error_message: updateError?.message
      }
    });
    
    // Refund tokens since the generation cannot be tracked
    if (!isTestMode) {
      await refundTokens(supabase, userId, tokenCost, logger, 'task_id_save_failed');
    }
    
    // Update generation status to failed
    await supabase
      .from('generations')
      .update({
        status: 'failed',
        provider_response: { 
          error: 'Failed to save task ID - generation cannot be tracked',
          original_task_id: taskId
        }
      })
      .eq('id', generationId);
    
    return { success: false, error: 'Failed to save task ID - generation cannot be tracked. Tokens have been refunded.' };
  }

  // Verify the update succeeded
  if (!updateData || updateData.length === 0) {
    logger.error('CRITICAL: provider_task_id save returned no data', undefined, {
      userId,
      metadata: { taskId, generation_id: generationId }
    });
  } else {
    logger.info('provider_task_id saved successfully', {
      userId,
      metadata: { 
        taskId, 
        generation_id: generationId,
        verified_task_id: updateData[0].provider_task_id
      }
    });
  }

  return { success: true };
}

/**
 * Build async generation response (202 Accepted)
 */
export function buildAsyncResponse(
  generationId: string,
  tokenCost: number,
  contentType: string,
  enhanced: boolean,
  responseHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      id: generationId,
      generation_id: generationId,
      status: 'processing',
      tokens_used: tokenCost,
      content_type: contentType,
      enhanced,
      is_async: true,
      message: 'Generation started. Check back soon for results.'
    }),
    { status: 202, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
  );
}
