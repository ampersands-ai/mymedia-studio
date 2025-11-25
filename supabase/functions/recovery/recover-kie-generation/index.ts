/**
 * KIE AI Recovery Function
 * Handles recovery of stuck KIE AI generations
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { webhookLogger } from "../../_shared/logger.ts";
import { API_ENDPOINTS } from "../../_shared/api-endpoints.ts";
import { getResponseHeaders, handleCorsPreflight } from "../../_shared/cors.ts";

// API key mapping logic for KIE AI
function getKieApiKey(modelId: string, recordId: string): string {
  const veo3Models = [
    '8aac94cb-5625-47f4-880c-4f0fd8bd83a1',
    'a5c2ec16-6294-4588-86b6-7b4182601cda',
    '6e8a863e-8630-4eef-bdbb-5b41f4c883f9',
    'f8e9c7a5-9d4b-6f2c-8a1e-5d7b3c9f4a6e',
    'e9c8b7a6-8d5c-4f3e-9a2f-6d8b5c9e4a7f',
  ];

  const sora2Models = [
    'd7f8c5a3-9b2e-6f4d-8c9a-5e7b3a6d4f8c',
    'c6e5b4a3-5d2f-1c0e-6a9f-3d5b6c7e4a8f',
  ];

  const nanoBananaModels = ['c7e9a5f3-8d4b-6f2c-9a1e-5d8b3c7f4a6e'];
  const seedreamV4Models = ['d2ffb834-fc59-4c80-bf48-c2cc25281fdd', 'a6c8e4f7-9d2b-5f3c-8a6e-7d4b9c5f3a8e'];

  let secretName: string;

  if (veo3Models.includes(recordId)) secretName = 'KIE_AI_API_KEY_VEO3';
  else if (sora2Models.includes(recordId)) secretName = 'KIE_AI_API_KEY_SORA2';
  else if (nanoBananaModels.includes(recordId)) secretName = 'KIE_AI_API_KEY_NANO_BANANA';
  else if (seedreamV4Models.includes(recordId)) secretName = 'KIE_AI_API_KEY_SEEDREAM_V4';
  else if (modelId.includes('image_editing')) secretName = 'KIE_AI_API_KEY_IMAGE_EDITING';
  else if (modelId.includes('image_to_video')) secretName = 'KIE_AI_API_KEY_IMAGE_TO_VIDEO';
  else if (modelId.includes('prompt_to_image')) secretName = 'KIE_AI_API_KEY_PROMPT_TO_IMAGE';
  else if (modelId.includes('prompt_to_video')) secretName = 'KIE_AI_API_KEY_PROMPT_TO_VIDEO';
  else if (modelId.includes('prompt_to_audio')) secretName = 'KIE_AI_API_KEY_PROMPT_TO_AUDIO';
  else secretName = 'KIE_AI_API_KEY';

  const apiKey = Deno.env.get(secretName) || Deno.env.get('KIE_AI_API_KEY');

  if (!apiKey) {
    throw new Error(`${secretName} not configured`);
  }

  return apiKey;
}

serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  try {
    const { generation_id } = await req.json();
    
    if (!generation_id) {
      return new Response(
        JSON.stringify({ error: 'generation_id is required' }),
        { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    webhookLogger.info('KIE recovery started', { generationId: generation_id });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get generation details
    const { data: generation, error: genError } = await supabase
      .from('generations')
      .select('*')
      .eq('id', generation_id)
      .single();

    if (genError || !generation) {
      webhookLogger.error('Generation not found', genError, { generationId: generation_id });
      return new Response(
        JSON.stringify({ error: 'Generation not found' }),
        { status: 404, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract task_id from provider_response
    const taskId = generation.provider_task_id || generation.provider_response?.taskId;
    
    if (!taskId) {
      webhookLogger.error('No task_id found', null, { generationId: generation_id });
      return new Response(
        JSON.stringify({ error: 'No task_id found in generation' }),
        { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    webhookLogger.info('Querying KIE status', { generationId: generation_id, taskId });

    const kieApiKey = getKieApiKey(generation.model_id || '', generation.model_record_id || '');

    // Query KIE AI status
    const kieResponse = await fetch(API_ENDPOINTS.KIE_AI.queryTaskUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${kieApiKey}`
      },
      body: JSON.stringify({ taskId })
    });

    if (!kieResponse.ok) {
      const errorText = await kieResponse.text();
      webhookLogger.error('KIE status check failed', new Error(errorText), { 
        generationId: generation_id, 
        taskId,
        status: String(kieResponse.status)
      });
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to check KIE status',
          details: errorText 
        }),
        { status: kieResponse.status, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const taskStatus = await kieResponse.json();
    webhookLogger.info('KIE status received', { 
      generationId: generation_id, 
      taskId,
      state: taskStatus.data?.state 
    });

    // If completed, trigger webhook processing
    if (taskStatus.data?.state === 'completed' && taskStatus.data?.resultJson) {
      webhookLogger.info('Triggering webhook for completed task', { 
        generationId: generation_id, 
        taskId 
      });

      const webhookToken = Deno.env.get('KIE_WEBHOOK_URL_TOKEN');
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      
      const webhookUrl = `${supabaseUrl}/functions/v1/webhooks/kie-webhook?token=${webhookToken}&generation_id=${generation_id}`;
      
      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify(taskStatus.data)
      });

      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text();
        webhookLogger.error('Webhook trigger failed', new Error(errorText), {
          generationId: generation_id,
          taskId
        });
      } else {
        webhookLogger.success(generation_id, { 
          taskId,
          recovered: true 
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        generation_id,
        task_id: taskId,
        status: taskStatus.data?.state,
        result: taskStatus 
      }),
      { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    webhookLogger.error('Recovery failed', error, {});
    return new Response(
      JSON.stringify({ 
        error: 'Recovery failed',
        message: error.message 
      }),
      { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
