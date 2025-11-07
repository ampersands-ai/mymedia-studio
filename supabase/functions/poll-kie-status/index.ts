import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { generation_id, task_id } = await req.json();
    
    if (!generation_id && !task_id) {
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
      const { data, error } = await supabase
        .from('generations')
        .select('*')
        .eq('id', generation_id)
        .maybeSingle();

      if (error || !data) {
        throw new Error('Generation not found');
      }

      generation = data;
      
      // Extract task_id from provider_response
      if (data.provider_response?.task_id) {
        taskIdToQuery = data.provider_response.task_id;
      } else {
        throw new Error('No task_id found in generation');
      }
    }

    console.log('Polling Kie.ai status for task:', taskIdToQuery);

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
      console.error('Kie.ai query error:', statusResponse.status, errorText);
      throw new Error(`Kie.ai query failed: ${statusResponse.status}`);
    }

    const statusData = await statusResponse.json();
    console.log('Kie.ai status response:', JSON.stringify(statusData, null, 2));

    // Check if task is completed
    if (statusData.code !== 200) {
      throw new Error(`Kie.ai returned error: ${statusData.message}`);
    }

    const taskStatus = statusData.data?.status;
    const resultUrls = statusData.data?.result_urls || statusData.data?.resultUrls || [];

    if (taskStatus === 'completed' && resultUrls.length > 0) {
      console.log('Task completed! Found', resultUrls.length, 'results');
      
      // If we have generation_id, trigger fix-stuck-generation with ALL URLs
      if (generation_id) {
        console.log('Triggering fix-stuck-generation with', resultUrls.length, 'URLs');

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
          throw new Error(`Fix failed: ${errorText}`);
        }

        const fixResult = await fixResponse.json();
        console.log('Fix result:', fixResult);

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
    console.error('Poll status error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
