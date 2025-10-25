import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { video_job_ids } = await req.json();

    if (!Array.isArray(video_job_ids) || video_job_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'video_job_ids array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Manually failing ${video_job_ids.length} video jobs:`, video_job_ids);

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

    console.log(`Successfully failed ${updatedJobs?.length || 0} video jobs`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        failed_count: updatedJobs?.length || 0,
        jobs: updatedJobs
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in manual-fail-video-jobs:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
