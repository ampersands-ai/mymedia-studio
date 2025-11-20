import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";

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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('poll-kie-status', requestId);
  const startTime = Date.now();

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { generation_id, task_id } = await req.json();
    
    if (!generation_id && !task_id) {
      logger.warn('Missing required parameters');
      return new Response(
        JSON.stringify({ error: 'Missing generation_id or task_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    let kieApiKey = Deno.env.get('KIE_AI_API_KEY')!; // Fallback default

    // Get generation details if generation_id provided
    let taskIdToQuery = task_id;

    if (generation_id) {
      logger.info('Fetching generation details', {
        metadata: { generationId: generation_id }
      });

      const { data, error } = await supabase
        .from('generations')
        .select('*')
        .eq('id', generation_id)
        .maybeSingle();

      if (error || !data) {
        logger.error('Generation not found', error instanceof Error ? error : (error ? new Error(String(error)) : undefined), {
          metadata: { generationId: generation_id }
        });
        throw new Error('Generation not found');
      }
      
      // Extract task_id from provider_response
      if (data.provider_response?.task_id) {
        taskIdToQuery = data.provider_response.task_id;
      } else {
        logger.error('No task_id found in generation', undefined, { 
          metadata: { generationId: generation_id }
        });
        throw new Error('No task_id found in generation');
      }
      
      kieApiKey = getKieApiKey(data.model_id || '', data.model_record_id || '');
    }

    logger.info('Polling Kie.ai task status', { 
      metadata: { taskId: taskIdToQuery, generationId: generation_id }
    });

    // Query Kie.ai task status
    const statusResponse = await fetch('https://api.kie.ai/api/v1/jobs/queryTask', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${kieApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ taskId: taskIdToQuery })
    });

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      logger.error('Kie.ai query failed', undefined, { 
        metadata: { 
          taskId: taskIdToQuery, 
          status: statusResponse.status, 
          error: errorText 
        }
      });
      throw new Error(`Kie.ai query failed: ${statusResponse.status}`);
    }

    const statusData = await statusResponse.json();
    logger.info('Kie.ai status retrieved', { 
      metadata: { 
        taskId: taskIdToQuery, 
        status: statusData.data?.status 
      }
    });

    // Check if task is completed
    if (statusData.code !== 200) {
      logger.error('Kie.ai returned error', undefined, { 
        metadata: { message: statusData.message }
      });
      throw new Error(`Kie.ai returned error: ${statusData.message}`);
    }

    const taskStatus = statusData.data?.status;
    const resultUrls = statusData.data?.result_urls || statusData.data?.resultUrls || [];

    if (taskStatus === 'completed' && resultUrls.length > 0) {
      logger.info('Task completed', { 
        metadata: { 
          taskId: taskIdToQuery, 
          resultCount: resultUrls.length 
        }
      });
      
      // If we have generation_id, trigger fix-stuck-generation with ALL URLs
      if (generation_id) {
        logger.info('Triggering fix-stuck-generation', { 
          metadata: { 
            generationId: generation_id, 
            urlCount: resultUrls.length 
          }
        });

        const fixResponse = await fetch(`${supabaseUrl}/functions/v1/fix-stuck-generation`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            generation_id: generation_id,
            result_urls: resultUrls  // Pass ALL URLs, not just the first one
          })
        });

        if (!fixResponse.ok) {
          const errorText = await fixResponse.text();
          logger.error('Fix-stuck-generation failed', undefined, { 
            metadata: { generationId: generation_id, error: errorText }
          });
          throw new Error(`Fix failed: ${errorText}`);
        }

        const fixResult = await fixResponse.json();
        logger.info('Generation recovered successfully', { 
          metadata: { generationId: generation_id }
        });
        logger.logDuration('Poll and recovery completed', startTime);

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Generation recovered successfully via polling',
            status: taskStatus,
            result_urls: resultUrls,
            fix_result: fixResult
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Return status info if no generation_id
      logger.logDuration('Poll completed', startTime);
      return new Response(
        JSON.stringify({
          success: true,
          status: taskStatus,
          result_urls: resultUrls,
          message: 'Task completed on Kie.ai'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Task not completed yet
    logger.info('Task still in progress', { 
      metadata: { taskId: taskIdToQuery, status: taskStatus }
    });
    logger.logDuration('Poll completed', startTime);

    return new Response(
      JSON.stringify({
        success: true,
        status: taskStatus,
        message: `Task still ${taskStatus}`,
        result_urls: resultUrls
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    logger.error('Fatal error in poll-kie-status', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
