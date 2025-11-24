import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createSafeErrorResponse } from "../../_shared/error-handler.ts";
import { webhookLogger } from "../../_shared/logger.ts";

// Security validators (reuse existing)
import { validateUrlToken } from "../../kie-ai-webhook/security/url-token-validator.ts";
import { validateVerifyToken } from "../../kie-ai-webhook/security/verify-token-validator.ts";
import { validateTiming } from "../../kie-ai-webhook/security/timing-validator.ts";
import { validateIdempotency } from "../../kie-ai-webhook/security/idempotency-validator.ts";

// Provider handlers (reuse existing)
import { isMidjourneyModel, hasMidjourneyResults, extractMidjourneyUrls } from "../../kie-ai-webhook/providers/midjourney-handler.ts";
import { normalizeResultUrls, mapUrlsToItems } from "../../kie-ai-webhook/providers/url-normalizer.ts";
import { hasImageResults, hasAudioResults, hasVideoResults } from "../../kie-ai-webhook/providers/result-validator.ts";

// Storage operations (reuse existing)
import { downloadContent } from "../../kie-ai-webhook/storage/content-downloader.ts";
import { uploadToStorage } from "../../kie-ai-webhook/storage/content-uploader.ts";
import { determineFileExtension } from "../../kie-ai-webhook/storage/mime-utils.ts";

// Orchestration (reuse existing)
import { orchestrateWorkflow } from "../../kie-ai-webhook/orchestration/workflow-orchestrator.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { GENERATION_STATUS } from "../../_shared/constants.ts";



Deno.serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  const webhookStartTime = Date.now();
  let taskId: string | undefined;
  let generationId: string | undefined;

  try {
    const url = new URL(req.url);
    
    // === LAYER 1: URL TOKEN VALIDATION ===
    const urlTokenResult = validateUrlToken(url);
    webhookLogger.security('url_token', urlTokenResult.success, { provider: 'kie_ai' });
    
    if (!urlTokenResult.success) {
      return new Response(urlTokenResult.shouldReturn404 ? 'Not Found' : 'Bad Request', { 
        status: urlTokenResult.shouldReturn404 ? 404 : 400,
        headers: responseHeaders
      });
    }
    
    const payload = await req.json();
    taskId = payload.data?.taskId || payload.data?.task_id;
    
    if (!taskId) {
      webhookLogger.error('Missing taskId in webhook payload', new Error('No taskId'), { provider: 'kie_ai' });
      return new Response(
        JSON.stringify({ error: 'Missing taskId in payload' }),
        { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    webhookLogger.received('kie_ai', taskId);

    const { state, resultJson, failMsg, video_url, consumeCredits, remainedCredits, costTime } = payload.data || {};
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // === LAYER 2: VERIFY TOKEN VALIDATION ===
    const verifyResult = await validateVerifyToken(url, taskId, supabase);
    webhookLogger.security('verify_token', verifyResult.success, { 
      provider: 'kie_ai',
      taskId,
      error: verifyResult.error 
    });
    
    if (!verifyResult.success) {
      return new Response(
        JSON.stringify({ 
          error: verifyResult.error,
          ...(verifyResult.error === 'Generation was cancelled by user' && { success: true })
        }),
        { 
          status: verifyResult.statusCode || 400, 
          headers: { ...responseHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const generation = verifyResult.generation!;
    generationId = generation.id;
    
    // Ensure generationId is defined for type safety
    if (!generationId) {
      webhookLogger.error('Missing generationId after verification', new Error('No generationId'), { provider: 'kie_ai', taskId });
      return new Response(
        JSON.stringify({ error: 'Invalid generation ID' }),
        { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // === LAYER 3: DYNAMIC TIMING VALIDATION ===
    const timingResult = await validateTiming(generation, supabase);
    webhookLogger.security('timing', timingResult.success, {
      provider: 'kie_ai',
      generationId,
      taskId
    });
    
    if (!timingResult.success) {
      return new Response(
        JSON.stringify({ error: timingResult.error }),
        { status: timingResult.statusCode || 429, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const callbackType = payload.data?.callbackType || payload.data?.callback_type || 'unknown';
    
    // === LAYER 4: IDEMPOTENCY PROTECTION ===
    const idempotencyResult = await validateIdempotency(taskId, callbackType, generation, supabase);
    webhookLogger.security('idempotency', !idempotencyResult.isDuplicate, {
      provider: 'kie_ai',
      generationId,
      taskId,
      callbackType
    });
    
    if (!idempotencyResult.success || idempotencyResult.isDuplicate) {
      return new Response(
        JSON.stringify({ success: true, message: idempotencyResult.error || 'Already processed' }),
        { status: 200, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    webhookLogger.processing(generationId, {
      provider: 'kie_ai',
      taskId,
      userId: generation.user_id,
      contentType: generation.type
    });

    // Parse items from payload
    interface ResultItem {
      audio_url?: string;
      source_audio_url?: string;
      stream_audio_url?: string;
      image_url?: string;
      source_image_url?: string;
      video_url?: string;
      source_video_url?: string;
      url?: string;
    }
    let items: ResultItem[] = [];
    let normalizedUrls: string[] = [];
    try {
      normalizedUrls = normalizeResultUrls(payload, resultJson, generation.type, generation.modelMetadata?.id);
      
      if (normalizedUrls.length > 0) {
        items = mapUrlsToItems(normalizedUrls, generation.type);
        webhookLogger.info(`Mapped ${items.length} URLs to ${generation.type}-specific fields`, {
          provider: 'kie_ai',
          generationId,
          taskId
        });
      } else {
        items = payload.data?.data || [];
      }
    } catch (e) {
      webhookLogger.error('Failed to parse results', e, {
        provider: 'kie_ai',
        generationId,
        taskId
      });
      items = payload.data?.data || [];
    }

    // Extract HTTP code from payload (support both numeric and string formats)
    const httpCode = typeof payload.code === 'number' ? payload.code : 
                     typeof payload.status === 'number' ? payload.status : 
                     null;
    
    // Build comprehensive error message string for pattern matching
    const msgStr = String(payload.msg || failMsg || '').toLowerCase();
    
    // Expanded failure patterns (English + common non-English variants)
    const failurePatterns = ['error', 'fail', 'exceed', 'retry', 'timeout', 'invalid', 
                             '超过', '失败', '错误', '錯誤', '失敗', 'erreur', 'fehler'];
    const hasFailurePattern = failurePatterns.some(pattern => msgStr.includes(pattern));
    
    const isSuccess = state === 'success' || payload.code === 200 || (payload.msg && payload.msg.toLowerCase().includes('success'));
    const isFailed = state === 'failed' || 
                     (httpCode !== null && httpCode >= 400) || 
                     hasFailurePattern;

    // === HANDLE FAILURE ===
    if (isFailed) {
      const sanitizedError = (failMsg || payload.msg || 'Generation failed').substring(0, 200);
      
      webhookLogger.failure(generationId, sanitizedError, {
        provider: 'kie_ai',
        taskId,
        userId: generation.user_id,
        kieCreditsConsumed: consumeCredits
      });
      
      await supabase
        .from('generations')
        .update({
          status: GENERATION_STATUS.FAILED,
          provider_response: {
            error: sanitizedError,
            error_type: 'provider_failure',
            kie_credits_consumed: consumeCredits || 0,
            kie_credits_remaining: remainedCredits || null,
            timestamp: new Date().toISOString()
          }
        })
        .eq('id', generationId);

      // Refund tokens
      await supabase.rpc('increment_tokens', {
        user_id_param: generation.user_id,
        amount: generation.tokens_used
      });

      // Audit log
      await supabase.from('kie_credit_audits').insert({
        generation_id: generationId,
        api_request_payload: generation.provider_request || {},
        api_request_sent_at: generation.created_at,
        api_callback_payload: payload,
        api_callback_received_at: new Date().toISOString(),
        kie_credits_consumed: consumeCredits || 0,
        kie_credits_remaining: remainedCredits,
        our_tokens_charged: generation.tokens_used,
        model_id: generation.model_id || 'unknown',
        task_status: GENERATION_STATUS.FAILED,
        processing_time_seconds: 0
      });

      return new Response(
        JSON.stringify({ success: true, message: 'Generation marked as failed' }),
        { status: 200, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // === TYPE-SPECIFIC VALIDATION ===
    if (generation.type === 'image') {
      if (!hasImageResults(items, payload, resultJson) && callbackType && callbackType.toLowerCase() !== 'complete') {
        webhookLogger.info('Partial image callback', { provider: 'kie_ai', generationId, taskId, callbackType });
        await supabase.from('generations').update({ status: GENERATION_STATUS.PROCESSING, provider_response: payload }).eq('id', generationId);
        return new Response(
          JSON.stringify({ success: true, message: 'Partial webhook acknowledged' }),
          { status: 200, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (generation.type === 'audio') {
      if (!hasAudioResults(items, payload, resultJson) && callbackType && callbackType.toLowerCase() !== 'complete') {
        webhookLogger.info('Partial audio callback', { provider: 'kie_ai', generationId, taskId, callbackType });
        await supabase.from('generations').update({ status: GENERATION_STATUS.PROCESSING, provider_response: payload }).eq('id', generationId);
        return new Response(
          JSON.stringify({ success: true, message: 'Partial webhook acknowledged' }),
          { status: 200, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (generation.type === 'video') {
      if (!hasVideoResults(items, payload, resultJson) && callbackType && callbackType.toLowerCase() !== 'complete') {
        webhookLogger.info('Partial video callback', { provider: 'kie_ai', generationId, taskId, callbackType });
        await supabase.from('generations').update({ status: GENERATION_STATUS.PROCESSING, provider_response: payload }).eq('id', generationId);
        return new Response(
          JSON.stringify({ success: true, message: 'Partial webhook acknowledged' }),
          { status: 200, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // === HANDLE SUCCESS ===
    const hasMjResults = hasMidjourneyResults(payload, generation.modelMetadata?.id);
    
    if (isSuccess && (resultJson || payload.data?.info || hasMjResults || video_url || (Array.isArray(items) && items.length > 0))) {
      // Extract result URLs - reuse normalized URLs if available
      let resultUrls: string[] = normalizedUrls.length > 0 ? normalizedUrls : [];
      
      // Only run old extraction if normalizedUrls is empty (fallback for legacy formats)
      if (resultUrls.length === 0) {
        if (video_url) {
          resultUrls = [video_url];
        } else if (isMidjourneyModel(generation.modelMetadata?.id) && payload.data?.resultUrls) {
          resultUrls = extractMidjourneyUrls(payload);
        } else if (resultJson) {
          const result = JSON.parse(resultJson);
          resultUrls = result.resultUrls || [result.resultUrl].filter(Boolean);
        } else if (payload.data?.info) {
          resultUrls = payload.data.info.resultUrls || payload.data.info.result_urls || [];
        } else if (Array.isArray(items) && items.length > 0) {
          if (generation.type === 'audio') {
            resultUrls = items.map((item) => item?.audio_url || item?.source_audio_url || item?.stream_audio_url).filter(Boolean) as string[];
          } else if (generation.type === 'image') {
            resultUrls = items.map((item) => item?.image_url || item?.source_image_url).filter(Boolean) as string[];
          } else {
            resultUrls = items.map((item) => item?.video_url || item?.source_video_url || item?.url).filter(Boolean) as string[];
          }
        }
      }

      if (resultUrls.length === 0) {
        throw new Error('No result URLs found in response');
      }

      webhookLogger.info(`Found ${resultUrls.length} output(s) to process`, {
        provider: 'kie_ai',
        generationId,
        taskId
      });

      const isMultiOutput = resultUrls.length > 1;
      let storagePath: string | null = null;
      let publicUrl: string | null = null;
      let fileSize: number | null = null;
      
      // === SINGLE OUTPUT: Download and upload ===
      if (!isMultiOutput) {
        const downloadResult = await downloadContent(resultUrls[0]);
        webhookLogger.download(resultUrls[0], downloadResult.success, {
          provider: 'kie_ai',
          generationId,
          taskId
        });
        
        if (!downloadResult.success || !downloadResult.data) {
          await supabase.from('generations').update({
            status: GENERATION_STATUS.FAILED,
            provider_response: { error: 'Failed to download from provider', timestamp: new Date().toISOString() }
          }).eq('id', generationId);
          
          await supabase.rpc('increment_tokens', {
            user_id_param: generation.user_id,
            amount: generation.tokens_used
          });
          
          webhookLogger.failure(generationId, 'Download failed', {
            provider: 'kie_ai',
            taskId
          });
          
          return new Response(
            JSON.stringify({ success: true, message: 'Download failed - user refunded' }),
            { status: 200, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const fileExtension = determineFileExtension(downloadResult.contentType || '', resultUrls[0]);
        const uploadResult = await uploadToStorage(
          supabase,
          generation.user_id,
          generationId,
          downloadResult.data,
          fileExtension,
          generation.type
        );
        
        webhookLogger.upload(uploadResult.storagePath || 'unknown', uploadResult.success, {
          provider: 'kie_ai',
          generationId,
          taskId,
          fileSize: downloadResult.data.length
        });
        
        if (!uploadResult.success) {
          await supabase.from('generations').update({
            status: GENERATION_STATUS.FAILED,
            provider_response: { error: 'Storage upload failed', timestamp: new Date().toISOString() }
          }).eq('id', generationId);
          
          await supabase.rpc('increment_tokens', {
            user_id_param: generation.user_id,
            amount: generation.tokens_used
          });
          
          webhookLogger.failure(generationId, 'Storage upload failed', {
            provider: 'kie_ai',
            taskId
          });
          
          return new Response(
            JSON.stringify({ success: true, message: 'Storage failed - user refunded' }),
            { status: 200, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        storagePath = uploadResult.storagePath!;
        publicUrl = uploadResult.publicUrl || null;
        fileSize = downloadResult.data.length;
      }

      // === AUDIT LOG ===
      await supabase.from('kie_credit_audits').insert({
        generation_id: generationId,
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
          .eq('parent_generation_id', generationId)
          .order('output_index', { ascending: true });
        
        const existingIndexes = new Set(existingChildren?.map(c => c.output_index) || []);
        
        for (let i = 0; i < resultUrls.length; i++) {
          if (existingIndexes.has(i)) {
            continue;
          }
          
          try {
            const downloadResult = await downloadContent(resultUrls[i]);
            if (!downloadResult.success || !downloadResult.data) {
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
              status: GENERATION_STATUS.COMPLETED,
              storage_path: uploadResult.storagePath,
              output_url: uploadResult.publicUrl,
              file_size_bytes: downloadResult.data.length,
              provider_task_id: generation.provider_task_id,
              provider_request: generation.provider_request,
              provider_response: payload,
              parent_generation_id: generationId,
              output_index: i,
              is_batch_output: true
            });
            
            webhookLogger.info(`Child output ${i + 1} created`, {
              provider: 'kie_ai',
              generationId,
              taskId,
              childId
            });
          } catch (error) {
            webhookLogger.error(`Failed to process output ${i + 1}`, error instanceof Error ? error : new Error(String(error)), {
              provider: 'kie_ai',
              generationId,
              taskId
            });
          }
        }
      }

      // === UPDATE PARENT ===
      interface GenerationUpdate {
        status: string;
        file_size_bytes: number | null;
        provider_response: Record<string, unknown>;
        output_index: number;
        is_batch_output: boolean;
        storage_path?: string;
        output_url?: string | null;
      }

      const updateData: GenerationUpdate = {
        status: GENERATION_STATUS.COMPLETED,
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
      
      await supabase.from('generations').update(updateData).eq('id', generationId);

      webhookLogger.success(generationId, {
        provider: 'kie_ai',
        taskId,
        userId: generation.user_id,
        outputCount: resultUrls.length,
        fileSize,
        duration: costTime
      });

      // Trigger post-processing
      try {
        await orchestrateWorkflow(generation, storagePath, isMultiOutput, supabase);
      } catch (error) {
        webhookLogger.error('Post-processing orchestration failed', error instanceof Error ? error : new Error(String(error)), {
          provider: 'kie_ai',
          generationId,
          taskId
        });
      }

      // Track webhook analytics
      await supabase.from('webhook_analytics').insert({
        provider: 'kie-ai',
        event_type: 'generation_complete',
        status: 'success',
        duration_ms: Date.now() - webhookStartTime,
        metadata: { generation_id: generationId, task_id: taskId, outputs: resultUrls.length }
      }).then(({ error }) => {
        if (error) webhookLogger.error('Failed to track analytics', error);
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Generation completed successfully',
          outputs: resultUrls.length
        }),
        { status: 200, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    webhookLogger.error('Unhandled webhook state', new Error('Unknown state'), {
      provider: 'kie_ai',
      generationId,
      taskId,
      state,
      isSuccess,
      isFailed
    });

    return new Response(
      JSON.stringify({ error: 'Unhandled webhook state' }),
      { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    webhookLogger.error('Webhook processing error', errorObj, {
      provider: 'kie_ai',
      generationId,
      taskId
    });

    // Track webhook analytics for failure
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await supabase.from('webhook_analytics').insert({
      provider: 'kie-ai',
      event_type: 'generation_complete',
      status: 'failure',
      duration_ms: Date.now() - webhookStartTime,
      error_code: (error && typeof error === 'object' && 'code' in error ? error.code as string : null) || 'UNKNOWN_ERROR',
      metadata: { generation_id: generationId, task_id: taskId, error: errorObj.message }
    }).then(({ error: analyticsError }) => {
      if (analyticsError) webhookLogger.error('Failed to track analytics', analyticsError);
    });

    return createSafeErrorResponse(errorObj, 'kie-webhook', responseHeaders);
  }
});
