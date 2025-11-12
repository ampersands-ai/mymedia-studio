/**
 * KIE AI Recovery Function
 * Handles recovery of stuck KIE AI generations
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { webhookLogger } from "../../_shared/logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { generation_id } = await req.json();
    
    if (!generation_id) {
      return new Response(
        JSON.stringify({ error: 'generation_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract task_id from provider_response
    const taskId = generation.provider_task_id || generation.provider_response?.taskId;
    
    if (!taskId) {
      webhookLogger.error('No task_id found', null, { generationId: generation_id });
      return new Response(
        JSON.stringify({ error: 'No task_id found in generation' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    webhookLogger.info('Querying KIE status', { generationId: generation_id, taskId });

    // Query KIE AI status
    const kieResponse = await fetch('https://api.kie.ai/api/v1/jobs/queryTask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('KIE_AI_API_KEY')}`
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
        { status: kieResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    webhookLogger.error('Recovery failed', error, {});
    return new Response(
      JSON.stringify({ 
        error: 'Recovery failed',
        message: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
