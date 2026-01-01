/**
 * Audit Service Module
 * Handles audit logging for generation events
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type GenerationAction = 
  | 'generation_created'
  | 'generation_completed'
  | 'generation_failed'
  | 'generation_canceled';

export interface GenerationAuditData {
  modelId: string;
  tokensUsed?: number;
  tokensRefunded?: number;
  contentType?: string;
  durationMs?: number;
  error?: string;
  reason?: string;
}

/**
 * Log generation event to audit logs
 */
export async function logGenerationEvent(
  supabase: SupabaseClient,
  userId: string,
  generationId: string,
  action: GenerationAction,
  data: GenerationAuditData
): Promise<void> {
  const metadata: Record<string, unknown> = {
    model_id: data.modelId,
  };

  if (data.tokensUsed !== undefined) {
    metadata.tokens_used = data.tokensUsed;
  }
  if (data.tokensRefunded !== undefined) {
    metadata.tokens_refunded = data.tokensRefunded;
  }
  if (data.contentType) {
    metadata.content_type = data.contentType;
  }
  if (data.durationMs !== undefined) {
    metadata.duration_ms = data.durationMs;
  }
  if (data.error) {
    metadata.error = data.error;
  }
  if (data.reason) {
    metadata.reason = data.reason;
  }

  await supabase.from('audit_logs').insert({
    user_id: userId,
    action,
    resource_type: 'generation',
    resource_id: generationId,
    metadata
  });
}

/**
 * Log token-related audit event
 */
export async function logTokenEvent(
  supabase: SupabaseClient,
  userId: string,
  action: 'tokens_deducted' | 'tokens_refunded',
  tokenAmount: number,
  tokensRemaining: number,
  modelId: string
): Promise<void> {
  await supabase.from('audit_logs').insert({
    user_id: userId,
    action,
    metadata: {
      [action === 'tokens_deducted' ? 'tokens_deducted' : 'tokens_refunded']: tokenAmount,
      tokens_remaining: tokensRemaining,
      model_id: modelId,
      model_name: modelId
    }
  });
}

/**
 * Update generation record with failure status
 */
export async function markGenerationFailed(
  supabase: SupabaseClient,
  generationId: string,
  error: string,
  providerRequest?: Record<string, unknown>
): Promise<void> {
  await supabase
    .from('generations')
    .update({
      status: 'failed',
      provider_request: providerRequest,
      provider_response: { 
        error,
        timestamp: new Date().toISOString()
      }
    })
    .eq('id', generationId);
}

/**
 * Update generation record with completion status
 */
export async function markGenerationCompleted(
  supabase: SupabaseClient,
  generationId: string,
  outputUrl: string,
  storagePath: string,
  fileSize: number | undefined,
  timingData: { setupDurationMs: number | null; apiDurationMs: number | null },
  providerRequest?: Record<string, unknown>,
  providerResponse?: Record<string, unknown>
): Promise<void> {
  await supabase
    .from('generations')
    .update({
      status: 'completed',
      output_url: outputUrl,
      storage_path: storagePath,
      file_size_bytes: fileSize,
      completed_at: new Date().toISOString(),
      setup_duration_ms: timingData.setupDurationMs,
      api_duration_ms: timingData.apiDurationMs,
      provider_request: providerRequest,
      provider_response: providerResponse
    })
    .eq('id', generationId);
}

/**
 * Trigger completion notification for long-running generations
 */
export async function triggerCompletionNotification(
  supabase: SupabaseClient,
  generationId: string,
  userId: string,
  generationDurationSeconds: number,
  logger: { info: (msg: string, ctx?: object) => void; warn: (msg: string, ctx?: object) => void }
): Promise<void> {
  if (generationDurationSeconds <= 30) {
    return; // Only notify for long-running generations
  }

  try {
    await supabase.functions.invoke('notify-generation-complete', {
      body: {
        generation_id: generationId,
        user_id: userId,
        generation_duration_seconds: generationDurationSeconds,
        type: 'generation'
      }
    });
    logger.info('Completion notification triggered', {
      userId,
      metadata: { generation_id: generationId, duration: generationDurationSeconds }
    } as object);
  } catch (notifyError) {
    logger.warn('Failed to trigger completion notification', {
      userId,
      metadata: { 
        generation_id: generationId, 
        error: notifyError instanceof Error ? notifyError.message : 'Unknown' 
      }
    } as object);
  }
}
