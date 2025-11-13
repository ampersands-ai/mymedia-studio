import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('manual-fail-video-jobs', requestId);
  const startTime = Date.now();
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { video_job_ids } = await req.json();

    if (!Array.isArray(video_job_ids) || video_job_ids.length === 0) {
      logger.warn('Invalid request: missing or invalid video_job_ids');
      return new Response(
        JSON.stringify({ error: 'video_job_ids array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('Starting manual video job failure', {
      metadata: { jobCount: video_job_ids.length, videoJobIds: video_job_ids }
    });

    // Update video jobs to failed status
    const { data: updatedJobs, error: updateError } = await supabaseClient
      .from('video_jobs')
      .update({
        status: 'failed',
        error_message: 'Video assembly timed out after extended period',
        updated_at: new Date().toISOString()
      })
      .in('id', video_job_ids)
      .select();

    if (updateError) {
      throw updateError;
    }

    logger.info('Manual video job failure completed', {
      metadata: { failedCount: updatedJobs?.length || 0 }
    });
    logger.logDuration('Manual video job failure', startTime);

    return new Response(
      JSON.stringify({ 
        success: true, 
        failed_count: updatedJobs?.length || 0,
        jobs: updatedJobs
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    logger.error('Error in manual-fail-video-jobs', error as Error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
