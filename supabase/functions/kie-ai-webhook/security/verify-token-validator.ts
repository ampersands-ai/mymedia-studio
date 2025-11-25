/**
 * Security Layer 2: Verify Token Validation
 * Validates per-generation verify token and retrieves generation data
 *
 * ADR 007: Uses model registry for metadata instead of database JOINs
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getModelConfig } from "../../_shared/registry/index.ts";

interface GenerationRecord {
  id: string;
  user_id: string;
  provider_task_id: string;
  status: string;
  model_record_id: string;
  settings?: {
    _webhook_token?: string;
  };
  modelMetadata?: {
    id: string;
    model_name: string;
    estimated_time_seconds: number;
  };
}

export interface VerifyTokenResult {
  success: boolean;
  generation?: GenerationRecord;
  error?: string;
  statusCode?: number;
}

import { webhookLogger } from "../../_shared/logger.ts";
import { GENERATION_STATUS } from "../../_shared/constants.ts";

export async function validateVerifyToken(
  url: URL,
  taskId: string,
  supabase: SupabaseClient
): Promise<VerifyTokenResult> {
  const verifyToken = url.searchParams.get('verify');
  if (!verifyToken) {
    webhookLogger.error('SECURITY LAYER 2 FAILED: Missing verify token', 'No verify token provided', {
      taskId,
      status: 'missing_verify_token'
    });
    return {
      success: false,
      error: 'Missing verify token',
      statusCode: 400
    };
  }
  
  // Fetch generation with retry logic for race conditions
  let generation: GenerationRecord | null = null;
  let findError: Error | null = null;
  let retryCount = 0;
  const maxRetries = 3;
  
  while (retryCount <= maxRetries) {
    const { data, error } = await supabase
      .from('generations')
      .select('*')
      .eq('provider_task_id', taskId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      // ADR 007: Enrich generation with model metadata from registry
      try {
        const modelConfig = await getModelConfig(data.model_record_id);
        data.modelMetadata = {
          id: modelConfig.id, // Provider's model ID (for Midjourney detection, etc.)
          model_name: modelConfig.modelName,
          estimated_time_seconds: modelConfig.estimatedTimeSeconds || 300
        };
      } catch (registryError) {
        webhookLogger.error('Failed to load model from registry', String(registryError), {
          model_record_id: data.model_record_id,
          taskId
        });
        // Continue without model metadata - validation will catch if needed
      }

      generation = data;
      break;
    }

    findError = error;

    if (retryCount < maxRetries) {
      webhookLogger.info(`Generation not found, retry ${retryCount + 1}/${maxRetries} after delay`, {
        taskId,
        retryCount: retryCount + 1,
        maxRetries
      });
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
    }

    retryCount++;
  }

  if (findError || !generation) {
    webhookLogger.error('Security: Rejected webhook for unknown task', findError?.message || 'Not found', {
      taskId,
      status: 'unknown_task'
    });
    return {
      success: false,
      error: 'Invalid task ID',
      statusCode: 404
    };
  }
  
  // Validate verify token matches stored token
  const storedToken = generation.settings?._webhook_token;
  if (!storedToken || storedToken !== verifyToken) {
    webhookLogger.failure(generation.id, 'SECURITY LAYER 2 FAILED: Invalid verify token', {
      generation_id: generation.id,
      task_id: taskId,
      expected_preview: storedToken?.substring(0, 8) + '...',
      received_preview: verifyToken.substring(0, 8) + '...',
      status: 'invalid_verify_token'
    });
    
    await supabase.from('audit_logs').insert({
      user_id: generation.user_id,
      action: 'webhook_rejected_token',
      metadata: {
        reason: 'invalid_verify_token',
        generation_id: generation.id,
        task_id: taskId
      }
    });
    
    return {
      success: false,
      error: 'Invalid verify token',
      statusCode: 403
    };
  }
  
  // Check if generation was cancelled
  if (generation.status === GENERATION_STATUS.CANCELLED) {
    webhookLogger.info('Generation was cancelled by user - ignoring webhook', {
      generation_id: generation.id,
      task_id: taskId,
      status: GENERATION_STATUS.CANCELLED
    });
    return {
      success: false,
      error: 'Generation was cancelled by user',
      statusCode: 200 // Return 200 to prevent retries
    };
  }
  
  // Check if already processed
  if (generation.status !== GENERATION_STATUS.PENDING && generation.status !== GENERATION_STATUS.PROCESSING) {
    webhookLogger.error('Security: Rejected webhook for already processed task', `Status: ${generation.status}`, {
      taskId,
      generation_id: generation.id,
      current_status: generation.status,
      status: 'already_processed'
    });
    return {
      success: false,
      error: 'Generation already processed',
      statusCode: 400
    };
  }
  
  webhookLogger.info('Layer 2 passed: Verify token validated', {
    generation_id: generation.id,
    task_id: taskId
  });
  return { success: true, generation };
}
