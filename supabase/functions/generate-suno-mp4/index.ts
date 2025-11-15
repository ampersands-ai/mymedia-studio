
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createSafeErrorResponse } from "../_shared/error-handler.ts";
import { EdgeLogger } from "../_shared/edge-logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const logger = new EdgeLogger('generate-suno-mp4', requestId, supabaseClient, true);

    // Explicitly extract and validate JWT token from Authorization header
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    
    logger.debug('Auth header received', { metadata: { hasAuth: !!authHeader, tokenLen: token.length } });

    if (!token) {
      return new Response(
        JSON.stringify({ 
          error: 'Authentication required', 
          details: 'Missing bearer token' 
        }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Pass token explicitly to getUser to ensure proper authentication
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      logger.error('Authentication failed via token', authError instanceof Error ? authError : new Error('Auth failed'));
      return new Response(
        JSON.stringify({
          error: 'Authentication failed',
          details: 'Invalid or expired token'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    logger.info('User authenticated', { userId: user.id });

    const { generation_id, output_index = 0, author, domain_name } = await req.json();

    if (!generation_id) {
      logger.error('Missing generation_id in request');
      return new Response(
        JSON.stringify({ error: 'generation_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('MP4 generation request', { 
      userId: user.id,
      metadata: { generation_id, output_index } 
    });

    // Fetch the audio generation
    const { data: audioGen, error: fetchError } = await supabaseClient
      .from('generations')
      .select('id, user_id, type, status, provider_response, tokens_used')
      .eq('id', generation_id)
      .single();

    if (fetchError || !audioGen) {
      logger.error('Generation not found', fetchError, { metadata: { generation_id } });
      return new Response(
        JSON.stringify({ error: 'Generation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate ownership
    if (audioGen.user_id !== user.id) {
      logger.error('Unauthorized access attempt', undefined, { 
        metadata: { generation_id, user_id: user.id, owner_id: audioGen.user_id } 
      });
      return new Response(
        JSON.stringify({ error: 'Unauthorized - generation belongs to another user' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate it's an audio generation
    if (audioGen.type !== 'audio') {
      logger.error('Wrong generation type', undefined, { 
        metadata: { generation_id, type: audioGen.type } 
      });
      return new Response(
        JSON.stringify({ error: 'Generation must be of type "audio"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate generation is completed
    if (audioGen.status !== 'completed') {
      logger.error('Audio not completed', undefined, { 
        metadata: { generation_id, status: audioGen.status } 
      });
      return new Response(
        JSON.stringify({ error: `Audio generation must be completed (current status: ${audioGen.status})` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract taskId and audioId from provider_response
    const providerResponse = audioGen.provider_response as any;
    
    // Handle different response structures (snake_case vs camelCase, data vs items)
    const taskId = providerResponse?.data?.task_id || providerResponse?.data?.taskId || providerResponse?.taskId;
    const items = providerResponse?.data?.data || providerResponse?.data?.items || [];
    
    logger.debug('Provider Response Structure', {
      metadata: {
        hasTaskId: !!providerResponse?.data?.task_id,
        hasTaskIdCamel: !!providerResponse?.data?.taskId,
        hasDataArray: !!providerResponse?.data?.data,
        hasItemsArray: !!providerResponse?.data?.items,
        itemsLength: items.length,
        extractedTaskId: taskId
      }
    });

    if (!taskId) {
      logger.error('Missing taskId', undefined, { metadata: { generation_id, providerResponse } });
      return new Response(
        JSON.stringify({ error: 'Missing taskId in audio generation response' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!items || items.length === 0 || output_index >= items.length) {
      logger.error('Invalid output_index', undefined, { 
        metadata: { generation_id, output_index, itemsLength: items.length } 
      });
      return new Response(
        JSON.stringify({ error: `Invalid output_index ${output_index} (available: 0-${items.length - 1})` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const audioId = items[output_index]?.id;
    if (!audioId) {
      logger.error('Missing audioId', undefined, { 
        metadata: { generation_id, output_index, item: items[output_index] } 
      });
      return new Response(
        JSON.stringify({ error: `Missing audioId for output ${output_index}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.debug('Extracted Data', { metadata: { taskId, audioId, output_index } });

    // Check token balance
    const MP4_TOKEN_COST = 1;
    const { data: subscription } = await supabaseClient
      .from('user_subscriptions')
      .select('tokens_remaining')
      .eq('user_id', user.id)
      .single();

    if (!subscription || subscription.tokens_remaining < MP4_TOKEN_COST) {
      logger.error('Insufficient credits', undefined, { 
        metadata: { 
          user_id: user.id, 
          available: subscription?.tokens_remaining || 0, 
          required: MP4_TOKEN_COST 
        } 
      });
      return new Response(
        JSON.stringify({ error: 'Insufficient credits', required: MP4_TOKEN_COST }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate webhook verification token
    const webhookVerifyToken = crypto.randomUUID();

    // Create video generation record
    const { data: videoGen, error: createError } = await supabaseClient
      .from('generations')
      .insert({
        user_id: user.id,
        type: 'video',
        prompt: `MP4 video from audio track #${output_index + 1}`,
        status: 'pending',
        tokens_used: MP4_TOKEN_COST,
        parent_generation_id: generation_id,
        output_index: output_index,
        settings: {
          taskId,
          audioId,
          author: author || null,
          domain_name: domain_name || null,
          _webhook_token: webhookVerifyToken,
          source: 'mp4_from_suno'
        }
      })
      .select()
      .single();

    if (createError) {
      logger.error('Failed to create video generation', createError);
      return new Response(
        JSON.stringify({ error: 'Failed to create video generation record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deduct tokens
    await supabaseClient.rpc('increment_tokens', {
      user_id_param: user.id,
      amount: -MP4_TOKEN_COST
    });

    logger.info('Video generation created', { metadata: { generation_id: videoGen.id } });

    // Call Kie.ai MP4 generation API
    const KIE_API_KEY = Deno.env.get('KIE_AI_API_KEY');
    const KIE_WEBHOOK_TOKEN = Deno.env.get('KIE_WEBHOOK_URL_TOKEN');
    
    if (!KIE_API_KEY || !KIE_WEBHOOK_TOKEN) {
      throw new Error('Missing KIE_AI_API_KEY or KIE_WEBHOOK_URL_TOKEN');
    }

    const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/kie-ai-webhook?token=${KIE_WEBHOOK_TOKEN}&verify=${webhookVerifyToken}`;

    interface KieAiVideoPayload {
      taskId: string;
      audioId: string;
      callBackUrl: string;
      author?: string;
      domainName?: string;
    }

    const kiePayload: KieAiVideoPayload = {
      taskId,
      audioId,
      callBackUrl: callbackUrl,
    };

    if (author) kiePayload.author = author;
    if (domain_name) kiePayload.domainName = domain_name;

    logger.info('Calling Kie.ai MP4 API', { 
      metadata: { 
        taskId, 
        audioId, 
        callbackUrl: callbackUrl.split('?')[0] 
      } 
    });

    const kieResponse = await fetch('https://api.kie.ai/api/v1/mp4/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KIE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(kiePayload),
    });

    const kieData = await kieResponse.json();

    logger.debug('Kie.ai API Response', { 
      metadata: { 
        response: kieData,
        hasCode: 'code' in kieData,
        hasData: 'data' in kieData,
        hasTaskId: !!kieData.data?.taskId,
        code: kieData.code,
        msg: kieData.msg
      }
    });

    if (!kieResponse.ok) {
      logger.error('Kie.ai API error', undefined, { 
        metadata: { 
          status: kieResponse.status, 
          statusText: kieResponse.statusText,
          error: kieData,
          payload: kiePayload
        } 
      });
      
      // Mark generation as failed and refund tokens
      await supabaseClient
        .from('generations')
        .update({ 
          status: 'failed',
          provider_response: { error: kieData, request: kiePayload }
        })
        .eq('id', videoGen.id);

      await supabaseClient.rpc('increment_tokens', {
        user_id_param: user.id,
        amount: MP4_TOKEN_COST // Refund
      });

      return new Response(
        JSON.stringify({ error: 'Kie.ai API failed', details: kieData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate response structure
    if (kieData.code !== 200 || !kieData.data?.taskId) {
      logger.error('Invalid Kie.ai response', undefined, { metadata: { response: kieData } });
      
      // Fail generation and refund
      await supabaseClient
        .from('generations')
        .update({ 
          status: 'failed',
          provider_response: kieData 
        })
        .eq('id', videoGen.id);
      
      await supabaseClient.rpc('increment_tokens', {
        user_id_param: user.id,
        amount: MP4_TOKEN_COST
      });
      
      return new Response(
        JSON.stringify({ error: `Invalid API response: ${kieData.msg || 'Missing taskId'}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update generation with provider task ID
    const mp4TaskId = kieData.data?.taskId;
    await supabaseClient
      .from('generations')
      .update({ 
        provider_task_id: mp4TaskId,
        provider_response: kieData,
        status: 'processing'
      })
      .eq('id', videoGen.id);

    logger.info('MP4 generation started', { metadata: { mp4TaskId } });
    logger.logDuration('MP4 generation request completed', startTime);

    return new Response(
      JSON.stringify({ 
        success: true, 
        video_generation_id: videoGen.id,
        mp4_task_id: mp4TaskId,
        message: 'MP4 generation started successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return createSafeErrorResponse(error, 'generate-suno-mp4', corsHeaders);
  }
});
