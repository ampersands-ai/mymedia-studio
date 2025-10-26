import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

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

// Inlined helper: log API call (background task)
async function logApiCall(
  supabase: any,
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
  } catch (error) {
    console.error('Failed to log API call:', error);
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
          console.log(`Retry ${attempt + 1}/${maxRetries} after ${delay}ms...`);
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
        console.log(`Network error, retry ${attempt + 1}/${maxRetries} after ${delay}ms...`);
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

  try {
    const { job_id, edited_script } = await req.json();

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

    // Authenticate user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
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

    // If regenerating voiceover (edited_script provided), calculate and deduct tokens
    if (edited_script && edited_script !== job.script) {
      const voiceoverCost = Math.ceil((edited_script.length / 1000) * 144);
      console.log(`[${job_id}] Regenerating voiceover, cost: ${voiceoverCost} tokens`);

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
        throw new Error(`Insufficient tokens. ${voiceoverCost} tokens required to regenerate voiceover.`);
      }

      // Deduct tokens atomically
      const { error: deductError } = await supabaseClient
        .from('user_subscriptions')
        .update({ tokens_remaining: subscription.tokens_remaining - voiceoverCost })
        .eq('user_id', user.id)
        .eq('tokens_remaining', subscription.tokens_remaining);

      if (deductError) {
        console.error('Token deduction error:', deductError);
        throw new Error('Failed to deduct tokens. Please try again.');
      }

      console.log(`[${job_id}] Deducted ${voiceoverCost} tokens for voiceover regeneration`);
    }

    console.log(`[${job_id}] Script approved, generating voiceover...`);

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
    ).catch(e => console.error('Failed to log API call:', e));

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
    console.log(`[${job_id}] Calculated audio duration: ${actualAudioDuration}s from ${words.length} words`);

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
    console.log(`[${job_id}] Voiceover stored at: ${voiceoverPublicUrl}`);

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
      console.error(`[${job_id}] Failed to update job with voiceover:`, updateError);
      throw new Error(`Failed to update job with voiceover: ${updateError.message}`);
    }

    console.log(`[${job_id}] Job updated, verifying database storage...`);
    
    // Verify the URL was stored correctly
    const { data: verifyJob, error: verifyError } = await supabaseClient
      .from('video_jobs')
      .select('voiceover_url')
      .eq('id', job_id)
      .single();

    if (verifyError) {
      console.error(`[${job_id}] Failed to verify voiceover URL:`, verifyError);
      throw new Error('Failed to verify voiceover URL was saved');
    }

    console.log(`[${job_id}] Verification - Expected URL: ${voiceoverPublicUrl}`);
    console.log(`[${job_id}] Verification - Actual URL in DB: ${verifyJob?.voiceover_url}`);

    if (verifyJob?.voiceover_url !== voiceoverPublicUrl) {
      console.error(`[${job_id}] URL MISMATCH! Database contains: ${verifyJob?.voiceover_url}`);
      throw new Error('Voiceover URL was not stored correctly in database');
    }

    console.log(`[${job_id}] ✅ Verification passed - URL stored correctly`);
    console.log(`[${job_id}] Voiceover generated, awaiting approval`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Voiceover generated successfully',
        status: 'awaiting_voice_approval'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('approve-script error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});