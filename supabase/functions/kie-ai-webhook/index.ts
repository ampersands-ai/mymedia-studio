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
        .select('*, ai_models(model_name, estimated_time_seconds)')
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

    // Helper: Normalize result URLs from various formats and map to correct type-specific fields
    const normalizeResultUrls = (payload: any, resultJson: string | null, generationType: string): string[] => {
      const urls: string[] = [];
      
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
      
      console.log(`✅ Normalized ${urls.length} URL(s) for type: ${generationType}`);
      return urls;
    };

    // Parse items from resultJson (KIE.ai sends it as JSON string) and new data.info formats
    let items: any[] = [];
    try {
      // First try to normalize URLs
      const normalizedUrls = normalizeResultUrls(payload, resultJson, generation.type);
      
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
    if (isSuccess && (resultJson || payload.data?.info || video_url || (Array.isArray(items) && items.length > 0))) {
      console.log('🎯 Processing successful generation - callbackType:', callbackType);
      console.log('📊 Items array length:', items.length);
      
      // Support multiple URL formats
      let resultUrls: string[] = [];
      
      if (video_url) {
        // Direct video_url field
        resultUrls = [video_url];
        console.log('📹 Using direct video_url:', video_url);
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

      // Process first output (update parent generation)
      const firstUrl = resultUrls[0];
      console.log('Downloading first result from:', firstUrl);

      const contentResponse = await fetch(firstUrl);
      if (!contentResponse.ok) {
        throw new Error(`Failed to download result: ${contentResponse.status}`);
      }

      const arrayBuffer = await contentResponse.arrayBuffer();
      const output_data = new Uint8Array(arrayBuffer);
      
      // Determine file extension
      const contentType = contentResponse.headers.get('content-type') || '';
      const fileExtension = determineFileExtension(contentType, firstUrl);
      
      console.log('Downloaded successfully. Size:', output_data.length, 'Extension:', fileExtension);

      // Upload to storage
      const storagePath = await uploadToStorage(
        supabase,
        generation.user_id,
        generation.id,
        output_data,
        fileExtension,
        generation.type
      );

      console.log('Uploaded to storage:', storagePath);

      // Generate public URL since bucket is public
      const { data: urlData } = await supabase
        .storage
        .from('generated-content')
        .getPublicUrl(storagePath);

      const publicUrl = urlData?.publicUrl || null;
      console.log('Generated public URL:', publicUrl);

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

      // Process additional outputs (2nd, 3rd, etc.) BEFORE marking parent as complete
      console.log(`🔄 Checking for additional outputs. Total URLs: ${resultUrls.length}`);
      
      if (resultUrls.length > 1) {
        console.log(`🎉 Found ${resultUrls.length - 1} additional output(s) to process!`);
        console.log(`📋 Additional URLs:`, resultUrls.slice(1));
        
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
        
        for (let i = 1; i < resultUrls.length; i++) {
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

            // Upload child output to storage
            const childStoragePath = await uploadToStorage(
              supabase,
              generation.user_id,
              childId,
              data,
              ext,
              generation.type
            );

            console.log(`☁️ [Output ${i + 1}] Uploaded to storage:`, childStoragePath);

            // Generate public URL for child output
            const { data: childUrlData } = supabase
              .storage
              .from('generated-content')
              .getPublicUrl(childStoragePath);

            const childPublicUrl = childUrlData?.publicUrl || null;
            console.log(`🔗 [Output ${i + 1}] Generated public URL:`, childPublicUrl);

            // Create child generation record
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
            console.error(`❌ [Output ${i + 1}] Full error:`, childError);
            console.error(`❌ [Output ${i + 1}] Stack trace:`, childError.stack);
          }
        }
        
        console.log(`✅ Finished processing all ${resultUrls.length - 1} additional output(s)`);
      } else {
        console.log(`ℹ️ No additional outputs to process (only 1 URL found)`);
      }

      // NOW update parent generation to completed (after all children are created)
      console.log('🎯 All outputs processed. Now marking parent as completed...');
      
      // For multi-output tasks, keep parent as container (no storage_path)
      const updateData: any = {
        status: 'completed',
        file_size_bytes: output_data.length,
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
        is_batch_output: resultUrls.length > 1
      };
      
      // Only set storage_path and output_url for single-output tasks
      if (resultUrls.length === 1) {
        updateData.storage_path = storagePath;
        updateData.output_url = publicUrl;
        console.log('📝 Single output - setting parent storage_path');
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

      // Log audit
      await supabase.from('audit_logs').insert({
        user_id: generation.user_id,
        action: 'generation_completed',
        resource_type: 'generation',
        resource_id: generation.id,
        metadata: {
          model_id: generation.model_id,
          tokens_used: generation.tokens_used,
          file_size: output_data.length,
          total_outputs: resultUrls.length,
          webhook_callback: true
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
  
  console.log('Uploading to storage:', storagePath, 'Size:', fileData.length);

  // Determine MIME type
  const mimeType = getMimeType(fileExtension, contentType);
  
  const { error: uploadError } = await supabase.storage
    .from('generated-content')
    .upload(storagePath, fileData, {
      contentType: mimeType,
      cacheControl: '3600',
      upsert: false
    });

  if (uploadError) {
    console.error('Storage upload error:', uploadError);
    throw new Error(`Failed to upload to storage: ${uploadError.message}`);
  }

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
