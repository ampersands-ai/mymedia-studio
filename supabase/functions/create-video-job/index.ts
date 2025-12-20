import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { validateJsonbSize, MAX_JSONB_SIZE } from "../_shared/jsonb-validation-schemas.ts";
import { VIDEO_JOB_STATUS } from "../_shared/constants.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { checkEmailVerified, createEmailNotVerifiedResponse } from "../_shared/email-verification.ts";

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

    // Check email verification
    const isEmailVerified = await checkEmailVerified(supabaseClient, user.id, logger);
    if (!isEmailVerified) {
      logger.warn('Email not verified - blocking video creation', { userId: user.id });
      return createEmailNotVerifiedResponse(responseHeaders);
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
      background_video_thumbnail,
      voiceover_tier = 'standard',
      notify_on_completion = true
    } = await req.json();

    if (!topic || topic.trim().length < 5) {
      throw new Error('Topic must be at least 5 characters');
    }

    if (duration < 15 || duration > 1080) {
      throw new Error('Duration must be between 15 and 1080 seconds');
    }

    // Calculate dynamic cost based on duration (0.3 credits per second)
    const costTokens = duration * 0.3;

    // Deduct credits atomically using RPC (prevents race conditions)
    const { data: deductResult, error: deductError } = await supabaseClient
      .rpc('deduct_user_tokens', {
        p_user_id: user.id,
        p_cost: costTokens
      });

    if (deductError) {
      logger.error('Credit deduction RPC error', deductError instanceof Error ? deductError : new Error(String(deductError) || 'Database error'), { userId: user.id, metadata: { costTokens } });
      throw new Error('Failed to deduct credits - database error');
    }

    const deductRow = deductResult?.[0];
    if (!deductRow?.success) {
      const errorMsg = deductRow?.error_message || 'Unknown error';
      if (errorMsg.includes('Insufficient')) {
        throw new Error(`Insufficient credits. ${costTokens} credits required for ${duration}s video.`);
      }
      throw new Error(`Failed to deduct credits: ${errorMsg}`);
    }

    const tokensAfterDeduction = deductRow.tokens_remaining;

    logger.info('Credits deducted successfully', {
      userId: user.id,
      metadata: { 
        tokens_deducted: costTokens,
        new_balance: tokensAfterDeduction,
        duration 
      }
    });

    // Log to audit_logs
    await supabaseClient.from('audit_logs').insert({
      user_id: user.id,
      action: 'tokens_deducted',
      metadata: {
        tokens_deducted: costTokens,
        tokens_remaining: tokensAfterDeduction,
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
        voiceover_tier: voiceover_tier || 'standard',
        status: VIDEO_JOB_STATUS.PENDING,
        cost_tokens: costTokens,
        notify_on_completion: notify_on_completion,
      })
      .select()
      .single();

    if (jobError) {
      logger.error('Job creation error', jobError instanceof Error ? jobError : undefined, { userId: user.id });
      // Refund credits on failure using increment_tokens RPC
      await supabaseClient.rpc('increment_tokens', {
        user_id_param: user.id,
        amount: costTokens
      });
      throw new Error('Failed to create video job');
    }

    job_id = job.id;
    logger.info('Video job created', { userId: user.id, metadata: { job_id, topic, duration, costTokens } });

    // Trigger async processing using waitUntil for reliable background execution
    const processJob = async () => {
      try {
        logger.debug('Triggering processing for job', { userId: user.id, metadata: { job_id } });
        const { data, error } = await supabaseClient.functions.invoke('process-video-job', {
          body: { job_id: job.id },
        });
        
        if (error) {
          // Extract specific error message from response if available
          let specificError = error.message;
          
          // Try to get more specific error from the response data
          if (data?.error) {
            specificError = data.error;
          } else if (error.context?.body) {
            try {
              const bodyText = await error.context.body.text?.() || error.context.body;
              const parsed = typeof bodyText === 'string' ? JSON.parse(bodyText) : bodyText;
              if (parsed?.error) {
                specificError = parsed.error;
              }
            } catch {
              // Keep original error message
            }
          }
          
          // Map known API errors to user-friendly messages
          if (specificError.includes('overloaded') || specificError.includes('Overloaded')) {
            specificError = 'AI service temporarily busy. Please try again in a moment.';
          } else if (specificError.includes('rate limit') || specificError.includes('429')) {
            specificError = 'Too many requests. Please wait a moment and try again.';
          } else if (specificError.includes('timeout') || specificError.includes('Timeout')) {
            specificError = 'Request timed out. Please try again.';
          }
          
          logger.error('Failed to invoke process-video-job', error instanceof Error ? error : undefined, { 
            userId: user.id, 
            metadata: { job_id, specificError } 
          });
          
          // Mark job as failed with specific error
          await supabaseClient
            .from('video_jobs')
            .update({ 
              status: VIDEO_JOB_STATUS.FAILED, 
              error_message: specificError 
            })
            .eq('id', job.id);
        } else {
          logger.info('Successfully triggered processing', { userId: user.id, metadata: { job_id } });
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        logger.error('Error triggering processing', err instanceof Error ? err : undefined, { 
          userId: user.id, 
          metadata: { job_id } 
        });
        
        // Update job with specific error
        await supabaseClient
          .from('video_jobs')
          .update({ 
            status: VIDEO_JOB_STATUS.FAILED, 
            error_message: `Processing error: ${errorMsg}` 
          })
          .eq('id', job.id);
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
  } catch (error) {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const logger = new EdgeLogger('create-video-job', requestId, supabaseClient, true);
    const err = error as Error;
    
    logger.error('Error in create-video-job', err, { metadata: { job_id } });
    
    const status = err.message === 'Unauthorized' ? 401 : 400;
    
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { 
        status,
        headers: { ...responseHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
