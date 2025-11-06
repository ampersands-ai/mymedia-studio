import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { createSafeErrorResponse } from "../_shared/error-handler.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { generation_id, output_index = 0, author, domain_name } = await req.json();

    if (!generation_id) {
      console.error('❌ Missing generation_id in request');
      return new Response(
        JSON.stringify({ error: 'generation_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🎬 MP4 Generation Request:`, { generation_id, output_index, user_id: user.id });

    // Fetch the audio generation
    const { data: audioGen, error: fetchError } = await supabaseClient
      .from('generations')
      .select('id, user_id, type, status, provider_response, tokens_used')
      .eq('id', generation_id)
      .single();

    if (fetchError || !audioGen) {
      console.error('❌ Generation not found:', { generation_id, fetchError });
      return new Response(
        JSON.stringify({ error: 'Generation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate ownership
    if (audioGen.user_id !== user.id) {
      console.error('❌ Unauthorized access attempt:', { generation_id, user_id: user.id, owner_id: audioGen.user_id });
      return new Response(
        JSON.stringify({ error: 'Unauthorized - generation belongs to another user' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate it's an audio generation
    if (audioGen.type !== 'audio') {
      console.error('❌ Wrong generation type:', { generation_id, type: audioGen.type });
      return new Response(
        JSON.stringify({ error: 'Generation must be of type "audio"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate generation is completed
    if (audioGen.status !== 'completed') {
      console.error('❌ Audio not completed:', { generation_id, status: audioGen.status });
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
    
    console.log(`🔍 Provider Response Structure:`, {
      hasTaskId: !!providerResponse?.data?.task_id,
      hasTaskIdCamel: !!providerResponse?.data?.taskId,
      hasDataArray: !!providerResponse?.data?.data,
      hasItemsArray: !!providerResponse?.data?.items,
      itemsLength: items.length,
      extractedTaskId: taskId
    });

    if (!taskId) {
      console.error('❌ Missing taskId:', { generation_id, providerResponse });
      return new Response(
        JSON.stringify({ error: 'Missing taskId in audio generation response' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!items || items.length === 0 || output_index >= items.length) {
      console.error('❌ Invalid output_index:', { generation_id, output_index, itemsLength: items.length });
      return new Response(
        JSON.stringify({ error: `Invalid output_index ${output_index} (available: 0-${items.length - 1})` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const audioId = items[output_index]?.id;
    if (!audioId) {
      console.error('❌ Missing audioId:', { generation_id, output_index, item: items[output_index] });
      return new Response(
        JSON.stringify({ error: `Missing audioId for output ${output_index}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Extracted Data:`, { taskId, audioId, output_index });

    // Check token balance
    const MP4_TOKEN_COST = 5;
    const { data: subscription } = await supabaseClient
      .from('user_subscriptions')
      .select('tokens_remaining')
      .eq('user_id', user.id)
      .single();

    if (!subscription || subscription.tokens_remaining < MP4_TOKEN_COST) {
      console.error('❌ Insufficient credits:', { 
        user_id: user.id, 
        available: subscription?.tokens_remaining || 0, 
        required: MP4_TOKEN_COST 
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
          webhook_verify_token: webhookVerifyToken,
          source: 'mp4_from_suno'
        }
      })
      .select()
      .single();

    if (createError) {
      console.error('Failed to create video generation:', createError);
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

    console.log(`✅ Video generation created:`, videoGen.id);

    // Call Kie.ai MP4 generation API
    const KIE_API_KEY = Deno.env.get('KIE_AI_API_KEY');
    const KIE_WEBHOOK_TOKEN = Deno.env.get('KIE_WEBHOOK_URL_TOKEN');
    
    if (!KIE_API_KEY || !KIE_WEBHOOK_TOKEN) {
      throw new Error('Missing KIE_AI_API_KEY or KIE_WEBHOOK_URL_TOKEN');
    }

    const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/kie-ai-webhook?token=${KIE_WEBHOOK_TOKEN}&verify=${webhookVerifyToken}`;

    const kiePayload: any = {
      taskId,
      audioId,
      callBackUrl: callbackUrl,
    };

    if (author) kiePayload.author = author;
    if (domain_name) kiePayload.domainName = domain_name;

    console.log(`🚀 Calling Kie.ai MP4 API:`, { taskId, audioId, callbackUrl: callbackUrl.split('?')[0] });

    const kieResponse = await fetch('https://api.kie.ai/api/v1/mp4/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KIE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(kiePayload),
    });

    const kieData = await kieResponse.json();

    if (!kieResponse.ok) {
      console.error('❌ Kie.ai API error:', { 
        status: kieResponse.status, 
        statusText: kieResponse.statusText,
        error: kieData,
        payload: kiePayload
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

    // Update generation with provider task ID
    const mp4TaskId = kieData.taskId || kieData.id;
    await supabaseClient
      .from('generations')
      .update({ 
        provider_task_id: mp4TaskId,
        provider_response: kieData,
        status: 'processing'
      })
      .eq('id', videoGen.id);

    console.log(`🎉 MP4 generation started! Task ID: ${mp4TaskId}`);

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
