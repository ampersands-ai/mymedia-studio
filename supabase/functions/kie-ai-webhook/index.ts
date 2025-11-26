
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createSafeErrorResponse } from "../_shared/error-handler.ts";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { GENERATION_STATUS, WEBHOOK_CALLBACK_STATES } from "../_shared/constants.ts";

// Security validators
import { validateUrlToken } from "./security/url-token-validator.ts";
import { validateSignature } from "./security/signature-validator.ts";
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
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";



Deno.serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);

  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('kie-ai-webhook', requestId);
  const webhookStartTime = Date.now();
  
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  try {
    const url = new URL(req.url);
    
    // === LAYER 1: URL TOKEN VALIDATION ===
    const urlTokenResult = validateUrlToken(url);
    if (!urlTokenResult.success) {
      logger.warn('URL token validation failed', { metadata: { url: url.toString() } });
      return new Response(urlTokenResult.shouldReturn404 ? 'Not Found' : 'Bad Request', {
        status: urlTokenResult.shouldReturn404 ? 404 : 400,
        headers: responseHeaders
      });
    }

    // === LAYER 5: HMAC SIGNATURE VALIDATION ===
    // Must validate signature on raw body before JSON parsing for integrity check
    const rawBody = await req.text();
    const signature = req.headers.get('X-Kie-Signature');
    const signatureResult = validateSignature(rawBody, signature);

    if (!signatureResult.success) {
      logger.error('Signature validation failed', undefined, {
        metadata: {
          error: signatureResult.error,
          hasSignature: !!signature,
        }
      });
      return new Response('Forbidden', {
        status: 403,
        headers: responseHeaders
      });
    }

    const payload = JSON.parse(rawBody);
    logger.info('Webhook payload received', { metadata: { payload } });

    const taskId = payload.data?.taskId || payload.data?.task_id;
    if (!taskId) {
      logger.error('Invalid payload: missing taskId/task_id');
      return new Response(
        JSON.stringify({ error: 'Missing taskId in payload' }),
        { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
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
          headers: { ...responseHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const generation = verifyResult.generation!;
    
    // === LAYER 3: DYNAMIC TIMING VALIDATION ===
    const timingResult = await validateTiming(generation, supabase, payload);
    if (!timingResult.success) {
      return new Response(
        JSON.stringify({ error: timingResult.error }),
        { status: timingResult.statusCode || 429, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const callbackType = payload.data?.callbackType || payload.data?.callback_type || 'unknown';
    
    // === LAYER 4: IDEMPOTENCY PROTECTION ===
    const idempotencyResult = await validateIdempotency(taskId, callbackType, generation, supabase);
    if (!idempotencyResult.success || idempotencyResult.isDuplicate) {
      return new Response(
        JSON.stringify({ success: true, message: idempotencyResult.error || 'Already processed' }),
        { status: 200, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    logger.info('All security layers passed - processing webhook');

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
        logger.info('Mapped URLs to type-specific fields', { metadata: { itemCount: items.length, type: generation.type } });
      } else {
        items = payload.data?.data || [];
        logger.info('Using old data.data format', { metadata: { itemCount: items.length } });
      }
    } catch (e) {
      logger.error('Failed to parse results', e instanceof Error ? e : new Error(String(e)), { metadata: { error: e } });
      items = payload.data?.data || [];
    }
    
    logger.info('Processing callback', { metadata: { callbackType, itemCount: items.length } });

    // Extract HTTP code from payload (support both numeric and string formats)
    const httpCode = typeof payload.code === 'number' ? payload.code : 
                     typeof payload.status === 'number' ? payload.status : 
                     (typeof payload.code === 'string' ? parseInt(payload.code, 10) : 
                      (typeof payload.status === 'string' ? parseInt(payload.status, 10) : null));
    
    // Build comprehensive error message string for pattern matching
    const msgStr = String(payload.msg || failMsg || '').toLowerCase();
    
    // Expanded failure patterns (English + common non-English variants)
    const failurePatterns = ['error', 'fail', 'exceed', 'retry', 'timeout', 'invalid', 
                             '超过', '失败', '错误', '錯誤', '失敗', 'erreur', 'fehler'];
    const hasFailurePattern = failurePatterns.some(pattern => msgStr.includes(pattern));
    
    const isSuccess = state === WEBHOOK_CALLBACK_STATES.SUCCESS || httpCode === 200 || msgStr.includes('success');
    const isFailed = state === WEBHOOK_CALLBACK_STATES.FAILED || 
                     (httpCode !== null && httpCode >= 400) || 
                     hasFailurePattern;

    // === HANDLE FAILURE ===
    if (isFailed) {
      logger.error('KieAI generation failure', undefined, { 
        metadata: { 
          task_id: taskId,
          fail_msg: failMsg,
          generation_id: generation.id
        } 
      });
      
      const sanitizedError = (failMsg || payload.msg || 'Generation failed').substring(0, 200);
      
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
        .eq('id', generation.id);

      // Release credits on failure  
      await supabase.functions.invoke('settle-generation-credits', {
        body: {
          generationId: generation.id,
          status: GENERATION_STATUS.FAILED
        }
      });

      logger.info('Credits released for failed generation', { metadata: { amount: generation.tokens_used } });

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
      if (hasImageResults(items, payload, resultJson)) {
        logger.info('Image has complete results');
      } else if (callbackType && callbackType.toLowerCase() !== 'complete') {
        logger.info('Partial image callback', { metadata: { callbackType } });
        await supabase.from('generations').update({ status: GENERATION_STATUS.PROCESSING, provider_response: payload }).eq('id', generation.id);
        return new Response(
          JSON.stringify({ success: true, message: `Partial webhook acknowledged` }),
          { status: 200, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (generation.type === 'audio') {
      if (hasAudioResults(items, payload, resultJson)) {
        logger.info('Audio has complete results', { metadata: { urlCount: items.length } });
      } else if (callbackType && callbackType.toLowerCase() !== 'complete') {
        logger.info('Partial audio callback', { metadata: { callbackType } });
        await supabase.from('generations').update({ status: GENERATION_STATUS.PROCESSING, provider_response: payload }).eq('id', generation.id);
        return new Response(
          JSON.stringify({ success: true, message: `Partial webhook acknowledged` }),
          { status: 200, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (generation.type === 'video') {
      if (hasVideoResults(items, payload, resultJson)) {
        logger.info('Video has complete results');
      } else if (callbackType && callbackType.toLowerCase() !== 'complete') {
        logger.info('Partial video callback', { metadata: { callbackType } });
        await supabase.from('generations').update({ status: GENERATION_STATUS.PROCESSING, provider_response: payload }).eq('id', generation.id);
        return new Response(
          JSON.stringify({ success: true, message: `Partial webhook acknowledged` }),
          { status: 200, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // === HANDLE SUCCESS ===
    const hasMjResults = hasMidjourneyResults(payload, generation.modelMetadata?.id);
    
    if (isSuccess && (resultJson || payload.data?.info || hasMjResults || video_url || (Array.isArray(items) && items.length > 0))) {
      logger.info('Processing successful generation');
      
      // Extract result URLs - reuse normalized URLs if available
      let resultUrls: string[] = normalizedUrls.length > 0 ? normalizedUrls : [];
      
      // Only run old extraction if normalizedUrls is empty (fallback for legacy formats)
      if (resultUrls.length === 0) {
        logger.warn('normalizedUrls empty, using fallback extraction');
        
        if (video_url) {
          resultUrls = [video_url];
        } else if (isMidjourneyModel(generation.modelMetadata?.id) && payload.data?.resultUrls) {
          resultUrls = extractMidjourneyUrls(payload);
          logger.info('[MIDJOURNEY] URLs found', { metadata: { count: resultUrls.length } });
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
      } else {
        logger.info('Reusing normalized URLs', { metadata: { count: resultUrls.length } });
      }

      if (resultUrls.length === 0) {
        logger.error('No result URLs found');
        throw new Error('No result URLs found in response');
      }

      logger.info('Found outputs to process', { metadata: { count: resultUrls.length } });

      const isMultiOutput = resultUrls.length > 1;
      let storagePath: string | null = null;
      let publicUrl: string | null = null;
      let fileSize: number | null = null;
      
      // === SINGLE OUTPUT: Download and upload ===
      if (!isMultiOutput) {
        const downloadResult = await downloadContent(resultUrls[0]);
        if (!downloadResult.success || !downloadResult.data) {
          await supabase.from('generations').update({
            status: GENERATION_STATUS.FAILED,
            provider_response: { error: 'Failed to download from provider', timestamp: new Date().toISOString() }
          }).eq('id', generation.id);
          
          // Release credits on failure
          await supabase.functions.invoke('settle-generation-credits', {
            body: {
              generationId: generation.id,
              status: GENERATION_STATUS.FAILED
            }
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
          generation.id,
          downloadResult.data,
          fileExtension,
          generation.type
        );
        
        if (!uploadResult.success) {
          await supabase.from('generations').update({
            status: GENERATION_STATUS.FAILED,
            provider_response: { error: 'Storage upload failed', timestamp: new Date().toISOString() }
          }).eq('id', generation.id);
          
          // Release credits on failure
          await supabase.functions.invoke('settle-generation-credits', {
            body: {
              generationId: generation.id,
              status: GENERATION_STATUS.FAILED
            }
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
        generation_id: generation.id,
        api_request_payload: generation.provider_request || {},
        api_request_sent_at: generation.created_at,
        api_callback_payload: payload,
        api_callback_received_at: new Date().toISOString(),
        kie_credits_consumed: consumeCredits || 0,
        kie_credits_remaining: remainedCredits,
        our_tokens_charged: generation.tokens_used,
        model_id: generation.model_id || 'unknown',
        task_status: WEBHOOK_CALLBACK_STATES.SUCCESS,
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
            logger.info(`Output ${i + 1} already exists, skipping`, { 
              metadata: { generationId: generation.id, outputIndex: i + 1 } 
            });
            continue;
          }
          
          try {
            const downloadResult = await downloadContent(resultUrls[i]);
            if (!downloadResult.success || !downloadResult.data) {
            logger.error(`Output ${i + 1} download failed`, new Error(downloadResult.error || 'Download failed'), {
              metadata: { generationId: generation.id, outputIndex: i + 1, url: resultUrls[i] }
            });
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
              logger.error(`Output ${i + 1} upload failed`, new Error(uploadResult.error || 'Upload failed'), { 
                metadata: { generationId: generation.id, outputIndex: i + 1 } 
              });
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
            
            logger.info(`Output ${i + 1} child generation created`, {
              metadata: { generationId: generation.id, childId, outputIndex: i + 1 }
            });
          } catch (error) {
            logger.error(`Output ${i + 1} child creation failed`, error instanceof Error ? error : new Error(String(error)), {
              metadata: { generationId: generation.id, outputIndex: i + 1 }
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
        updateData.output_url = publicUrl || undefined;
      }
      
      await supabase.from('generations').update(updateData).eq('id', generation.id);
      logger.info('Parent generation completed', { 
        userId: generation.user_id,
        metadata: { generationId: generation.id, childCount: resultUrls.length } 
      });
      
      // Settle credits after successful completion
      await supabase.functions.invoke('settle-generation-credits', {
        body: {
          generationId: generation.id,
          status: 'completed'
        }
      });
      
      logger.logDuration('kie-ai-webhook-processing', webhookStartTime, {
        userId: generation.user_id,
        metadata: { generationId: generation.id, taskId, callbackType } 
      });

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
        { status: 200, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.warn('Unknown webhook state received', {
      metadata: { state, taskId, callbackType, generationId: generation.id }
    });
    return new Response(
      JSON.stringify({ success: true, message: 'Webhook received but state unknown' }),
      { status: 200, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    return createSafeErrorResponse(errorObj, 'kie-ai-webhook', responseHeaders);
  }
});
