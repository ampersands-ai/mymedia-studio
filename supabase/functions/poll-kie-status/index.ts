import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";

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
    const kieApiKey = Deno.env.get('KIE_AI_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get generation details if generation_id provided
    let generation: any;
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

      generation = data;
      
      // Extract task_id from provider_response
      if (data.provider_response?.task_id) {
        taskIdToQuery = data.provider_response.task_id;
      } else {
        logger.error('No task_id found in generation', undefined, { 
          metadata: { generationId: generation_id }
        });
        throw new Error('No task_id found in generation');
      }
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
