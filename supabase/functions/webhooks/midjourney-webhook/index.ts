/**
 * Midjourney Webhook Handler
 * Dedicated webhook for Midjourney generations via KIE AI
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { webhookLogger } from "../../_shared/logger.ts";
import { createSafeErrorResponse } from "../../_shared/error-handler.ts";
import { validateUrlToken } from "../../kie-ai-webhook/security/url-token-validator.ts";
import { validateVerifyToken } from "../../kie-ai-webhook/security/verify-token-validator.ts";
import { validateTiming } from "../../kie-ai-webhook/security/timing-validator.ts";
import { validateIdempotency } from "../../kie-ai-webhook/security/idempotency-validator.ts";
import { downloadContent } from "../../kie-ai-webhook/storage/content-downloader.ts";
import { uploadToStorage } from "../../kie-ai-webhook/storage/content-uploader.ts";
import { determineFileExtension } from "../../kie-ai-webhook/storage/mime-utils.ts";
import { orchestrateWorkflow } from "../../kie-ai-webhook/orchestration/workflow-orchestrator.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const webhookStartTime = Date.now();
  const startTime = Date.now();
  let generationId: string | undefined;
  let taskId: string | undefined;

  try {
    const url = new URL(req.url);

    // Layer 1: URL Token Security
    const layer1 = validateUrlToken(url);
    webhookLogger.security('url_token', layer1.success, { provider: 'midjourney' });
    if (!layer1.success) {
      return new Response(layer1.shouldReturn404 ? 'Not Found' : JSON.stringify({ error: layer1.error }), {
        status: layer1.shouldReturn404 ? 404 : 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const payload = await req.json();
    const { taskId: payloadTaskId, state, resultJson } = payload;
    taskId = payloadTaskId;

    if (!taskId) {
      webhookLogger.error('Missing taskId in webhook payload', new Error('No taskId'), { provider: 'midjourney' });
      return new Response(
        JSON.stringify({ error: 'Missing taskId in payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    webhookLogger.received('midjourney', taskId);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Layer 2: Database Verify Token
    const layer2 = await validateVerifyToken(url, taskId, supabase);
    webhookLogger.security('verify_token', layer2.success, { 
      taskId,
      provider: 'midjourney',
      error: layer2.error
    });
    if (!layer2.success) {
      return new Response(JSON.stringify({ error: layer2.error }), {
        status: layer2.statusCode || 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const generation = layer2.generation!;
    generationId = generation.id;

    // Layer 3: Timing Validation
    const layer3 = await validateTiming(generation, supabase);
    webhookLogger.security('timing', layer3.success, { generationId, error: layer3.error });
    if (!layer3.success) {
      return new Response(JSON.stringify({ error: layer3.error }), {
        status: layer3.statusCode || 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Layer 4: Idempotency Check
    const callbackType = state || 'completed';
    const layer4 = await validateIdempotency(taskId, callbackType, generation, supabase);
    webhookLogger.security('idempotency', layer4.success, { generationId, isDuplicate: layer4.isDuplicate });
    if (layer4.isDuplicate) {
      return new Response(JSON.stringify({ 
        message: 'Already processed',
        generation_id: generationId 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    webhookLogger.processing(generationId!, { 
      taskId,
      state,
      provider: 'midjourney'
    });

    // Handle failure state
    if (state === 'failed' || payload.errorMessage) {
      const errorMessage = payload.errorMessage || 'Midjourney generation failed';
      
      await supabase
        .from('generations')
        .update({
          status: 'failed',
          error_message: errorMessage,
          completed_at: new Date().toISOString()
        })
        .eq('id', generationId);

      // Refund tokens
      const tokensUsed = generation.tokens_used;
      if (tokensUsed) {
        await supabase.rpc('increment_tokens', {
          user_id_param: generation.user_id,
          amount: tokensUsed
        });
      }

      webhookLogger.failure(generationId!, errorMessage, { 
        taskId,
        provider: 'midjourney' 
      });

      return new Response(JSON.stringify({ 
        success: true,
        status: 'failed',
        error: errorMessage 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate complete results for image
    if (!resultJson?.imageUrl) {
      await supabase
        .from('generations')
        .update({ 
          status: 'processing',
          provider_response: payload 
        })
        .eq('id', generationId);

      webhookLogger.info('Partial callback - no imageUrl yet', { 
        generationId,
        taskId
      });

      return new Response(JSON.stringify({ 
        success: true,
        status: 'processing' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    webhookLogger.info('Processing Midjourney image', { 
      generationId: generationId!,
      imageUrl: resultJson.imageUrl 
    });

    const downloadResult = await downloadContent(resultJson.imageUrl);
    webhookLogger.download(resultJson.imageUrl, downloadResult.success, { generationId: generationId! });

    if (!downloadResult.success || !downloadResult.data) {
      throw new Error(`Failed to download: ${downloadResult.error}`);
    }

    const fileExtension = determineFileExtension(downloadResult.contentType || '', 'image');

    const uploadResult = await uploadToStorage(
      supabase,
      generation.user_id,
      generationId!,
      downloadResult.data,
      fileExtension,
      downloadResult.contentType || 'image/png'
    );

    webhookLogger.upload(uploadResult.storagePath || '', uploadResult.success, { generationId: generationId! });

    if (!uploadResult.success) {
      throw new Error(`Upload failed: ${uploadResult.error}`);
    }

    // Update generation record
    await supabase
      .from('generations')
      .update({
        status: 'completed',
        output_url: uploadResult.publicUrl,
        storage_path: uploadResult.storagePath,
        completed_at: new Date().toISOString(),
        provider_response: payload
      })
      .eq('id', generationId);

    // Trigger workflow orchestration
    await orchestrateWorkflow(generation, uploadResult.storagePath || null, false, supabase);

    // Log completion
    await supabase
      .from('audit_logs')
      .insert({
        user_id: generation.user_id,
        action: 'generation_completed',
        metadata: {
          generation_id: generationId,
          provider: 'midjourney',
          task_id: taskId
        }
      });

    const duration = Date.now() - startTime;
    webhookLogger.success(generationId!, { 
      taskId,
      duration,
      provider: 'midjourney' 
    });

    return new Response(JSON.stringify({ 
      success: true,
      generation_id: generationId,
      status: 'completed'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    if (generationId) {
      webhookLogger.failure(generationId, error.message, { provider: 'midjourney' });
    } else {
      webhookLogger.error('Webhook processing failed', error, { provider: 'midjourney' });
    }

    // Track webhook analytics for failure
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    await supabase.from('webhook_analytics').insert({
      provider: 'midjourney',
      event_type: 'generation_complete',
      status: 'failure',
      duration_ms: Date.now() - webhookStartTime,
      error_code: error.code || 'UNKNOWN_ERROR',
      metadata: { generation_id: generationId, task_id: taskId, error: error.message }
    }).then(({ error: analyticsError }) => {
      if (analyticsError) webhookLogger.error('Failed to track analytics', analyticsError);
    });

    return createSafeErrorResponse(error, 'midjourney-webhook', corsHeaders);
  }
});
