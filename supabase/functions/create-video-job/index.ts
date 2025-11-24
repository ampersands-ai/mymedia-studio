import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { validateJsonbSize, MAX_JSONB_SIZE } from "../_shared/jsonb-validation-schemas.ts";
import { VIDEO_JOB_STATUS } from "../_shared/constants.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  // Get response headers (includes CORS + security headers)
  const responseHeaders = getResponseHeaders(req);

  // Handle CORS preflight with secure origin validation
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  let job_id: string | undefined;

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const logger = new EdgeLogger('create-video-job', requestId, supabaseClient, true);

    // Authenticate user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      logger.error('Authentication failed', authError || undefined);
      throw new Error('Unauthorized');
    }

    // Parse and validate input
    const { 
      topic, 
      duration = 60, 
      style = 'modern', 
      voice_id = '21m00Tcm4TlvDq8ikWAM', 
      voice_name = 'Rachel',
      aspect_ratio = '4:5',
      caption_style,
      background_video_url,
      background_video_thumbnail
    } = await req.json();

    if (!topic || topic.trim().length < 5) {
      throw new Error('Topic must be at least 5 characters');
    }

    if (duration < 15 || duration > 180) {
      throw new Error('Duration must be between 15 and 180 seconds');
    }

    // Calculate dynamic cost based on duration (15 credits per second)
    const costTokens = duration * 15;

    // Check credit balance
    const { data: subscription, error: subError } = await supabaseClient
      .from('user_subscriptions')
      .select('tokens_remaining')
      .eq('user_id', user.id)
      .single();

    if (subError || !subscription) {
      throw new Error('Could not fetch subscription data');
    }

    if (subscription.tokens_remaining < costTokens) {
      throw new Error(`Insufficient credits. ${costTokens} credits required for ${duration}s video.`);
    }

    // Deduct credits atomically with row count verification
    const { data: updateResult, error: deductError } = await supabaseClient
      .from('user_subscriptions')
      .update({ tokens_remaining: subscription.tokens_remaining - costTokens })
      .eq('user_id', user.id)
      .eq('tokens_remaining', subscription.tokens_remaining)
      .select('tokens_remaining');

    if (deductError) {
      logger.error('Credit deduction error', deductError instanceof Error ? deductError : new Error(String(deductError) || 'Database error'), { userId: user.id, metadata: { costTokens } });
      throw new Error('Failed to deduct credits - database error');
    }

    if (!updateResult || updateResult.length === 0) {
      logger.error('Optimistic lock failed - concurrent update', undefined, {
        userId: user.id,
        metadata: { expected_tokens: subscription.tokens_remaining, cost: costTokens }
      });
      throw new Error('Failed to deduct credits - concurrent update detected. Please retry.');
    }

    logger.info('Credits deducted successfully', {
      userId: user.id,
      metadata: { 
        tokens_deducted: costTokens,
        new_balance: updateResult[0]?.tokens_remaining,
        duration 
      }
    });

    // Log to audit_logs
    await supabaseClient.from('audit_logs').insert({
      user_id: user.id,
      action: 'tokens_deducted',
      metadata: {
        tokens_deducted: costTokens,
        tokens_remaining: updateResult[0]?.tokens_remaining,
        operation: 'video_job_creation',
        duration
      }
    });

    // Validate caption_style JSONB if provided (DoS prevention)
    if (caption_style && !validateJsonbSize(caption_style)) {
      logger.error('Caption style exceeds size limit', undefined, {
        userId: user.id,
        metadata: { size: JSON.stringify(caption_style).length, limit: MAX_JSONB_SIZE }
      });
      throw new Error('Caption style exceeds maximum size (50KB)');
    }

    logger.debug('JSONB validation passed', { userId: user.id });

    // Create video job
    const { data: job, error: jobError } = await supabaseClient
      .from('video_jobs')
      .insert({
        user_id: user.id,
        topic: topic.trim(),
        duration,
        style,
        voice_id,
        voice_name,
        aspect_ratio: aspect_ratio || '4:5',
        caption_style: caption_style || null,
        custom_background_video: background_video_url || null,
        background_video_thumbnail: background_video_thumbnail || null,
        status: VIDEO_JOB_STATUS.PENDING,
      })
      .select()
      .single();

    if (jobError) {
      logger.error('Job creation error', jobError instanceof Error ? jobError : undefined, { userId: user.id });
      // Refund credits on failure
      await supabaseClient
        .from('user_subscriptions')
        .update({ tokens_remaining: subscription.tokens_remaining })
        .eq('user_id', user.id);
      throw new Error('Failed to create video job');
    }

    job_id = job.id;
    logger.info('Video job created', { userId: user.id, metadata: { job_id, topic, duration, costTokens } });

    // Trigger async processing using waitUntil for reliable background execution
    const processJob = async () => {
      try {
        logger.debug('Triggering processing for job', { userId: user.id, metadata: { job_id } });
        const { error } = await supabaseClient.functions.invoke('process-video-job', {
          body: { job_id: job.id },
        });
        
        if (error) {
          logger.error('Failed to invoke process-video-job', error instanceof Error ? error : undefined, { 
            userId: user.id, 
            metadata: { job_id } 
          });
          // Mark job as failed if we can't even start processing
          await supabaseClient
            .from('video_jobs')
            .update({ 
              status: VIDEO_JOB_STATUS.FAILED, 
              error_message: `Failed to start processing: ${error.message}` 
            })
            .eq('id', job.id);
        } else {
          logger.info('Successfully triggered processing', { userId: user.id, metadata: { job_id } });
        }
      } catch (err) {
        logger.error('Error triggering processing', err instanceof Error ? err : undefined, { 
          userId: user.id, 
          metadata: { job_id } 
        });
      }
    };

    // Start background processing (don't await)
    processJob();

    logger.logDuration('Video job creation completed', startTime, { 
      userId: user.id, 
      metadata: { job_id, duration: costTokens } 
    });

    return new Response(
      JSON.stringify({ success: true, job }),
      { 
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error: any) {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const logger = new EdgeLogger('create-video-job', requestId, supabaseClient, true);
    
    logger.error('Error in create-video-job', error, { metadata: { job_id } });
    
    const status = error.message === 'Unauthorized' ? 401 : 400;
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status,
        headers: { ...responseHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
