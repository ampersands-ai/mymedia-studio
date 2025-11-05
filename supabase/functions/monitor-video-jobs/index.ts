import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('Starting video job timeout monitoring...');

    // Find jobs older than 4 hours that are still processing
    const cutoffTime = new Date(Date.now() - 4 * 60 * 60 * 1000); // 4 hours ago
    
    const { data: stuckJobs, error } = await supabase
      .from('video_jobs')
      .select('*')
      .in('status', [
        'pending', 
        'generating_script', 
        'generating_voice', 
        'fetching_video', 
        'assembling', 
        'awaiting_script_approval', 
        'awaiting_voice_approval'
      ])
      .lt('created_at', cutoffTime.toISOString());

    if (error) {
      console.error('Error fetching stuck jobs:', error);
      throw error;
    }

    if (!stuckJobs || stuckJobs.length === 0) {
      console.log('No stuck video jobs found');
      return new Response(
        JSON.stringify({ 
          monitored: 0,
          message: 'No stuck jobs found' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${stuckJobs.length} stuck video jobs to process`);

    // Process each stuck job
    const refundedJobs = [];
    for (const job of stuckJobs) {
      console.log(`Processing stuck job ${job.id} - Topic: ${job.topic}`);
      
      // Mark as failed
      const { error: updateError } = await supabase
        .from('video_jobs')
        .update({
          status: 'failed',
          error_message: 'Video generation exceeded 4 hours. Credits refunded automatically.',
          error_details: {
            timeout: true,
            duration_hours: 4,
            auto_refunded: true,
            original_status: job.status
          }
        })
        .eq('id', job.id);

      if (updateError) {
        console.error(`Failed to update job ${job.id}:`, updateError);
        continue;
      }

      // Refund credits using the existing function
      const { error: refundError } = await supabase.rpc('increment_tokens', {
        user_id_param: job.user_id,
        amount: job.cost_tokens
      });

      if (refundError) {
        console.error(`Failed to refund credits for job ${job.id}:`, refundError);
        continue;
      }

      // Log audit trail
      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert({
          user_id: job.user_id,
          action: 'video_timeout_refund',
          resource_type: 'video_job',
          resource_id: job.id,
          metadata: {
            tokens_refunded: job.cost_tokens,
            reason: 'timeout_4hr',
            job_topic: job.topic,
            original_status: job.status
          }
        });

      if (auditError) {
        console.error(`Failed to create audit log for job ${job.id}:`, auditError);
      }

      refundedJobs.push({
        id: job.id,
        topic: job.topic,
        tokens_refunded: job.cost_tokens
      });

      console.log(`Successfully processed job ${job.id} - Refunded ${job.cost_tokens} credits`);
    }

    console.log(`Monitoring complete: ${refundedJobs.length}/${stuckJobs.length} jobs processed`);

    return new Response(
      JSON.stringify({ 
        monitored: stuckJobs.length,
        refunded_jobs: refundedJobs,
        success_count: refundedJobs.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in monitor-video-jobs:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
