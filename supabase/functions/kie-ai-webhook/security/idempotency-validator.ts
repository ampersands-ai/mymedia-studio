/**
 * Security Layer 4: Idempotency Protection
 * Prevents duplicate webhook processing using event tracking
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

export interface IdempotencyResult {
  success: boolean;
  isDuplicate?: boolean;
  error?: string;
}

export async function validateIdempotency(
  taskId: string,
  callbackType: string,
  generation: any,
  supabase: SupabaseClient
): Promise<IdempotencyResult> {
  const idempotencyKey = `${taskId}-${callbackType}`;
  
  const { data: existingEvent, error: eventCheckError } = await supabase
    .from('webhook_events')
    .select('id')
    .eq('event_type', 'kie_ai_callback')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();

  if (existingEvent) {
    console.warn('⚠️ SECURITY LAYER 4: Duplicate webhook detected (idempotency check)', {
      taskId,
      callbackType,
      generation_id: generation.id,
      previous_event_id: existingEvent.id
    });
    
    await supabase.from('audit_logs').insert({
      user_id: generation.user_id,
      action: 'webhook_duplicate_blocked',
      metadata: {
        generation_id: generation.id,
        task_id: taskId,
        callback_type: callbackType,
        previous_event_id: existingEvent.id
      }
    });
    
    return {
      success: true,
      isDuplicate: true,
      error: 'Webhook already processed'
    };
  }

  // Record this webhook event for future idempotency checks
  const { error: eventInsertError } = await supabase
    .from('webhook_events')
    .insert({
      event_type: 'kie_ai_callback',
      idempotency_key: idempotencyKey
    });

  if (eventInsertError) {
    console.error('Failed to record webhook event:', eventInsertError);
    // Continue processing - idempotency is nice-to-have, not critical
  }
  
  console.log('✅ Layer 4 passed: Idempotency check completed');
  return { success: true, isDuplicate: false };
}
