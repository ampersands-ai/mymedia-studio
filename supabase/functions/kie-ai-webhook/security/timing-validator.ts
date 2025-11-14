/**
 * Security Layer 3: Dynamic Timing Validation
 * Detects impossibly fast webhooks (replay attacks) and late arrivals
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { webhookLogger } from "../../_shared/logger.ts";

export interface TimingResult {
  success: boolean;
  error?: string;
  statusCode?: number;
}

export async function validateTiming(
  generation: any,
  supabase: SupabaseClient
): Promise<TimingResult> {
  const estimatedSeconds = generation.ai_models?.estimated_time_seconds || 300;
  const MIN_PROCESSING_TIME = 2.85 * 1000; // 2.85 seconds (aggressive anti-replay)
  const MAX_PROCESSING_TIME = estimatedSeconds * 2.5 * 1000; // 2.5x multiplier

  const processingTime = Date.now() - new Date(generation.created_at).getTime();

  webhookLogger.info('Timing analysis', {
    taskId: generation.provider_task_id,
    generationId: generation.id,
    model: generation.ai_models?.model_name,
    estimated_seconds: estimatedSeconds,
    actual_processing_seconds: Math.round(processingTime / 1000),
    min_threshold_seconds: MIN_PROCESSING_TIME / 1000,
    max_threshold_seconds: MAX_PROCESSING_TIME / 1000
  });

  // Reject impossibly fast webhooks (< 2.85s = replay/automation attack)
  if (processingTime < MIN_PROCESSING_TIME) {
    webhookLogger.failure(generation.id, 'SECURITY LAYER 3 FAILED: Webhook too fast - possible replay attack', {
      taskId: generation.provider_task_id,
      generation_id: generation.id,
      processing_ms: processingTime,
      threshold_ms: MIN_PROCESSING_TIME,
      model: generation.ai_models?.model_name,
      status: 'rejected_timing'
    });
    
    await supabase.from('audit_logs').insert({
      user_id: generation.user_id,
      action: 'webhook_rejected_timing',
      metadata: {
        reason: 'too_fast',
        generation_id: generation.id,
        task_id: generation.provider_task_id,
        processing_seconds: processingTime / 1000,
        minimum_threshold: MIN_PROCESSING_TIME / 1000,
        model_id: generation.model_id
      }
    });
    
    return {
      success: false,
      error: 'Request processing too fast - potential security issue',
      statusCode: 429
    };
  }

  // Log late webhooks (don't reject - might be legitimate queue delays)
  if (processingTime > MAX_PROCESSING_TIME) {
    const severityLevel = processingTime > (MAX_PROCESSING_TIME * 2) ? 'high' : 'medium';
    
    webhookLogger.info(`Late webhook detected [${severityLevel} severity]`, {
      taskId: generation.provider_task_id,
      generation_id: generation.id,
      processing_seconds: Math.round(processingTime / 1000),
      max_threshold_seconds: Math.round(MAX_PROCESSING_TIME / 1000),
      model: generation.ai_models?.model_name,
      severity: severityLevel,
      status: 'late_arrival'
    });
    
    await supabase.from('audit_logs').insert({
      user_id: generation.user_id,
      action: 'webhook_late_arrival',
      metadata: {
        severity: severityLevel,
        generation_id: generation.id,
        task_id: generation.provider_task_id,
        expected_max_seconds: MAX_PROCESSING_TIME / 1000,
        actual_seconds: processingTime / 1000,
        variance_seconds: (processingTime - MAX_PROCESSING_TIME) / 1000,
        model_id: generation.model_id
      }
    });
  }
  
  webhookLogger.info('Layer 3 passed: Webhook timing validated', {
    taskId: generation.provider_task_id,
    generationId: generation.id
  });
  return { success: true };
}
