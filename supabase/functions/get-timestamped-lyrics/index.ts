import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { createSafeErrorResponse } from "../_shared/error-handler.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { KIE_AI_ENDPOINTS } from "../_shared/api-endpoints.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const LYRICS_FETCH_COST = 0.5;

// Request validation schema
const GetLyricsRequestSchema = z.object({
  generation_id: z.string().uuid(),
  output_index: z.number().int().min(0).default(0),
});

// Lyrics response type
interface LyricsLine {
  text: string;
  start_time: number;
  end_time: number;
}

interface LyricsResponse {
  lyrics: LyricsLine[];
  raw_text?: string;
}

Deno.serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const logger = new EdgeLogger('get-timestamped-lyrics', requestId, supabase, true);

    // Validate request body
    const requestBody = await req.json();
    const { generation_id, output_index } = GetLyricsRequestSchema.parse(requestBody);

    logger.info('Lyrics fetch started', {
      metadata: { generation_id, output_index }
    });

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Fetch the generation to verify ownership and get provider info
    const { data: generation, error: genError } = await supabase
      .from('generations')
      .select('id, user_id, provider_task_id, parent_generation_id, provider_response, type')
      .eq('id', generation_id)
      .single();

    if (genError || !generation) {
      logger.error('Generation not found', genError instanceof Error ? genError : new Error('Generation not found'), { metadata: { generation_id } });
      throw new Error('Generation not found');
    }

    // Verify ownership
    if (generation.user_id !== user.id) {
      throw new Error('You do not have permission to access this generation');
    }

    // Check and deduct credits
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('tokens_remaining')
      .eq('user_id', user.id)
      .single();

    if (subError || !subscription) {
      throw new Error('Failed to fetch user subscription');
    }

    if (subscription.tokens_remaining < LYRICS_FETCH_COST) {
      throw new Error(`Insufficient credits. ${LYRICS_FETCH_COST} credits required for lyrics fetch.`);
    }

    // Deduct credits atomically
    const { data: deductResult, error: deductError } = await supabase
      .rpc('deduct_user_tokens', { p_user_id: user.id, p_cost: LYRICS_FETCH_COST });

    if (deductError) {
      logger.error('Credit deduction failed', deductError instanceof Error ? deductError : new Error(String(deductError) || 'Database error'), { userId: user.id });
      throw new Error('Failed to deduct credits - database error');
    }

    const deductResultData = deductResult?.[0];
    if (!deductResultData?.success) {
      logger.error('Credit deduction rejected', undefined, {
        userId: user.id,
        metadata: { error: deductResultData?.error_message, cost: LYRICS_FETCH_COST }
      });
      throw new Error(deductResultData?.error_message || 'Failed to deduct credits');
    }

    logger.info('Credits deducted for lyrics fetch', {
      userId: user.id,
      metadata: {
        tokens_deducted: LYRICS_FETCH_COST,
        new_balance: deductResultData?.tokens_remaining
      }
    });

    // Log to audit_logs
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'tokens_deducted',
      metadata: {
        tokens_deducted: LYRICS_FETCH_COST,
        tokens_remaining: deductResultData?.tokens_remaining,
        generation_id,
        operation: 'lyrics_fetch'
      }
    });

    // Get taskId and audioId
    let taskId: string | null = null;
    let audioId: string | null = null;

    // Check if this is a child generation with a parent
    if (generation.parent_generation_id) {
      // Fetch parent to get provider_response
      const { data: parentGen, error: parentError } = await supabase
        .from('generations')
        .select('provider_task_id, provider_response')
        .eq('id', generation.parent_generation_id)
        .single();

      if (parentError || !parentGen) {
        logger.error('Parent generation not found', parentError instanceof Error ? parentError : new Error('Parent not found'), { metadata: { parent_id: generation.parent_generation_id } });
        throw new Error('Parent generation not found');
      }

      taskId = parentGen.provider_task_id;
      
      // Extract audioId from provider_response.data.data[output_index].id
      const providerResponse = parentGen.provider_response as Record<string, unknown> | null;
      const dataWrapper = providerResponse?.data as Record<string, unknown> | null;
      const dataArray = dataWrapper?.data as Array<{ id?: string }> | null;
      
      if (dataArray && Array.isArray(dataArray) && dataArray[output_index]) {
        audioId = dataArray[output_index].id || null;
      }
    } else {
      // This is the parent generation itself
      taskId = generation.provider_task_id;
      
      const providerResponse = generation.provider_response as Record<string, unknown> | null;
      const dataWrapper = providerResponse?.data as Record<string, unknown> | null;
      const dataArray = dataWrapper?.data as Array<{ id?: string }> | null;
      
      if (dataArray && Array.isArray(dataArray) && dataArray[output_index]) {
        audioId = dataArray[output_index].id || null;
      }
    }

    if (!taskId || !audioId) {
      logger.error('Missing taskId or audioId', undefined, {
        metadata: { taskId, audioId, generation_id, output_index }
      });
      throw new Error('Unable to retrieve audio identifiers. This audio may not support lyrics extraction.');
    }

    logger.info('Fetching lyrics from Kie.ai', {
      metadata: { taskId, audioId }
    });

    // Call Kie.ai API for timestamped lyrics
    const kieApiKey = Deno.env.get('KIE_AI_API_KEY_PROMPT_TO_AUDIO');
    if (!kieApiKey) {
      throw new Error('KIE_AI_API_KEY_PROMPT_TO_AUDIO not configured');
    }

    const lyricsUrl = `${KIE_AI_ENDPOINTS.BASE}/api/v1/generate/get-timestamped-lyrics`;
    
    const lyricsResponse = await fetch(lyricsUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${kieApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taskId,
        audioId,
      }),
    });

    if (!lyricsResponse.ok) {
      const errorText = await lyricsResponse.text();
      logger.error('Kie.ai lyrics API failed', undefined, {
        metadata: { status: lyricsResponse.status, error: errorText }
      });
      throw new Error(`Lyrics API failed: ${lyricsResponse.status}`);
    }

    const lyricsData = await lyricsResponse.json();
    
    logger.logDuration('Lyrics fetch completed', startTime, {
      metadata: { 
        generation_id,
        has_lyrics: Boolean(lyricsData?.data?.lyrics || lyricsData?.lyrics)
      }
    });

    // Return the lyrics data
    return new Response(
      JSON.stringify({
        success: true,
        data: lyricsData?.data || lyricsData,
        credits_used: LYRICS_FETCH_COST,
        credits_remaining: deductResultData?.tokens_remaining,
      }),
      { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return createSafeErrorResponse(error, 'get-timestamped-lyrics', responseHeaders);
  }
});
