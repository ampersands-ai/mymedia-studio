/**
 * Security Layer 2: Verify Token Validation
 * Validates per-generation verify token and retrieves generation data
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

export interface VerifyTokenResult {
  success: boolean;
  generation?: any;
  error?: string;
  statusCode?: number;
}

export async function validateVerifyToken(
  url: URL,
  taskId: string,
  supabase: SupabaseClient
): Promise<VerifyTokenResult> {
  const verifyToken = url.searchParams.get('verify');
  if (!verifyToken) {
    console.error('🚨 SECURITY LAYER 2 FAILED: Missing verify token');
    return {
      success: false,
      error: 'Missing verify token',
      statusCode: 400
    };
  }
  
  // Fetch generation with retry logic for race conditions
  let generation: any = null;
  let findError: any = null;
  let retryCount = 0;
  const maxRetries = 3;
  
  while (retryCount <= maxRetries) {
    const { data, error } = await supabase
      .from('generations')
      .select('*, ai_models(id, model_name, estimated_time_seconds)')
      .eq('provider_task_id', taskId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (data) {
      generation = data;
      break;
    }
    
    findError = error;
    
    if (retryCount < maxRetries) {
      console.log(`⏳ Generation not found, retry ${retryCount + 1}/${maxRetries} after delay...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
    }
    
    retryCount++;
  }

  if (findError || !generation) {
    console.error('Security: Rejected webhook for unknown task:', taskId, findError);
    return {
      success: false,
      error: 'Invalid task ID',
      statusCode: 404
    };
  }
  
  // Validate verify token matches stored token
  const storedToken = generation.settings?._webhook_token;
  if (!storedToken || storedToken !== verifyToken) {
    console.error('🚨 SECURITY LAYER 2 FAILED: Invalid verify token', {
      generation_id: generation.id,
      task_id: taskId,
      expected_preview: storedToken?.substring(0, 8) + '...',
      received_preview: verifyToken.substring(0, 8) + '...'
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
  if (generation.status === 'cancelled') {
    console.log('⏹️ Generation was cancelled by user - ignoring webhook', {
      generation_id: generation.id,
      task_id: taskId
    });
    return {
      success: false,
      error: 'Generation was cancelled by user',
      statusCode: 200 // Return 200 to prevent retries
    };
  }
  
  // Check if already processed
  if (generation.status !== 'pending' && generation.status !== 'processing') {
    console.error('Security: Rejected webhook for already processed task:', taskId, 'Status:', generation.status);
    return {
      success: false,
      error: 'Generation already processed',
      statusCode: 400
    };
  }
  
  console.log('✅ Layer 2 passed: Verify token validated');
  return { success: true, generation };
}
