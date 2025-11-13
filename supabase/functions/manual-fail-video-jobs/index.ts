import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { 
  ManualFailSchema,
  validateRequest,
  createValidationErrorResponse 
} from "../_shared/validation.ts";
import {
  handleOptionsRequest,
  createJsonResponse,
  createErrorResponse,
  corsHeaders
} from "../_shared/cors-headers.ts";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleOptionsRequest();
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
      return createValidationErrorResponse(validation.formattedErrors, corsHeaders);
    }

    const { video_job_ids } = validation.data;

    if (!video_job_ids || video_job_ids.length === 0) {
      logger.warn('Invalid request: missing or invalid video_job_ids', { requestId });
      return createErrorResponse('video_job_ids array is required', 400);
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
    logger.logDuration('Manual video job failure', startTime, { requestId });

    return createJsonResponse({
      success: true,
      failed_count: updatedJobs?.length || 0,
      jobs: updatedJobs
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Error in manual-fail-video-jobs', err, { requestId });
    return createErrorResponse(err.message, 500);
  }
});
