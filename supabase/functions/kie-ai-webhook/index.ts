import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { createSafeErrorResponse } from "../_shared/error-handler.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Log ALL incoming requests for debugging webhook delivery issues
  console.log('=== WEBHOOK REQUEST RECEIVED ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('CORS preflight - responding with headers');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('✅ Webhook security layers initialized');
    
    // === LAYER 1: URL TOKEN VALIDATION ===
    // Extract and validate the static URL token
    const url = new URL(req.url);
    const receivedToken = url.searchParams.get('token');
    const expectedToken = Deno.env.get('KIE_WEBHOOK_URL_TOKEN');
    
    if (!receivedToken || receivedToken !== expectedToken) {
      console.error('🚨 SECURITY LAYER 1 FAILED: Invalid or missing URL token', {
        has_token: !!receivedToken,
        token_preview: receivedToken?.substring(0, 8) + '...'
      });
      // Return 404 to make endpoint appear as if it doesn't exist
      return new Response('Not Found', { 
        status: 404,
        headers: corsHeaders
      });
    }
    
    console.log('✅ Layer 1 passed: URL token validated');
    console.log('Kie.ai webhook received');
    
    const payload = await req.json();
    console.log('Webhook payload:', JSON.stringify(payload));

    // Validate payload structure - support both camelCase and snake_case
    const taskId = payload.data?.taskId || payload.data?.task_id;
    if (!taskId) {
      console.error('Invalid payload: missing taskId/task_id');
      return new Response(
        JSON.stringify({ error: 'Missing taskId in payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { state, resultJson, failMsg, video_url, consumeCredits, remainedCredits, costTime } = payload.data || {};
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // === LAYER 2: VERIFY TOKEN VALIDATION ===
    // Extract the per-generation verify token
    const verifyToken = url.searchParams.get('verify');
    if (!verifyToken) {
      console.error('🚨 SECURITY LAYER 2 FAILED: Missing verify token');
      return new Response(
        JSON.stringify({ error: 'Bad Request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // SECURITY: Verify the task exists in our database and fetch model metadata
    // Add retry logic for race condition where webhook arrives before DB update
    // Remove parent_generation_id filter to allow child MP4 generations
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
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // 1s, 2s, 3s
      }
      
      retryCount++;
    }

    if (findError || !generation) {
      console.error('Security: Rejected webhook for unknown task:', taskId, findError);
      return new Response(
        JSON.stringify({ error: 'Invalid task ID' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate verify token matches the one stored during generation creation
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
      
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('✅ Layer 2 passed: Verify token validated');

    // Additional security: Only accept webhooks for pending/processing generations
    if (generation.status === 'cancelled') {
      console.log('⏹️ Generation was cancelled by user - ignoring webhook', {
        generation_id: generation.id,
        task_id: taskId
      });
      return new Response(
        JSON.stringify({ success: true, message: 'Generation was cancelled by user' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (generation.status !== 'pending' && generation.status !== 'processing') {
      console.error('Security: Rejected webhook for already processed task:', taskId, 'Status:', generation.status);
      return new Response(
        JSON.stringify({ error: 'Generation already processed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // === LAYER 3: DYNAMIC TIMING VALIDATION ===
    const estimatedSeconds = generation.ai_models?.estimated_time_seconds || 300;
    const MIN_PROCESSING_TIME = 2.85 * 1000; // 2.85 seconds (aggressive anti-replay)
    const MAX_PROCESSING_TIME = estimatedSeconds * 2.5 * 1000; // 2.5x multiplier

    const processingTime = Date.now() - new Date(generation.created_at).getTime();

    console.log('⏱️ Timing analysis:', {
      taskId,
      model: generation.ai_models?.model_name,
      estimated_seconds: estimatedSeconds,
      actual_processing_seconds: Math.round(processingTime / 1000),
      min_threshold_seconds: MIN_PROCESSING_TIME / 1000,
      max_threshold_seconds: MAX_PROCESSING_TIME / 1000
    });

    // Reject impossibly fast webhooks (< 2.85s = replay/automation attack)
    if (processingTime < MIN_PROCESSING_TIME) {
      console.error('🚨 SECURITY LAYER 3 FAILED: Webhook too fast - possible replay attack', {
        taskId,
        generation_id: generation.id,
        processing_ms: processingTime,
        threshold_ms: MIN_PROCESSING_TIME,
        model: generation.ai_models?.model_name
      });
      
      await supabase.from('audit_logs').insert({
        user_id: generation.user_id,
        action: 'webhook_rejected_timing',
        metadata: {
          reason: 'too_fast',
          generation_id: generation.id,
          task_id: taskId,
          processing_seconds: processingTime / 1000,
          minimum_threshold: MIN_PROCESSING_TIME / 1000,
          model_id: generation.model_id
        }
      });
      
      return new Response(
        JSON.stringify({ 
          error: 'Request processing too fast - potential security issue',
          timestamp: new Date().toISOString()
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log late webhooks (don't reject - might be legitimate queue delays)
    if (processingTime > MAX_PROCESSING_TIME) {
      const severityLevel = processingTime > (MAX_PROCESSING_TIME * 2) ? 'high' : 'medium';
      
      console.warn(`⏰ Late webhook detected [${severityLevel} severity]`, {
        taskId,
        generation_id: generation.id,
        processing_seconds: Math.round(processingTime / 1000),
        max_threshold_seconds: Math.round(MAX_PROCESSING_TIME / 1000),
        model: generation.ai_models?.model_name
      });
      
      await supabase.from('audit_logs').insert({
        user_id: generation.user_id,
        action: 'webhook_late_arrival',
        metadata: {
          severity: severityLevel,
          generation_id: generation.id,
          task_id: taskId,
          expected_max_seconds: MAX_PROCESSING_TIME / 1000,
          actual_seconds: processingTime / 1000,
          variance_seconds: (processingTime - MAX_PROCESSING_TIME) / 1000,
          model_id: generation.model_id
        }
      });
    }
    
    console.log('✅ Layer 3 passed: Webhook timing validated');
    
    // Extract Kie.ai callback type early for idempotency
    const callbackType = payload.data?.callbackType || payload.data?.callback_type || 'unknown';
    
    // === LAYER 4: IDEMPOTENCY PROTECTION ===
    // Check if we've already processed this specific webhook callback
    // Use taskId + callbackType to allow multiple callbacks per task (text, first, complete)
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
      
      // Return 200 to Kie.ai (don't make them retry), but don't process
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Webhook already processed (idempotency)'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Record this webhook event for idempotency tracking
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
    console.log('🔒 All security layers passed - processing webhook for generation:', generation.id);

    // Helper: Detect if model is Midjourney variant
    const isMidjourneyModel = (modelId: string | undefined): boolean => {
      if (!modelId) return false;
      // Match any Midjourney model variant (current: mj_txt2img, future: mj_img2img, mj_upscale, etc.)
      return modelId.startsWith('mj_') || modelId.includes('midjourney');
    };

    // Helper: Normalize result URLs from various formats and map to correct type-specific fields
    const normalizeResultUrls = (payload: any, resultJson: string | null, generationType: string, modelId?: string): string[] => {
      const urls: string[] = [];
      const isMidjourney = isMidjourneyModel(modelId);
      
      // Try resultJson first (old format)
      if (resultJson) {
        try {
          const parsed = JSON.parse(resultJson);
          if (Array.isArray(parsed.resultUrls)) {
            urls.push(...parsed.resultUrls);
            console.log('📄 Normalized URLs from resultJson:', urls.length);
          } else if (parsed.resultUrl) {
            urls.push(parsed.resultUrl);
            console.log('📄 Normalized single URL from resultJson');
          }
        } catch (e) {
          console.error('Failed to parse resultJson:', e);
        }
      }
      
      // MIDJOURNEY SPECIFIC: Check for direct data.resultUrls format
      if (urls.length === 0 && isMidjourney && payload.data?.resultUrls) {
        if (Array.isArray(payload.data.resultUrls)) {
          urls.push(...payload.data.resultUrls);
          console.log('🎨 [MIDJOURNEY] Normalized URLs from data.resultUrls:', urls.length);
        }
      }
      
      // Try new data.info format (snake_case and camelCase)
      if (urls.length === 0 && payload.data?.info) {
        const info = payload.data.info;
        const infoUrls = info.result_urls ?? info.resultUrls;
        if (Array.isArray(infoUrls) && infoUrls.length > 0) {
          urls.push(...infoUrls);
          console.log('ℹ️ Normalized URLs from data.info:', urls.length);
        }
      }
      
      // Fallback to old data.data format
      if (urls.length === 0 && Array.isArray(payload.data?.data)) {
        console.log('📦 Using old data.data format');
        return []; // Return empty to signal we should use items format
      }
      
      console.log(`✅ Normalized ${urls.length} URL(s) for type: ${generationType} (model: ${modelId || 'unknown'})`);
      return urls;
    };

    // Parse items from resultJson (KIE.ai sends it as JSON string) and new data.info formats
    let items: any[] = [];
    try {
      // First try to normalize URLs
      const normalizedUrls = normalizeResultUrls(payload, resultJson, generation.type, generation.ai_models?.id);
      
      if (normalizedUrls.length > 0) {
        // Map normalized URLs to correct type-specific fields
        items = normalizedUrls.map((url: string) => {
          const item: any = {};
          
          if (generation.type === 'image') {
            item.image_url = url;
            item.source_image_url = url;
          } else if (generation.type === 'audio') {
            item.audio_url = url;
            item.source_audio_url = url;
          } else if (generation.type === 'video') {
            item.video_url = url;
            item.source_video_url = url;
          }
          
          return item;
        });
        console.log(`✅ Mapped ${items.length} URLs to ${generation.type}-specific fields`);
      } else {
        // Fallback to old data.data format (items already have type-specific fields)
        items = payload.data?.data || [];
        console.log(`📦 Using old data.data format with ${items.length} items`);
      }
    } catch (e) {
      console.error('Failed to parse and normalize results:', e);
      items = payload.data?.data || [];
    }
    
    console.log('Callback type:', callbackType, 'Items count:', items.length);
    console.log('Parsed items:', JSON.stringify(items, null, 2));

    // Support both old format (state field) and new format (code field)
    const isSuccess = state === 'success' || payload.code === 200 || (payload.msg && payload.msg.toLowerCase().includes('success'));
    const isFailed = state === 'failed' || payload.status === 400 || payload.code === 400 || payload.code === 422 || (payload.msg && payload.msg.toLowerCase().includes('fail'));

    // Handle failure
    if (isFailed) {
      // Log detailed error server-side only
      console.error('KieAI generation failure details:', {
        task_id: taskId,
        fail_msg: failMsg,
        payload_msg: payload.msg,
        generation_id: generation.id,
        full_payload: JSON.stringify(payload, null, 2)
      });
      
      // Sanitize error message for database (no sensitive details)
      const sanitizedError = (failMsg || payload.msg || 'Generation failed').substring(0, 200);
      
      // Update generation to failed with sanitized error
      const { error: updateError } = await supabase
        .from('generations')
        .update({
          status: 'failed',
          provider_response: {
            error: sanitizedError,
            error_type: 'provider_failure',
            kie_credits_consumed: consumeCredits || 0, // Should be 0 on failure
            kie_credits_remaining: remainedCredits || null,
            timestamp: new Date().toISOString()
          }
        })
        .eq('id', generation.id);

      if (updateError) {
        console.error('Failed to update generation:', updateError);
      }

      // Refund tokens
      await supabase.rpc('increment_tokens', {
        user_id_param: generation.user_id,
        amount: generation.tokens_used
      });

      console.log('Tokens refunded:', generation.tokens_used);

      // Insert audit record for failed generation
      const { error: auditError } = await supabase
        .from('kie_credit_audits')
        .insert({
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

      if (auditError) {
        console.error('Failed to insert credit audit (failure):', auditError);
        // Don't fail the webhook response, just log
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Generation marked as failed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================
    // TYPE-SPECIFIC PROCESSING PATHS
    // Each content type has independent validation and handling
    // ========================================
    
    // Helper: Check for URLs in new info/resultJson formats
    const hasUrlsInInfo = (): boolean => {
      const info = payload.data?.info;
      const urls = (info?.resultUrls ?? info?.result_urls) as string[] | undefined;
      return Array.isArray(urls) && urls.length > 0;
    };

    const hasUrlsInResultJson = (): boolean => {
      if (!resultJson) return false;
      try {
        const parsed = JSON.parse(resultJson);
        const urls = parsed?.resultUrls || (parsed?.resultUrl ? [parsed.resultUrl] : []);
        return Array.isArray(urls) && urls.length > 0;
      } catch { return false; }
    };

    // Helper: Check if image results are complete
    const hasImageResults = (items: any[]): boolean => {
      const fromItems = Array.isArray(items) && items.length > 0 &&
             items.every(item => item?.image_url || item?.source_image_url);
      return fromItems || hasUrlsInInfo() || hasUrlsInResultJson();
    };
    
    // Helper: Check if audio results are complete
    const hasAudioResults = (items: any[]): boolean => {
      const fromItems = Array.isArray(items) && items.length > 0 &&
             items.every(item => item?.audio_url || item?.source_audio_url || item?.stream_audio_url);
      return fromItems || hasUrlsInInfo() || hasUrlsInResultJson();
    };
    
    // Helper: Check if video results are complete
    const hasVideoResults = (items: any[]): boolean => {
      const fromItems = Array.isArray(items) && items.length > 0 &&
               items.every(item => item?.video_url || item?.source_video_url);
      return Boolean(payload.data?.video_url) || fromItems || hasUrlsInInfo() || hasUrlsInResultJson();
    };
    
    // Route to type-specific handler
    if (generation.type === 'image') {
      // ========================================
      // IMAGE-SPECIFIC PATH
      // ========================================
      if (hasImageResults(items)) {
        console.log('✅ Image has complete results - processing immediately');
        // Continue to success processing below
      } else if (callbackType && callbackType.toLowerCase() !== 'complete') {
        console.log(`⏸️ Partial image callback (${callbackType}) - waiting for complete results`);
        await supabase
          .from('generations')
          .update({ 
            status: 'processing', 
            provider_response: payload 
          })
          .eq('id', generation.id);

        return new Response(
          JSON.stringify({ success: true, message: `Partial image webhook (${callbackType}) acknowledged` }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } 
    else if (generation.type === 'audio') {
      // ========================================
      // AUDIO-SPECIFIC PATH
      // ========================================
      if (hasAudioResults(items)) {
        console.log(`✅ Audio has complete results (${items.length} URLs) - processing immediately`);
        // Continue to success processing below
      } else if (callbackType && callbackType.toLowerCase() !== 'complete') {
        const availableUrls = items
          .map((item: any) => item?.audio_url || item?.source_audio_url || item?.stream_audio_url)
          .filter(Boolean);
        
        console.log(`⏸️ Partial audio callback (${callbackType}) - URLs: ${availableUrls.length}/${items.length}`);
        await supabase
          .from('generations')
          .update({ 
            status: 'processing', 
            provider_response: payload 
          })
          .eq('id', generation.id);

        return new Response(
          JSON.stringify({ success: true, message: `Partial audio webhook (${callbackType}) acknowledged - waiting for all URLs` }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    else if (generation.type === 'video') {
      // ========================================
      // VIDEO-SPECIFIC PATH
      // ========================================
      if (hasVideoResults(items)) {
        console.log('✅ Video has complete results - processing immediately');
        // Continue to success processing below
      } else if (callbackType && callbackType.toLowerCase() !== 'complete') {
        console.log(`⏸️ Partial video callback (${callbackType}) - waiting for complete results`);
        await supabase
          .from('generations')
          .update({ 
            status: 'processing', 
            provider_response: payload 
          })
          .eq('id', generation.id);

        return new Response(
          JSON.stringify({ success: true, message: `Partial video webhook (${callbackType}) acknowledged` }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    console.log(`🎯 Proceeding to success processing for ${generation.type}`);

    // Handle success (support multiple formats including Kie.ai items-based format)
    const hasMidjourneyResults = isMidjourneyModel(generation.ai_models?.id) && 
                                  payload.data?.resultUrls && 
                                  Array.isArray(payload.data.resultUrls);
    
    if (isSuccess && (resultJson || payload.data?.info || hasMidjourneyResults || video_url || (Array.isArray(items) && items.length > 0))) {
      console.log('🎯 Processing successful generation - callbackType:', callbackType);
      console.log('📊 Items array length:', items.length);
      
      // Support multiple URL formats
      let resultUrls: string[] = [];
      
      if (video_url) {
        // Direct video_url field
        resultUrls = [video_url];
        console.log('📹 Using direct video_url:', video_url);
      } else if (isMidjourneyModel(generation.ai_models?.id) && payload.data?.resultUrls) {
        // MIDJOURNEY: Direct data.resultUrls format
        resultUrls = Array.isArray(payload.data.resultUrls) ? payload.data.resultUrls : [];
        console.log('🎨 [MIDJOURNEY] Using data.resultUrls format, URLs found:', resultUrls.length);
      } else if (resultJson) {
        // Old format: parse resultJson
        const result = JSON.parse(resultJson);
        resultUrls = result.resultUrls || [result.resultUrl].filter(Boolean);
        console.log('📄 Using resultJson format, URLs found:', resultUrls.length);
      } else if (payload.data?.info) {
        // New format: use data.info
        resultUrls = payload.data.info.resultUrls || payload.data.info.result_urls || [];
        console.log('ℹ️ Using data.info format, URLs found:', resultUrls.length);
      } else if (Array.isArray(items) && items.length > 0) {
        // Kie.ai items-based format - extract URLs based on generation type
        console.log('🔍 Processing Kie.ai items-based format');
        console.log('📦 Generation type:', generation.type);
        console.log('📦 Items count:', items.length);
        
        // Log each item's structure for debugging
        items.forEach((item: any, idx: number) => {
          console.log(`📦 Item ${idx + 1} keys:`, Object.keys(item));
          if (generation.type === 'audio') {
            console.log(`🎵 Item ${idx + 1} audio fields:`, {
              audio_url: item?.audio_url || 'EMPTY',
              source_audio_url: item?.source_audio_url || 'EMPTY',
              stream_audio_url: item?.stream_audio_url || 'EMPTY'
            });
          }
        });
        
        if (generation.type === 'audio') {
          // For audio: prefer audio_url, fallback to source_audio_url, then stream_audio_url
          resultUrls = items
            .map((item: any) => item?.audio_url || item?.source_audio_url || item?.stream_audio_url)
            .filter(Boolean);
          console.log('🎵 Extracted audio URLs:', resultUrls);
          console.log('🎵 Audio URLs count:', resultUrls.length);
        } else if (generation.type === 'image') {
          // For images: prefer image_url, fallback to source_image_url
          resultUrls = items
            .map((item: any) => item?.image_url || item?.source_image_url)
            .filter(Boolean);
          console.log('🖼️ Extracted image URLs:', resultUrls);
          console.log('🖼️ Image URLs count:', resultUrls.length);
        } else {
          // For video/other: try multiple fields
          resultUrls = items
            .map((item: any) => item?.video_url || item?.source_video_url || item?.url)
            .filter(Boolean);
          console.log('🎬 Extracted video/other URLs:', resultUrls);
          console.log('🎬 Video URLs count:', resultUrls.length);
        }
      }

      if (resultUrls.length === 0) {
        console.error('❌ No result URLs found. Payload keys:', Object.keys(payload.data || {}));
        console.error('❌ Items sample:', items[0] ? Object.keys(items[0]) : 'No items');
        console.error('❌ Full items array:', JSON.stringify(items, null, 2));
        throw new Error('No result URLs found in response');
      }

      console.log(`✅ Found ${resultUrls.length} output(s) to process`);

      // For multi-output, we'll create children for ALL URLs and keep parent as container
      // For single-output, we'll update the parent with the one result
      const isMultiOutput = resultUrls.length > 1;
      
      let storagePath: string | null = null;
      let publicUrl: string | null = null;
      let output_data: Uint8Array | null = null;
      
      if (!isMultiOutput) {
        // Single output: download and upload for parent generation
        try {
          const firstUrl = resultUrls[0];
          console.log('Single output: Downloading result from:', firstUrl);

          const contentResponse = await fetch(firstUrl);
          if (!contentResponse.ok) {
            throw new Error(`Failed to download result: ${contentResponse.status}`);
          }

          const arrayBuffer = await contentResponse.arrayBuffer();
          output_data = new Uint8Array(arrayBuffer);
          
          // Determine file extension
          const contentType = contentResponse.headers.get('content-type') || '';
          const fileExtension = determineFileExtension(contentType, firstUrl);
          
          console.log('Downloaded successfully. Size:', output_data.length, 'Extension:', fileExtension);

          // Upload to storage - wrapped in try-catch for resilience
          try {
            storagePath = await uploadToStorage(
              supabase,
              generation.user_id,
              generation.id,
              output_data,
              fileExtension,
              generation.type
            );

            console.log('✅ Uploaded to storage:', storagePath);

            // Generate public URL since bucket is public
            const urlData = await supabase
              .storage
              .from('generated-content')
              .getPublicUrl(storagePath);

            publicUrl = urlData?.data?.publicUrl || null;
            console.log('✅ Generated public URL:', publicUrl);
            
          } catch (storageError: any) {
            console.error('❌ Storage upload failed (marking generation as failed):', storageError);
            console.error('❌ Full storage error:', JSON.stringify(storageError, null, 2));
            
            // Mark generation as failed immediately
            await supabase.from('generations').update({
              status: 'failed',
              provider_response: {
                error: 'Storage upload failed after generation completed',
                storage_error: storageError.message || 'Unknown storage error',
                timestamp: new Date().toISOString()
              }
            }).eq('id', generation.id);
            
            // Refund tokens
            await supabase.rpc('increment_tokens', {
              user_id_param: generation.user_id,
              amount: generation.tokens_used
            });
            
            console.log('🔄 Tokens refunded due to storage failure');
            
            // Return success to provider (don't retry)
            return new Response(
              JSON.stringify({ 
                success: true, 
                message: 'Generation completed but storage failed - user refunded' 
              }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
        } catch (downloadError: any) {
          // Download from provider failed
          console.error('❌ Failed to download result from provider:', downloadError);
          console.error('❌ Full download error:', JSON.stringify(downloadError, null, 2));
          
          await supabase.from('generations').update({
            status: 'failed',
            provider_response: {
              error: 'Failed to download result from provider',
              download_error: downloadError.message || 'Unknown download error',
              timestamp: new Date().toISOString()
            }
          }).eq('id', generation.id);
          
          // Refund tokens
          await supabase.rpc('increment_tokens', {
            user_id_param: generation.user_id,
            amount: generation.tokens_used
          });
          
          console.log('🔄 Tokens refunded due to download failure');
          
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Download from provider failed - user refunded' 
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        console.log('Multi-output: Parent will be a container, children will be created for all URLs');
      }

      // Compare our token calculation with Kie's actual charges (before completion)
      if (consumeCredits !== undefined && consumeCredits !== generation.tokens_used) {
        console.warn('Credit mismatch detected:', {
          generation_id: generation.id,
          our_tokens: generation.tokens_used,
          kie_credits: consumeCredits,
          difference: Math.abs(generation.tokens_used - consumeCredits)
        });
      }

      // Insert audit record for credit tracking (before completion)
      const { error: auditError } = await supabase
        .from('kie_credit_audits')
        .insert({
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

      if (auditError) {
        console.error('Failed to insert credit audit (success):', auditError);
        // Don't fail the generation, just log
      }

      // Process child outputs for multi-output tasks BEFORE marking parent as complete
      console.log(`🔄 Checking for child outputs. Total URLs: ${resultUrls.length}, Multi-output: ${isMultiOutput}`);
      
      if (isMultiOutput) {
        console.log(`🎉 Multi-output task! Creating ${resultUrls.length} child generation(s)`);
        console.log(`📋 All URLs:`, resultUrls);
        
        // Check existing children for idempotency
        const { data: existingChildren, error: checkError } = await supabase
          .from('generations')
          .select('output_index')
          .eq('parent_generation_id', generation.id)
          .order('output_index', { ascending: true });
        
        if (checkError) {
          console.error('⚠️ Failed to check existing children:', checkError);
        }
        
        const existingIndexes = new Set(existingChildren?.map(c => c.output_index) || []);
        console.log(`📊 Existing child indexes:`, Array.from(existingIndexes));
        
        // Create children for ALL URLs starting from index 0
        for (let i = 0; i < resultUrls.length; i++) {
          // Skip if this index already exists
          if (existingIndexes.has(i)) {
            console.log(`⏭️ [Output ${i + 1}] Skipping - already exists`);
            continue;
          }
          
          try {
            const url = resultUrls[i];
            console.log(`⬇️ [Output ${i + 1}/${resultUrls.length}] Starting download from:`, url);

            const response = await fetch(url);
            if (!response.ok) {
              console.error(`❌ [Output ${i + 1}] Download failed with status:`, response.status);
              continue;
            }

            const buffer = await response.arrayBuffer();
            const data = new Uint8Array(buffer);
            const type = response.headers.get('content-type') || '';
            const ext = determineFileExtension(type, url);

            console.log(`✅ [Output ${i + 1}] Downloaded successfully. Size: ${data.length} bytes, Extension: ${ext}`);

            // Create a unique ID for this child generation
            const childId = crypto.randomUUID();
            console.log(`🆔 [Output ${i + 1}] Generated child ID:`, childId);

            // TRY to upload to storage - gracefully handle failure
            let childStoragePath: string | null = null;
            let childPublicUrl: string | null = null;
            
            try {
              childStoragePath = await uploadToStorage(
                supabase,
                generation.user_id,
                childId,
                data,
                ext,
                generation.type
              );
              console.log(`☁️ [Output ${i + 1}] Uploaded to storage:`, childStoragePath);

              const { data: childUrlData } = supabase
                .storage
                .from('generated-content')
                .getPublicUrl(childStoragePath);
              childPublicUrl = childUrlData?.publicUrl || null;
              console.log(`🔗 [Output ${i + 1}] Public URL:`, childPublicUrl);
              
            } catch (storageError: any) {
              console.error(`❌ [Output ${i + 1}] Storage upload failed:`, storageError.message);
              console.error(`❌ [Output ${i + 1}] Full storage error:`, JSON.stringify(storageError, null, 2));
              // Continue without this child - better to have some outputs than none
              continue;
            }

            // Create child generation record only if storage succeeded
            const { data: insertData, error: insertError } = await supabase
              .from('generations')
              .insert({
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
                tokens_used: 0, // Don't double-charge tokens
                status: 'completed',
                storage_path: childStoragePath,
                output_url: childPublicUrl,
                file_size_bytes: data.length,
                provider_task_id: generation.provider_task_id,
                provider_request: generation.provider_request,
                provider_response: payload,
                parent_generation_id: generation.id,
                output_index: i,
                is_batch_output: true
              })
              .select();

            if (insertError) {
              console.error(`❌ [Output ${i + 1}] Failed to create child generation:`, insertError);
              console.error(`❌ [Output ${i + 1}] Insert error details:`, JSON.stringify(insertError, null, 2));
            } else {
              console.log(`✅ [Output ${i + 1}] Child generation created successfully!`);
              console.log(`✅ [Output ${i + 1}] Child generation ID:`, childId);
              console.log(`✅ [Output ${i + 1}] Parent generation ID:`, generation.id);
              console.log(`✅ [Output ${i + 1}] Output index:`, i);
            }
          } catch (childError: any) {
            console.error(`❌ [Output ${i + 1}] Error processing:`, childError.message);
            console.error(`❌ [Output ${i + 1}] Full error:`, JSON.stringify(childError, null, 2));
            console.error(`❌ [Output ${i + 1}] Stack trace:`, childError.stack);
            // Continue to next output - don't let one failure block all outputs
          }
        }
        
        console.log(`✅ Finished processing all ${resultUrls.length} child output(s)`);
      } else {
        console.log(`ℹ️ Single-output task - no children needed`);
      }

      // NOW update parent generation to completed (after all children are created)
      console.log('🎯 All outputs processed. Now marking parent as completed...');
      
      // For multi-output tasks, keep parent as container (no storage_path)
      // For single-output tasks, set the storage path
      const updateData: any = {
        status: 'completed',
        file_size_bytes: output_data ? output_data.length : null,
        provider_response: {
          ...payload,
          // Extract key metrics for easy querying
          kie_credits_consumed: consumeCredits || null,
          kie_credits_remaining: remainedCredits || null,
          kie_processing_time_seconds: costTime || null,
          our_tokens_charged: generation.tokens_used, // For comparison
          timestamp: new Date().toISOString()
        },
        output_index: 0,
        is_batch_output: isMultiOutput
      };
      
      // Only set storage_path and output_url for single-output tasks
      if (!isMultiOutput && storagePath) {
        updateData.storage_path = storagePath;
        updateData.output_url = publicUrl;
        console.log('📝 Single output - setting parent storage_path:', storagePath);
      } else {
        console.log('📦 Multi-output - keeping parent as container (no storage_path)');
      }
      
      const { error: updateError } = await supabase
        .from('generations')
        .update(updateData)
        .eq('id', generation.id);

      if (updateError) {
        console.error('Failed to update generation:', updateError);
        throw updateError;
      }

      console.log('✅ Parent generation marked as completed:', generation.id);

      // === WORKFLOW ORCHESTRATION ===
      // Check if this generation is part of a workflow execution
      if (generation.workflow_execution_id && generation.workflow_step_number) {
        console.log('[orchestrator] Generation is part of workflow execution:', generation.workflow_execution_id);
        console.log('[orchestrator] Completed step:', generation.workflow_step_number);

        try {
          // Fetch workflow execution and template
          const { data: workflowExecution, error: execError } = await supabase
            .from('workflow_executions')
            .select('*, workflow_templates(*)')
            .eq('id', generation.workflow_execution_id)
            .single();

          if (execError || !workflowExecution) {
            console.error('[orchestrator] Failed to fetch workflow execution:', execError);
          } else {
            const currentStepNumber = generation.workflow_step_number;
            const template = workflowExecution.workflow_templates as any;
            const steps = template.workflow_steps as any[];
            const totalSteps = steps.length;
            const currentStep = steps.find((s: any) => s.step_number === currentStepNumber);

            console.log('[orchestrator] Current step:', currentStepNumber, '/', totalSteps);

            // Determine output storage path (prefer storage_path, fallback to output_url)
            let stepOutputPath = storagePath || generation.storage_path;
            if (!stepOutputPath && isMultiOutput) {
              // For multi-output, use first child's storage_path
              const { data: firstChild } = await supabase
                .from('generations')
                .select('storage_path, output_url')
                .eq('parent_generation_id', generation.id)
                .eq('output_index', 0)
                .maybeSingle();
              stepOutputPath = firstChild?.storage_path || firstChild?.output_url || null;
              console.log('[orchestrator] Multi-output: using first child path:', stepOutputPath);
            }

            // Update step_outputs with current step result
            const existingOutputs = (workflowExecution.step_outputs as Record<string, any>) || {};
            const updatedOutputs = {
              ...existingOutputs,
              [`step${currentStepNumber}`]: {
                [currentStep?.output_key || 'output']: stepOutputPath,
                generation_id: generation.id,
              },
            };

            // Update tokens used
            const currentTokens = (workflowExecution.tokens_used as number) || 0;
            const newTokens = currentTokens + (generation.tokens_used || 0);

            // Check if there are more steps
            if (currentStepNumber < totalSteps) {
              const nextStepNumber = currentStepNumber + 1;
              const nextStep = steps.find((s: any) => s.step_number === nextStepNumber);
              
              console.log('[orchestrator] More steps remaining. Starting step:', nextStepNumber);

              // Update execution with progress
              await supabase
                .from('workflow_executions')
                .update({
                  step_outputs: updatedOutputs,
                  tokens_used: newTokens,
                  current_step: nextStepNumber,
                })
                .eq('id', generation.workflow_execution_id);

              // Build context for next step
              const context = {
                user: workflowExecution.user_inputs,
                ...updatedOutputs,
              };

              // Resolve input mappings for next step
              const resolvedMappings = resolveInputMappings(
                nextStep.input_mappings || {},
                context
              );

              const allParameters = { ...nextStep.parameters, ...resolvedMappings };

              // Coerce parameters to schema
              let coercedParameters = allParameters;
              try {
                if (nextStep.model_record_id) {
                  const { data: modelData } = await supabase
                    .from('ai_models')
                    .select('input_schema')
                    .eq('record_id', nextStep.model_record_id)
                    .single();
                  if (modelData?.input_schema) {
                    coercedParameters = coerceParametersToSchema(allParameters, modelData.input_schema);
                  }
                }
              } catch (e) {
                console.warn('[orchestrator] Schema coercion skipped:', e);
              }

              // Sanitize parameters
              const sanitizedParameters = await sanitizeParametersForProviders(
                coercedParameters,
                workflowExecution.user_id,
                supabase
              );

              // Generate prompt for next step
              let resolvedPrompt: string;
              if (sanitizedParameters.prompt) {
                const promptString = typeof sanitizedParameters.prompt === 'string'
                  ? sanitizedParameters.prompt
                  : String(sanitizedParameters.prompt);
                resolvedPrompt = replaceTemplateVariables(promptString, context);
              } else {
                resolvedPrompt = replaceTemplateVariables(nextStep.prompt_template, context);
              }

              console.log('[orchestrator] Resolved prompt for step', nextStepNumber, ':', resolvedPrompt);

              // Start next step
              const generateResponse = await supabase.functions.invoke('generate-content', {
                body: {
                  model_id: nextStep.model_id,
                  model_record_id: nextStep.model_record_id,
                  prompt: resolvedPrompt,
                  custom_parameters: sanitizedParameters,
                  workflow_execution_id: generation.workflow_execution_id,
                  workflow_step_number: nextStepNumber,
                },
              });

              if (generateResponse.error) {
                console.error('[orchestrator] Failed to start next step:', generateResponse.error);
                await supabase
                  .from('workflow_executions')
                  .update({
                    status: 'failed',
                    error_message: `Step ${nextStepNumber} failed to start: ${generateResponse.error.message}`,
                  })
                  .eq('id', generation.workflow_execution_id);
              } else {
                console.log('[orchestrator] Step', nextStepNumber, 'started successfully');
              }
            } else {
              // All steps completed
              console.log('[orchestrator] All steps completed. Finalizing workflow...');

              // Extract final output
              const finalOutput = updatedOutputs[`step${totalSteps}`];
              const finalOutputUrl = finalOutput
                ? finalOutput[Object.keys(finalOutput).find(k => k !== 'generation_id') || 'output']
                : null;

              console.log('[orchestrator] Final output URL:', finalOutputUrl);

              // Mark workflow as completed
              await supabase
                .from('workflow_executions')
                .update({
                  status: 'completed',
                  step_outputs: updatedOutputs,
                  tokens_used: newTokens,
                  final_output_url: finalOutputUrl,
                  completed_at: new Date().toISOString(),
                })
                .eq('id', generation.workflow_execution_id);

              console.log('[orchestrator] Workflow execution completed:', generation.workflow_execution_id);
            }
          }
        } catch (orchestrationError: any) {
          console.error('[orchestrator] Error in workflow orchestration:', orchestrationError);
          // Don't fail the entire webhook - the generation is complete
        }
      }

      // Log audit
      await supabase.from('audit_logs').insert({
        user_id: generation.user_id,
        action: 'generation_completed',
        resource_type: 'generation',
        resource_id: generation.id,
        metadata: {
          model_id: generation.model_id,
          tokens_used: generation.tokens_used,
          file_size: output_data?.length || null,
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

    // Unknown state
    console.warn('Unknown webhook state - code:', payload.code, 'msg:', payload.msg);
    return new Response(
      JSON.stringify({ success: true, message: 'Webhook received but state unknown' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    return createSafeErrorResponse(error, 'kie-ai-webhook', corsHeaders);
  }
});

// Helper functions for workflow orchestration
function replaceTemplateVariables(template: string, context: Record<string, any>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const value = getNestedValue(context, path.trim());
    return value ?? match;
  });
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

function resolveInputMappings(mappings: Record<string, string>, context: Record<string, any>): Record<string, any> {
  const resolved: Record<string, any> = {};
  for (const [paramKey, rawMapping] of Object.entries(mappings)) {
    let mapping = rawMapping;
    if (typeof mapping === 'string') {
      mapping = mapping.replace(/^user_input\./, 'user.');
    }
    let value = getNestedValue(context, mapping as string);
    if ((value === undefined || value === null) && typeof rawMapping === 'string') {
      const alternate = rawMapping.startsWith('user.') ? rawMapping.replace(/^user\./, 'user_input.') : rawMapping.replace(/^user_input\./, 'user.');
      value = getNestedValue(context, alternate);
    }
    if (value !== undefined && value !== null) {
      resolved[paramKey] = value;
    }
  }
  return resolved;
}

function coerceParametersToSchema(params: Record<string, any>, inputSchema: any): Record<string, any> {
  if (!inputSchema || typeof inputSchema !== 'object') return params;
  const props = (inputSchema as any).properties || {};
  const out: Record<string, any> = { ...params };
  for (const [key, schema] of Object.entries<any>(props)) {
    if (!(key in out)) continue;
    out[key] = coerceValueToSchema(out[key], schema);
  }
  return out;
}

function coerceValueToSchema(value: any, schema: any): any {
  const declaredType = Array.isArray(schema?.type) ? schema.type[0] : schema?.type;
  if (!declaredType) return value;
  switch (declaredType) {
    case 'array': return Array.isArray(value) ? value : (value === undefined || value === null) ? value : [value];
    case 'string': return (value === undefined || value === null) ? value : Array.isArray(value) ? String(value[0]) : typeof value === 'string' ? value : String(value);
    case 'number': case 'integer': {
      if (value === undefined || value === null) return value;
      const n = Array.isArray(value) ? parseFloat(value[0]) : parseFloat(value);
      return Number.isNaN(n) ? value : n;
    }
    case 'boolean': {
      let v = value;
      if (Array.isArray(v)) v = v[0];
      if (typeof v === 'boolean') return v;
      if (typeof v === 'string') {
        const s = v.toLowerCase();
        if (s === 'true') return true;
        if (s === 'false') return false;
      }
      return !!v;
    }
    default: return value;
  }
}

async function sanitizeParametersForProviders(params: Record<string, any>, userId: string, supabaseClient: any): Promise<Record<string, any>> {
  const mediaKeys = ['image_url', 'image_urls', 'input_image', 'reference_image', 'mask_image', 'image', 'images'];
  const processed = { ...params };
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string' && value.startsWith('data:image/')) {
      const matches = value.match(/^data:(.+);base64,(.+)$/);
      if (matches) {
        const contentType = matches[1], base64Data = matches[2];
        const ext = contentType.split('/')[1] || 'jpg';
        const fileName = `workflow-input-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        const filePath = `${userId}/${fileName}`;
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
        await supabaseClient.storage.from('generated-content').upload(filePath, bytes, { contentType, upsert: false });
        const { data: urlData } = await supabaseClient.storage.from('generated-content').createSignedUrl(filePath, 86400);
        processed[key] = urlData?.signedUrl || value;
      }
    }
  }
  return processed;
}

async function uploadToStorage(
  supabase: SupabaseClient,
  userId: string,
  generationId: string,
  fileData: Uint8Array,
  fileExtension: string,
  contentType: string
): Promise<string> {
  // Create folder structure: {user_id}/{YYYY-MM-DD}/{generation_id}.ext
  const date = new Date();
  const dateFolder = date.toISOString().split('T')[0]; // YYYY-MM-DD
  const fileName = `${generationId}.${fileExtension}`;
  const storagePath = `${userId}/${dateFolder}/${fileName}`;
  
  console.log('📤 Uploading to storage:', storagePath, 'Size:', fileData.length);

  // Determine MIME type
  const mimeType = getMimeType(fileExtension, contentType);
  console.log('📄 MIME type:', mimeType);
  
  const { error: uploadError } = await supabase.storage
    .from('generated-content')
    .upload(storagePath, fileData, {
      contentType: mimeType,
      cacheControl: '3600',
      upsert: false
    });

  if (uploadError) {
    // Log detailed error for debugging (handles both JSON and HTML responses)
    console.error('❌ Storage upload error details:', {
      message: uploadError.message,
      statusCode: (uploadError as any).statusCode,
      error: (uploadError as any).error,
      fullError: JSON.stringify(uploadError, null, 2)
    });
    
    // Throw with clear message (will be caught by calling code)
    throw new Error(`Storage upload failed: ${uploadError.message || 'Unknown error'}`);
  }

  console.log('✅ Storage upload successful:', storagePath);
  return storagePath;
}

function getMimeType(extension: string, contentType: string): string {
  const extToMime: Record<string, string> = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'webp': 'image/webp',
    'gif': 'image/gif',
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'mov': 'video/quicktime',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'txt': 'text/plain'
  };

  const mimeFromExt = extToMime[extension.toLowerCase()];
  if (mimeFromExt) return mimeFromExt;

  if (contentType === 'image') return 'image/png';
  if (contentType === 'video') return 'video/mp4';
  if (contentType === 'audio') return 'audio/mpeg';
  if (contentType === 'text') return 'text/plain';

  return 'application/octet-stream';
}

function determineFileExtension(contentType: string, url: string): string {
  if (url) {
    const match = url.match(/\.([a-z0-9]+)(?:\?|$)/i);
    if (match) return match[1];
  }
  
  const mimeToExt: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/ogg': 'ogg',
    'text/plain': 'txt'
  };
  
  return mimeToExt[contentType.toLowerCase()] || 'mp4';
}
