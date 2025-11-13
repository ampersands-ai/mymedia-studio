
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createSafeErrorResponse } from "../_shared/error-handler.ts";
import { webhookLogger } from "../_shared/logger.ts";

// Security validators
import { validateUrlToken } from "./security/url-token-validator.ts";
import { validateVerifyToken } from "./security/verify-token-validator.ts";
import { validateTiming } from "./security/timing-validator.ts";
import { validateIdempotency } from "./security/idempotency-validator.ts";

// Provider handlers
import { isMidjourneyModel, hasMidjourneyResults, extractMidjourneyUrls } from "./providers/midjourney-handler.ts";
import { normalizeResultUrls, mapUrlsToItems } from "./providers/url-normalizer.ts";
import { hasImageResults, hasAudioResults, hasVideoResults } from "./providers/result-validator.ts";

// Storage operations
import { downloadContent } from "./storage/content-downloader.ts";
import { uploadToStorage } from "./storage/content-uploader.ts";
import { determineFileExtension } from "./storage/mime-utils.ts";

// Orchestration
import { orchestrateWorkflow } from "./orchestration/workflow-orchestrator.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    
    // === LAYER 1: URL TOKEN VALIDATION ===
    const urlTokenResult = validateUrlToken(url);
    if (!urlTokenResult.success) {
      return new Response(urlTokenResult.shouldReturn404 ? 'Not Found' : 'Bad Request', { 
        status: urlTokenResult.shouldReturn404 ? 404 : 400,
        headers: corsHeaders
      });
    }
    
    const payload = await req.json();
    console.log('Webhook payload:', JSON.stringify(payload));

    const taskId = payload.data?.taskId || payload.data?.task_id;
    if (!taskId) {
      console.error('Invalid payload: missing taskId/task_id');
      return new Response(
        JSON.stringify({ error: 'Missing taskId in payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { state, resultJson, failMsg, video_url, consumeCredits, remainedCredits, costTime } = payload.data || {};
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // === LAYER 2: VERIFY TOKEN VALIDATION ===
    const verifyResult = await validateVerifyToken(url, taskId, supabase);
    if (!verifyResult.success) {
      return new Response(
        JSON.stringify({ 
          error: verifyResult.error,
          ...(verifyResult.error === 'Generation was cancelled by user' && { success: true })
        }),
        { 
          status: verifyResult.statusCode || 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const generation = verifyResult.generation!;
    
    // === LAYER 3: DYNAMIC TIMING VALIDATION ===
    const timingResult = await validateTiming(generation, supabase);
    if (!timingResult.success) {
      return new Response(
        JSON.stringify({ error: timingResult.error }),
        { status: timingResult.statusCode || 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const callbackType = payload.data?.callbackType || payload.data?.callback_type || 'unknown';
    
    // === LAYER 4: IDEMPOTENCY PROTECTION ===
    const idempotencyResult = await validateIdempotency(taskId, callbackType, generation, supabase);
    if (!idempotencyResult.success || idempotencyResult.isDuplicate) {
      return new Response(
        JSON.stringify({ success: true, message: idempotencyResult.error || 'Already processed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('🔒 All security layers passed - processing webhook');

    // Parse items from payload
    let items: any[] = [];
    let normalizedUrls: string[] = [];
    try {
      normalizedUrls = normalizeResultUrls(payload, resultJson, generation.type, generation.ai_models?.id);
      
      if (normalizedUrls.length > 0) {
        items = mapUrlsToItems(normalizedUrls, generation.type);
        console.log(`✅ Mapped ${items.length} URLs to ${generation.type}-specific fields`);
      } else {
        items = payload.data?.data || [];
        console.log(`📦 Using old data.data format with ${items.length} items`);
      }
    } catch (e) {
      console.error('Failed to parse results:', e);
      items = payload.data?.data || [];
    }
    
    console.log('Callback type:', callbackType, 'Items count:', items.length);

    const isSuccess = state === 'success' || payload.code === 200 || (payload.msg && payload.msg.toLowerCase().includes('success'));
    const isFailed = state === 'failed' || payload.status === 400 || payload.code === 400 || payload.code === 422 || (payload.msg && payload.msg.toLowerCase().includes('fail'));

    // === HANDLE FAILURE ===
    if (isFailed) {
      console.error('KieAI generation failure:', {
        task_id: taskId,
        fail_msg: failMsg,
        generation_id: generation.id
      });
      
      const sanitizedError = (failMsg || payload.msg || 'Generation failed').substring(0, 200);
      
      await supabase
        .from('generations')
        .update({
          status: 'failed',
          provider_response: {
            error: sanitizedError,
            error_type: 'provider_failure',
            kie_credits_consumed: consumeCredits || 0,
            kie_credits_remaining: remainedCredits || null,
            timestamp: new Date().toISOString()
          }
        })
        .eq('id', generation.id);

      // Refund tokens
      await supabase.rpc('increment_tokens', {
        user_id_param: generation.user_id,
        amount: generation.tokens_used
      });

      console.log('Tokens refunded:', generation.tokens_used);

      // Audit log
      await supabase.from('kie_credit_audits').insert({
        generation_id: generation.id,
        api_request_payload: generation.provider_request || {},
        api_request_sent_at: generation.created_at,
        api_callback_payload: payload,
        api_callback_received_at: new Date().toISOString(),
        kie_credits_consumed: consumeCredits || 0,
        kie_credits_remaining: remainedCredits,
        our_tokens_charged: generation.tokens_used,
        model_id: generation.model_id || 'unknown',
        task_status: 'failed',
        processing_time_seconds: 0
      });

      return new Response(
        JSON.stringify({ success: true, message: 'Generation marked as failed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // === TYPE-SPECIFIC VALIDATION ===
    if (generation.type === 'image') {
      if (hasImageResults(items, payload, resultJson)) {
        console.log('✅ Image has complete results');
      } else if (callbackType && callbackType.toLowerCase() !== 'complete') {
        console.log(`⏸️ Partial image callback (${callbackType})`);
        await supabase.from('generations').update({ status: 'processing', provider_response: payload }).eq('id', generation.id);
        return new Response(
          JSON.stringify({ success: true, message: `Partial webhook acknowledged` }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (generation.type === 'audio') {
      if (hasAudioResults(items, payload, resultJson)) {
        console.log(`✅ Audio has complete results (${items.length} URLs)`);
      } else if (callbackType && callbackType.toLowerCase() !== 'complete') {
        console.log(`⏸️ Partial audio callback (${callbackType})`);
        await supabase.from('generations').update({ status: 'processing', provider_response: payload }).eq('id', generation.id);
        return new Response(
          JSON.stringify({ success: true, message: `Partial webhook acknowledged` }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (generation.type === 'video') {
      if (hasVideoResults(items, payload, resultJson)) {
        console.log('✅ Video has complete results');
      } else if (callbackType && callbackType.toLowerCase() !== 'complete') {
        console.log(`⏸️ Partial video callback (${callbackType})`);
        await supabase.from('generations').update({ status: 'processing', provider_response: payload }).eq('id', generation.id);
        return new Response(
          JSON.stringify({ success: true, message: `Partial webhook acknowledged` }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // === HANDLE SUCCESS ===
    const hasMjResults = hasMidjourneyResults(payload, generation.ai_models?.id);
    
    if (isSuccess && (resultJson || payload.data?.info || hasMjResults || video_url || (Array.isArray(items) && items.length > 0))) {
      console.log('🎯 Processing successful generation');
      
      // Extract result URLs - reuse normalized URLs if available
      let resultUrls: string[] = normalizedUrls.length > 0 ? normalizedUrls : [];
      
      // Only run old extraction if normalizedUrls is empty (fallback for legacy formats)
      if (resultUrls.length === 0) {
        console.log('⚠️ normalizedUrls empty, using fallback extraction');
        
        if (video_url) {
          resultUrls = [video_url];
        } else if (isMidjourneyModel(generation.ai_models?.id) && payload.data?.resultUrls) {
          resultUrls = extractMidjourneyUrls(payload);
          console.log('🎨 [MIDJOURNEY] URLs found:', resultUrls.length);
        } else if (resultJson) {
          const result = JSON.parse(resultJson);
          resultUrls = result.resultUrls || [result.resultUrl].filter(Boolean);
        } else if (payload.data?.info) {
          resultUrls = payload.data.info.resultUrls || payload.data.info.result_urls || [];
        } else if (Array.isArray(items) && items.length > 0) {
          if (generation.type === 'audio') {
            resultUrls = items.map((item: any) => item?.audio_url || item?.source_audio_url || item?.stream_audio_url).filter(Boolean);
          } else if (generation.type === 'image') {
            resultUrls = items.map((item: any) => item?.image_url || item?.source_image_url).filter(Boolean);
          } else {
            resultUrls = items.map((item: any) => item?.video_url || item?.source_video_url || item?.url).filter(Boolean);
          }
        }
      } else {
        console.log(`✅ Reusing ${resultUrls.length} normalized URL(s) - no re-extraction needed`);
      }

      if (resultUrls.length === 0) {
        console.error('❌ No result URLs found');
        throw new Error('No result URLs found in response');
      }

      console.log(`✅ Found ${resultUrls.length} output(s) to process`);

      const isMultiOutput = resultUrls.length > 1;
      let storagePath: string | null = null;
      let publicUrl: string | null = null;
      let fileSize: number | null = null;
      
      // === SINGLE OUTPUT: Download and upload ===
      if (!isMultiOutput) {
        const downloadResult = await downloadContent(resultUrls[0]);
        if (!downloadResult.success || !downloadResult.data) {
          await supabase.from('generations').update({
            status: 'failed',
            provider_response: { error: 'Failed to download from provider', timestamp: new Date().toISOString() }
          }).eq('id', generation.id);
          
          await supabase.rpc('increment_tokens', {
            user_id_param: generation.user_id,
            amount: generation.tokens_used
          });
          
          return new Response(
            JSON.stringify({ success: true, message: 'Download failed - user refunded' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const fileExtension = determineFileExtension(downloadResult.contentType || '', resultUrls[0]);
        const uploadResult = await uploadToStorage(
          supabase,
          generation.user_id,
          generation.id,
          downloadResult.data,
          fileExtension,
          generation.type
        );
        
        if (!uploadResult.success) {
          await supabase.from('generations').update({
            status: 'failed',
            provider_response: { error: 'Storage upload failed', timestamp: new Date().toISOString() }
          }).eq('id', generation.id);
          
          await supabase.rpc('increment_tokens', {
            user_id_param: generation.user_id,
            amount: generation.tokens_used
          });
          
          return new Response(
            JSON.stringify({ success: true, message: 'Storage failed - user refunded' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        storagePath = uploadResult.storagePath!;
        publicUrl = uploadResult.publicUrl || null;
        fileSize = downloadResult.data.length;
      }

      // === AUDIT LOG ===
      await supabase.from('kie_credit_audits').insert({
        generation_id: generation.id,
        api_request_payload: generation.provider_request || {},
        api_request_sent_at: generation.created_at,
        api_callback_payload: payload,
        api_callback_received_at: new Date().toISOString(),
        kie_credits_consumed: consumeCredits || 0,
        kie_credits_remaining: remainedCredits,
        our_tokens_charged: generation.tokens_used,
        model_id: generation.model_id || 'unknown',
        task_status: 'success',
        processing_time_seconds: costTime
      });

      // === MULTI-OUTPUT: Create children ===
      if (isMultiOutput) {
        const { data: existingChildren } = await supabase
          .from('generations')
          .select('output_index')
          .eq('parent_generation_id', generation.id)
          .order('output_index', { ascending: true });
        
        const existingIndexes = new Set(existingChildren?.map(c => c.output_index) || []);
        
        for (let i = 0; i < resultUrls.length; i++) {
          if (existingIndexes.has(i)) {
            console.log(`⏭️ [Output ${i + 1}] Skipping - already exists`);
            continue;
          }
          
          try {
            const downloadResult = await downloadContent(resultUrls[i]);
            if (!downloadResult.success || !downloadResult.data) {
              console.error(`❌ [Output ${i + 1}] Download failed`);
              continue;
            }
            
            const fileExtension = determineFileExtension(downloadResult.contentType || '', resultUrls[i]);
            const childId = crypto.randomUUID();
            const uploadResult = await uploadToStorage(
              supabase,
              generation.user_id,
              childId,
              downloadResult.data,
              fileExtension,
              generation.type
            );
            
            if (!uploadResult.success) {
              console.error(`❌ [Output ${i + 1}] Upload failed`);
              continue;
            }
            
            await supabase.from('generations').insert({
              id: childId,
              user_id: generation.user_id,
              type: generation.type,
              prompt: generation.prompt,
              enhanced_prompt: generation.enhanced_prompt,
              original_prompt: generation.original_prompt,
              model_id: generation.model_id,
              model_record_id: generation.model_record_id,
              template_id: generation.template_id,
              settings: generation.settings,
              tokens_used: 0,
              status: 'completed',
              storage_path: uploadResult.storagePath,
              output_url: uploadResult.publicUrl,
              file_size_bytes: downloadResult.data.length,
              provider_task_id: generation.provider_task_id,
              provider_request: generation.provider_request,
              provider_response: payload,
              parent_generation_id: generation.id,
              output_index: i,
              is_batch_output: true
            });
            
            console.log(`✅ [Output ${i + 1}] Child created`);
          } catch (error: any) {
            console.error(`❌ [Output ${i + 1}] Error:`, error.message);
          }
        }
      }

      // === UPDATE PARENT ===
      interface GenerationUpdate {
        status: string;
        file_size_bytes: number;
        provider_response: Record<string, unknown>;
        output_index: number;
        is_batch_output: boolean;
        output_url?: string;
        completed_at?: string;
      }

      const updateData: GenerationUpdate = {
        status: 'completed',
        file_size_bytes: fileSize,
        provider_response: {
          ...payload,
          kie_credits_consumed: consumeCredits || null,
          kie_credits_remaining: remainedCredits || null,
          kie_processing_time_seconds: costTime || null,
          our_tokens_charged: generation.tokens_used,
          timestamp: new Date().toISOString()
        },
        output_index: 0,
        is_batch_output: isMultiOutput
      };
      
      if (!isMultiOutput && storagePath) {
        updateData.storage_path = storagePath;
        updateData.output_url = publicUrl;
      }
      
      await supabase.from('generations').update(updateData).eq('id', generation.id);
      console.log('✅ Parent generation marked as completed');

      // === WORKFLOW ORCHESTRATION ===
      await orchestrateWorkflow(generation, storagePath, isMultiOutput, supabase);

      // === AUDIT LOG ===
      await supabase.from('audit_logs').insert({
        user_id: generation.user_id,
        action: 'generation_completed',
        resource_type: 'generation',
        resource_id: generation.id,
        metadata: {
          model_id: generation.model_id,
          tokens_used: generation.tokens_used,
          file_size: fileSize,
          total_outputs: resultUrls.length,
          webhook_callback: true,
          workflow_execution_id: generation.workflow_execution_id || null,
        }
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Generation completed',
          outputs_processed: resultUrls.length
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.warn('Unknown webhook state');
    return new Response(
      JSON.stringify({ success: true, message: 'Webhook received but state unknown' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    return createSafeErrorResponse(error, 'kie-ai-webhook', corsHeaders);
  }
});
