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

    console.log('Scanning for stuck video jobs...');

    // Find jobs stuck in intermediate states for > 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: stuckJobs, error: fetchError } = await supabaseClient
      .from('video_jobs')
      .select('*')
      .in('status', ['pending', 'generating_script', 'generating_voice', 'fetching_video', 'assembling'])
      .lt('updated_at', fiveMinutesAgo)
      .order('updated_at', { ascending: true });

    if (fetchError) {
      throw fetchError;
    }

    if (!stuckJobs || stuckJobs.length === 0) {
      console.log('No stuck jobs found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          recovered: 0,
          message: 'No stuck jobs found'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${stuckJobs.length} stuck jobs:`, stuckJobs.map(j => ({
      id: j.id,
      status: j.status,
      updated_at: j.updated_at
    })));

    const recoveredJobs = [];

    for (const job of stuckJobs) {
      console.log(`Recovering job ${job.id} (status: ${job.status})`);

      try {
        // Determine recovery action based on current state
        if (job.status === 'generating_voice' && job.script && job.voiceover_url) {
          // Script and voiceover exist, move to approval
          console.log(`Job ${job.id}: Moving to awaiting_approval`);
          await supabaseClient
            .from('video_jobs')
            .update({ 
              status: 'awaiting_approval',
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id);
          recoveredJobs.push({ id: job.id, action: 'moved_to_approval' });
        } 
        else if (job.status === 'generating_script' && job.script) {
          // Script exists but stuck, retry voiceover
          console.log(`Job ${job.id}: Script exists, retrying from voiceover`);
          await supabaseClient.functions.invoke('process-video-job', {
            body: { job_id: job.id }
          });
          recoveredJobs.push({ id: job.id, action: 'retried_processing' });
        }
        else if (['pending', 'generating_script', 'generating_voice'].includes(job.status)) {
          // Early stage stuck, retry from beginning
          console.log(`Job ${job.id}: Retrying from beginning`);
          await supabaseClient.functions.invoke('process-video-job', {
            body: { job_id: job.id }
          });
          recoveredJobs.push({ id: job.id, action: 'retried_processing' });
        }
        else {
          // Unknown state or can't recover, mark as failed
          console.log(`Job ${job.id}: Cannot recover, marking as failed`);
          await supabaseClient
            .from('video_jobs')
            .update({ 
              status: 'failed',
              error_message: `Auto-failed: stuck in ${job.status} for >5 minutes`,
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id);
          recoveredJobs.push({ id: job.id, action: 'marked_failed' });
        }
      } catch (err: any) {
        console.error(`Failed to recover job ${job.id}:`, err);
        recoveredJobs.push({ id: job.id, action: 'recovery_failed', error: err.message || 'Unknown error' });
      }
    }

    console.log('Recovery complete:', recoveredJobs);

    return new Response(
      JSON.stringify({ 
        success: true, 
        recovered: recoveredJobs.length,
        jobs: recoveredJobs
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in recover-stuck-jobs:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
