import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { GENERATION_STATUS } from "../_shared/constants.ts";



Deno.serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);

  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  const logger = new EdgeLogger('monitor-video-jobs', requestId, supabase, true);

  try {

    logger.info('Starting video job timeout monitoring');

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
      logger.error('Error fetching stuck jobs', error instanceof Error ? error : undefined);
      throw error;
    }

    if (!stuckJobs || stuckJobs.length === 0) {
      logger.info('No stuck video jobs found');
      return new Response(
        JSON.stringify({ 
          monitored: 0,
          message: 'No stuck jobs found' 
        }),
        { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('Found stuck video jobs', { 
      metadata: { count: stuckJobs.length } 
    });

    // Process each stuck job
    const refundedJobs = [];
    for (const job of stuckJobs) {
      logger.debug('Processing stuck job', { 
        metadata: { jobId: job.id, topic: job.topic } 
      });
      
      // Mark as failed
      const { error: updateError } = await supabase
        .from('video_jobs')
        .update({
          status: GENERATION_STATUS.FAILED,
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
        logger.error('Failed to update job', updateError instanceof Error ? updateError : undefined, { 
          metadata: { jobId: job.id } 
        });
        continue;
      }

      // Refund credits using the existing function
      const { error: refundError } = await supabase.rpc('increment_tokens', {
        user_id_param: job.user_id,
        amount: job.cost_tokens
      });

      if (refundError) {
        logger.error('Failed to refund credits', refundError instanceof Error ? refundError : undefined, { 
          metadata: { jobId: job.id } 
        });
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
        logger.error('Failed to create audit log', auditError instanceof Error ? auditError : undefined, { 
          metadata: { jobId: job.id } 
        });
      }

      refundedJobs.push({
        id: job.id,
        topic: job.topic,
        tokens_refunded: job.cost_tokens
      });

      logger.info('Successfully processed stuck job', { 
        metadata: { jobId: job.id, tokensRefunded: job.cost_tokens } 
      });
    }

    logger.logDuration('Video job monitoring complete', startTime, { 
      metadata: { 
        totalStuck: stuckJobs.length, 
        refunded: refundedJobs.length 
      } 
    });

    return new Response(
      JSON.stringify({ 
        monitored: stuckJobs.length,
        refunded_jobs: refundedJobs,
        success_count: refundedJobs.length
      }),
      { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error('Error in monitor-video-jobs', error instanceof Error ? error : undefined);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Unknown error' }),
      {
        status: 500,
        headers: { ...responseHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
