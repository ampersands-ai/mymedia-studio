import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { 
  ManualFailSchema,
  validateRequest,
  createValidationErrorResponse 
} from "../_shared/validation.ts";
import { GENERATION_STATUS } from "../_shared/constants.ts";

Deno.serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  const logger = new EdgeLogger('manual-fail-video-jobs', requestId);

  try {
    logger.info('Manual fail video jobs request received', { requestId });
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate request body
    const body = await req.json();
    const validation = validateRequest(
      ManualFailSchema,
      body,
      logger,
      'manual-fail-video-jobs-request'
    );

    if (!validation.success) {
      return createValidationErrorResponse(validation.formattedErrors, responseHeaders);
    }

    const { video_job_ids } = validation.data;

    if (!video_job_ids || video_job_ids.length === 0) {
      logger.warn('Invalid request: missing or invalid video_job_ids', { requestId });
      return new Response(JSON.stringify({ error: 'video_job_ids array is required' }), {
        status: 400,
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      });
    }

    logger.info('Starting manual video job failure', {
      metadata: { jobCount: video_job_ids.length, videoJobIds: video_job_ids }
    });

    // Update video jobs to failed status
    const { data: updatedJobs, error: updateError } = await supabaseClient
      .from('video_jobs')
      .update({
        status: GENERATION_STATUS.FAILED,
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
    logger.logDuration('Manual video job failure', startTime, { requestId });

    return new Response(JSON.stringify({
      success: true,
      failed_count: updatedJobs?.length || 0,
      jobs: updatedJobs
    }), {
      headers: { ...responseHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Error in manual-fail-video-jobs', err, { requestId });
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...responseHeaders, 'Content-Type': 'application/json' },
    });
  }
});
