import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from '../_shared/edge-logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Inlined helper: sanitize sensitive data
function sanitizeData(data: any): any {
  if (!data) return data;
  const sanitized = { ...data };
  const sensitiveKeys = ['api_key', 'authorization', 'token', 'secret', 'apiKey', 'xi-api-key'];
  sensitiveKeys.forEach(key => delete sanitized[key]);
  if (sanitized.headers) {
    sensitiveKeys.forEach(key => delete sanitized.headers[key]);
  }
  return sanitized;
}

// Inlined helper: log API call with EdgeLogger integration
async function logApiCall(
  supabase: any,
  logger: EdgeLogger,
  request: {
    videoJobId: string;
    userId: string;
    serviceName: string;
    endpoint: string;
    httpMethod: string;
    stepName: string;
    requestPayload?: any;
    additionalMetadata?: any;
  },
  requestSentAt: Date,
  response: {
    statusCode: number;
    payload?: any;
    isError: boolean;
    errorMessage?: string;
  }
) {
  try {
    await supabase.from('api_call_logs').insert({
      video_job_id: request.videoJobId,
      user_id: request.userId,
      service_name: request.serviceName,
      endpoint: request.endpoint,
      http_method: request.httpMethod,
      step_name: request.stepName,
      request_payload: sanitizeData(request.requestPayload),
      request_sent_at: requestSentAt.toISOString(),
      response_received_at: new Date().toISOString(),
      response_status_code: response.statusCode,
      response_payload: sanitizeData(response.payload),
      is_error: response.isError,
      error_message: response.errorMessage,
      additional_metadata: request.additionalMetadata,
    });
    
    if (response.isError) {
      logger.error(`API call failed: ${request.serviceName}`, undefined, {
        userId: request.userId,
        metadata: { step: request.stepName, status: response.statusCode, error: response.errorMessage }
      });
    } else {
      logger.debug(`API call succeeded: ${request.serviceName}`, {
        userId: request.userId,
        metadata: { step: request.stepName, status: response.statusCode }
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.warn('Failed to log API call', { 
      userId: request.userId,
      metadata: { videoJobId: request.videoJobId, serviceName: request.serviceName, error: errorMessage }
    });
  }
}

// Retry with exponential backoff
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      // Retry on 429 or 5xx
      if (response.status === 429 || response.status >= 500) {
        if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000; // 0s, 1s, 2s
          // Note: Cannot use logger here as it's not in scope
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      
      return response;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout after 30 seconds');
      }
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        // Note: Cannot use logger here as it's not in scope
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  let job_id: string | undefined;

  try {
    const { job_id: jobIdParam, edited_script } = await req.json();
    job_id = jobIdParam;

    if (!job_id) {
      throw new Error('job_id is required');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    const logger = new EdgeLogger('approve-script', requestId, supabaseClient, true);

    // Authenticate user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      logger.error('Authentication failed', authError || undefined);
      throw new Error('Unauthorized');
    }

    // Fetch job and verify ownership
    const { data: job, error: fetchError } = await supabaseClient
      .from('video_jobs')
      .select('*')
      .eq('id', job_id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !job) {
      throw new Error('Job not found or access denied');
    }

    const allowedStatuses = ['awaiting_script_approval', 'awaiting_voice_approval'];
    if (!allowedStatuses.includes(job.status)) {
      throw new Error(
        `Job is in ${job.status} status, expected one of: ${allowedStatuses.join(', ')}`
      );
    }

    const finalScript = edited_script || job.script;
    if (!finalScript) {
      throw new Error('No script available');
    }

    logger.info('Processing approve-script request', {
      userId: user.id,
      metadata: { jobId: job_id, status: job.status, hasEditedScript: !!edited_script }
    });

    // If regenerating voiceover (edited_script provided), calculate and deduct tokens
    if (edited_script && edited_script !== job.script) {
      const voiceoverCost = Math.ceil((edited_script.length / 1000) * 144);
      logger.info('Regenerating voiceover', {
        userId: user.id,
        metadata: { jobId: job_id, cost: voiceoverCost, scriptLength: edited_script.length }
      });

      // Check token balance
      const { data: subscription, error: subError } = await supabaseClient
        .from('user_subscriptions')
        .select('tokens_remaining')
        .eq('user_id', user.id)
        .single();

      if (subError || !subscription) {
        throw new Error('Could not fetch subscription data');
      }

      if (subscription.tokens_remaining < voiceoverCost) {
        throw new Error(`Insufficient credits. ${voiceoverCost} credits required to regenerate voiceover.`);
      }

      // Deduct tokens atomically
      const { error: deductError } = await supabaseClient
        .from('user_subscriptions')
        .update({ tokens_remaining: subscription.tokens_remaining - voiceoverCost })
        .eq('user_id', user.id)
        .eq('tokens_remaining', subscription.tokens_remaining);

      if (deductError) {
        logger.error('Token deduction failed', deductError instanceof Error ? deductError : undefined, {
          userId: user.id,
          metadata: { jobId: job_id, cost: voiceoverCost }
        });
        throw new Error('Failed to deduct tokens. Please try again.');
      }

      logger.info('Tokens deducted for voiceover regeneration', {
        userId: user.id,
        metadata: { jobId: job_id, tokensDeducted: voiceoverCost }
      });
    }

    logger.info('Generating voiceover', {
      userId: user.id,
      metadata: { jobId: job_id, scriptLength: finalScript.length }
    });

    // Update status to generating_voice
    await supabaseClient
      .from('video_jobs')
      .update({ 
        status: 'generating_voice',
        script: finalScript,
        updated_at: new Date().toISOString()
      })
      .eq('id', job_id);

    // Generate voiceover
    const elevenLabsKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!elevenLabsKey) {
      throw new Error('ELEVENLABS_API_KEY not configured');
    }

    const requestPayload = {
      text: finalScript,
      model_id: 'eleven_turbo_v2_5',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    };

    const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${job.voice_id}`;
    const requestSentAt = new Date();

    const voiceResponse = await fetchWithRetry(endpoint, {
      method: 'POST',
      headers: {
        'xi-api-key': elevenLabsKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
    });

    // Log the API call
    const voiceResponseClone = voiceResponse.clone();
    logApiCall(
      supabaseClient,
      logger,
      {
        videoJobId: job_id,
        userId: user.id,
        serviceName: 'elevenlabs',
        endpoint,
        httpMethod: 'POST',
        stepName: 'generate_voiceover',
        requestPayload,
        additionalMetadata: {
          voice_id: job.voice_id,
          script_length: finalScript.length
        }
      },
      requestSentAt,
      {
        statusCode: voiceResponse.status,
        payload: voiceResponse.ok ? { success: true } : await voiceResponseClone.text(),
        isError: !voiceResponse.ok,
        errorMessage: voiceResponse.ok ? undefined : `ElevenLabs returned ${voiceResponse.status}`
      }
    ).catch(e => logger.error('Failed to log API call', e instanceof Error ? e : undefined, { 
      userId: user.id, 
      metadata: { jobId: job_id } 
    }));

    if (!voiceResponse.ok) {
      const errorText = await voiceResponse.text();
      
      // Update job back to awaiting_script_approval so user can retry
      await supabaseClient
        .from('video_jobs')
        .update({ 
          status: 'awaiting_script_approval',
          error_message: `Voiceover generation failed: ${errorText}. Please try approving the script again.`,
          updated_at: new Date().toISOString()
        })
        .eq('id', job_id);
      
      throw new Error(`ElevenLabs API error (${voiceResponse.status}): ${errorText}`);
    }

    const audioBlob = await voiceResponse.blob();
    const audioBuffer = await audioBlob.arrayBuffer();

    // Calculate actual audio duration based on script word count
    const words = finalScript.split(' ').filter((w: string) => w.trim().length > 0);
    const wordsPerSecond = 2.5;
    const actualAudioDuration = words.length / wordsPerSecond;
    logger.info('Audio duration calculated', {
      userId: user.id,
      metadata: { jobId: job_id, duration: actualAudioDuration, wordCount: words.length }
    });

    // Upload voiceover to storage
    const voiceFileName = `${job_id}_voiceover.mp3`;
    const { error: uploadError } = await supabaseClient.storage
      .from('generated-content')
      .upload(voiceFileName, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload voiceover: ${uploadError.message}`);
    }

    // Construct full public URL for voiceover (bucket is public)
    const voiceoverPublicUrl = `${supabaseUrl}/storage/v1/object/public/generated-content/${voiceFileName}`;
    logger.info('Voiceover uploaded to storage', {
      userId: user.id,
      metadata: { jobId: job_id, fileName: voiceFileName, url: voiceoverPublicUrl }
    });

    // Update job with FULL PUBLIC URL, actual duration, and new status
    const { error: updateError } = await supabaseClient
      .from('video_jobs')
      .update({
        voiceover_url: voiceoverPublicUrl, // Store full public URL
        actual_audio_duration: actualAudioDuration,
        status: 'awaiting_voice_approval',
        updated_at: new Date().toISOString(),
      })
      .eq('id', job_id);

    if (updateError) {
      logger.error('Failed to update job with voiceover', updateError instanceof Error ? updateError : undefined, {
        userId: user.id,
        metadata: { jobId: job_id }
      });
      throw new Error(`Failed to update job with voiceover: ${updateError.message}`);
    }

    logger.debug('Job updated, verifying database storage', {
      userId: user.id,
      metadata: { jobId: job_id }
    });
    
    // Verify the URL was stored correctly
    const { data: verifyJob, error: verifyError } = await supabaseClient
      .from('video_jobs')
      .select('voiceover_url')
      .eq('id', job_id)
      .single();

    if (verifyError) {
      logger.error('Failed to verify voiceover URL', verifyError instanceof Error ? verifyError : undefined, {
        userId: user.id,
        metadata: { jobId: job_id }
      });
      throw new Error('Failed to verify voiceover URL was saved');
    }

    logger.debug('URL verification check', {
      userId: user.id,
      metadata: { 
        jobId: job_id, 
        expectedUrl: voiceoverPublicUrl, 
        actualUrl: verifyJob?.voiceover_url 
      }
    });

    if (verifyJob?.voiceover_url !== voiceoverPublicUrl) {
      logger.error('URL mismatch detected', new Error('URL mismatch'), {
        userId: user.id,
        metadata: { 
          jobId: job_id, 
          expectedUrl: voiceoverPublicUrl, 
          actualUrl: verifyJob?.voiceover_url 
        }
      });
      throw new Error('Voiceover URL was not stored correctly in database');
    }

    logger.logDuration('approve-script completed', startTime, {
      userId: user.id,
      metadata: { jobId: job_id, status: 'awaiting_voice_approval', duration: actualAudioDuration }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Voiceover generated successfully',
        status: 'awaiting_voice_approval'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const logger = new EdgeLogger('approve-script', requestId, supabaseClient, true);
    
    logger.error('approve-script failed', error, { metadata: { jobId: job_id, errorMessage: error?.message } });
    
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});