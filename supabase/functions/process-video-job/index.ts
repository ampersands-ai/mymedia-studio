import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Inlined helper: sanitize sensitive data
function sanitizeData(data: any): any {
  if (!data) return data;
  const sanitized = { ...data };
  const sensitiveKeys = ['api_key', 'authorization', 'token', 'secret', 'apiKey'];
  sensitiveKeys.forEach(key => delete sanitized[key]);
  if (sanitized.headers) {
    sensitiveKeys.forEach(key => delete sanitized.headers[key]);
  }
  return sanitized;
}

// Inlined helper: log API call with EdgeLogger integration
async function logApiCall(
  supabase: any,
  logger: any,
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
        metadata: { 
          step: request.stepName,
          status: response.statusCode,
          error: response.errorMessage 
        }
      });
    } else {
      logger.debug(`API call succeeded: ${request.serviceName}`, {
        metadata: { step: request.stepName, status: response.statusCode }
      });
    }
  } catch (error) {
    logger.warn('Failed to log API call', { metadata: { error: error.message } });
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  let job_id: string | undefined;

  try {
    const { job_id: jobIdParam } = await req.json();
    job_id = jobIdParam;

    if (!job_id) {
      throw new Error('job_id is required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const logger = new EdgeLogger('process-video-job', requestId, supabaseClient, true);

    // Validate Shotstack API key
    const shotstackApiKey = Deno.env.get('SHOTSTACK_API_KEY');
    if (!shotstackApiKey || shotstackApiKey.trim() === '') {
      throw new Error('SHOTSTACK_API_KEY is not configured');
    }

    // Get job details
    const { data: job, error: jobError } = await supabaseClient
      .from('video_jobs')
      .select('*')
      .eq('id', job_id)
      .single();

    if (jobError || !job) {
      throw new Error('Job not found');
    }

    logger.info('Processing video job', {
      userId: job.user_id,
      metadata: { job_id, status: job.status, topic: job.topic }
    });

    // Idempotency: Resume from current status
    if (job.status === 'completed') {
      logger.info('Job already completed, skipping', { userId: job.user_id, metadata: { job_id } });
      return new Response(
        JSON.stringify({ success: true, status: 'already_completed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (job.status === 'failed') {
      logger.info('Job already failed, skipping', { userId: job.user_id, metadata: { job_id } });
      return new Response(
        JSON.stringify({ success: false, status: 'already_failed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (job.status === 'awaiting_script_approval' || job.status === 'awaiting_voice_approval') {
      logger.info('Awaiting user approval, skipping auto-processing', { 
        userId: job.user_id, 
        metadata: { job_id, status: job.status } 
      });
      return new Response(
        JSON.stringify({ success: true, status: job.status }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Generate script (skip if already done)
    let script = job.script;
    if (!script) {
      logger.info('Generating script', { userId: job.user_id, metadata: { job_id } });
      await updateJobStatus(supabaseClient, job_id, 'generating_script');
      script = await generateScript(supabaseClient, logger, job.topic, job.duration, job.style, job_id, job.user_id);
      await supabaseClient.from('video_jobs').update({ script }).eq('id', job_id);
      logger.info('Script generated successfully', { userId: job.user_id, metadata: { job_id } });
    } else {
      logger.debug('Script already exists, skipping generation', { userId: job.user_id, metadata: { job_id } });
    }

    // Pause for user approval of script
    logger.info('Script ready for review', { userId: job.user_id, metadata: { job_id } });
    await updateJobStatus(supabaseClient, job_id, 'awaiting_script_approval');

    return new Response(
      JSON.stringify({ 
        success: true, 
        job_id,
        status: 'awaiting_script_approval',
        message: 'Script ready for review'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const logger = new EdgeLogger('process-video-job', requestId, supabaseClient, true);
    
    const errorMessage = error.message || 'Unknown error occurred';
    
    logger.error('Fatal error during processing', error, { metadata: { job_id: job_id || 'unknown' } });
    
    // Update job as failed if we have a job_id
    if (job_id) {
      try {
        await supabaseClient
          .from('video_jobs')
          .update({
            status: 'failed',
            error_message: errorMessage,
            error_details: { 
              error: errorMessage,
              stack: error.stack,
              timestamp: new Date().toISOString()
            }
          })
          .eq('id', job_id);
      } catch (updateError) {
        logger.error('Failed to update job status', updateError instanceof Error ? updateError : undefined);
      }
    }

    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        job_id: job_id || 'unknown'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Helper functions

async function updateJobStatus(supabase: any, jobId: string, status: string) {
  await supabase.from('video_jobs').update({ status }).eq('id', jobId);
}

async function generateScript(
  supabase: any,
  logger: any,
  topic: string,
  duration: number,
  style: string,
  videoJobId: string,
  userId: string
): Promise<string> {
  const wordsPerSecond = 2.5;
  const targetWords = Math.floor(duration * wordsPerSecond);

  const requestPayload = {
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Write a ${duration}-second video script about: ${topic}

Style: ${style}
Target: ~${targetWords} words

Requirements:
- Engaging hook in first 3 seconds
- Clear, conversational tone
- No fluff, straight to value
- End with CTA or thought-provoking question
- Format: Just narration text, no stage directions

Script:`
    }]
  };

  const endpoint = 'https://api.anthropic.com/v1/messages';
  const requestSentAt = new Date();

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') ?? '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(requestPayload)
  });

  const data = response.ok ? await response.json() : null;

  // Log the API call
  logApiCall(
    supabase,
    logger,
    {
      videoJobId,
      userId,
      serviceName: 'anthropic',
      endpoint,
      httpMethod: 'POST',
      stepName: 'generate_script',
      requestPayload,
      additionalMetadata: {
        topic,
        duration,
        style,
        target_words: targetWords
      }
    },
    requestSentAt,
    {
      statusCode: response.status,
      payload: data,
      isError: !response.ok,
      errorMessage: response.ok ? undefined : `Anthropic returned ${response.status}`
    }
  ).catch(e => logger.error('Failed to log API call', e instanceof Error ? e : undefined));

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${error}`);
  }

  return data.content[0].text.trim();
}

async function generateVoiceover(script: string, voiceId: string): Promise<Blob> {
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': Deno.env.get('ELEVENLABS_API_KEY') ?? ''
    },
    body: JSON.stringify({
      text: script,
      model_id: 'eleven_turbo_v2_5',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.5,
        use_speaker_boost: true
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('ElevenLabs API error:', response.status, errorText);
    
    // Try to parse error response
    interface ElevenLabsErrorDetails {
      message?: string;
      detail?: {
        message?: string;
      };
    }
    
    let errorDetails: ElevenLabsErrorDetails = {};
    try {
      errorDetails = JSON.parse(errorText);
    } catch {
      errorDetails = { message: errorText };
    }

    // Detect specific error types
    const errorMessage = errorDetails.detail?.message || errorDetails.message || errorText;
    
    if (errorMessage.includes('detected_unusual_activity') || errorMessage.includes('Free Tier usage disabled')) {
      throw new Error('ElevenLabs API key has been restricted due to unusual activity. Please upgrade to a paid plan or use a different API key.');
    } else if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
      throw new Error('ElevenLabs API quota exceeded. Please check your account limits.');
    } else if (errorMessage.includes('invalid') || errorMessage.includes('unauthorized')) {
      throw new Error('Invalid ElevenLabs API key. Please check your configuration.');
    }
    
    throw new Error(`ElevenLabs error: ${errorMessage}`);
  }

  return await response.blob();
}

function extractSearchTerms(topic: string): string {
  // Remove common filler words and limit to key terms
  const fillerWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during', 'how', 'what', 'why', 'when', 'where', 'who', 'which', 'top', 'best', 'ways', 'tips', 'guide'];
  
  const words = topic
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .split(/\s+/)
    .filter(word => word.length > 2 && !fillerWords.includes(word))
    .slice(0, 5); // Limit to 5 key terms
  
  return words.join(' ') || 'abstract background';
}

async function getBackgroundVideo(
  supabase: any,
  style: string,
  duration: number,
  videoJobId: string,
  userId: string,
  topic?: string
): Promise<string> {
  // Use topic for search if available, otherwise fall back to style
  let searchQuery: string;
  if (topic && topic.trim()) {
    // Extract key terms from topic (remove filler words, limit length)
    searchQuery = extractSearchTerms(topic);
    console.log(`[${videoJobId}] Using topic-based search: "${searchQuery}" (from topic: "${topic}")`);
  } else {
    // Fallback to style-based queries
    const queries: Record<string, string> = {
      modern: 'technology abstract motion',
      tech: 'digital technology futuristic',
      educational: 'books learning study',
      dramatic: 'cinematic nature dramatic'
    };
    searchQuery = queries[style] || 'abstract motion background';
    console.log(`[${videoJobId}] Using style-based search: "${searchQuery}"`);
  }
  const pixabayApiKey = Deno.env.get('PIXABAY_API_KEY');
  const endpoint = `https://pixabay.com/api/videos/?key=${pixabayApiKey}&q=${encodeURIComponent(searchQuery)}&per_page=20`;
  const requestSentAt = new Date();

  console.log(`[${videoJobId}] Searching Pixabay for: ${searchQuery}`);

  const response = await fetch(endpoint);

  const data = response.ok ? await response.json() : null;

  // Log the API call
  logApiCall(
    supabase,
    {
      videoJobId,
      userId,
      serviceName: 'pixabay',
      endpoint: endpoint.replace(pixabayApiKey || '', 'REDACTED'),
      httpMethod: 'GET',
      stepName: 'fetch_background_video',
      requestPayload: { query: searchQuery, style, duration },
      additionalMetadata: { per_page: 20, topic: topic || 'none' }
    },
    requestSentAt,
    {
      statusCode: response.status,
      payload: data,
      isError: !response.ok,
      errorMessage: response.ok ? undefined : `Pixabay returned ${response.status}`
    }
  ).catch(e => console.error('Failed to log API call:', e));

  if (!response.ok) {
    throw new Error(`Pixabay API error: ${response.status}`);
  }
  
  if (!data.hits?.length) {
    throw new Error('No background videos found');
  }

  console.log(`[${videoJobId}] Found ${data.hits.length} videos from Pixabay`);

  // Filter landscape videos (width > height) longer than required duration
  const landscapeVideos = data.hits.filter((v: any) => {
    const width = v.videos?.large?.width || v.videos?.medium?.width || 1920;
    const height = v.videos?.large?.height || v.videos?.medium?.height || 1080;
    return width > height && v.duration >= duration;
  });
  
  const video = landscapeVideos.length 
    ? landscapeVideos[Math.floor(Math.random() * landscapeVideos.length)] 
    : data.hits[0];

  // Get best quality video URL
  const videoUrl = video.videos?.large?.url || video.videos?.medium?.url || video.videos?.small?.url;
  
  if (!videoUrl) {
    throw new Error('No video URL found');
  }
  
  console.log(`[${videoJobId}] Selected video: ${video.id}`);
  return videoUrl;
}

async function assembleVideo(
  supabase: any,
  assets: {
    script: string;
    voiceoverUrl: string;
    backgroundVideoUrl: string;
    duration: number;
  },
  videoJobId: string,
  userId: string
): Promise<string> {
  // Generate word-by-word subtitles
  const words = assets.script.split(' ');
  const wordsPerSecond = 2.5;
  const secondsPerWord = 1 / wordsPerSecond;
  
  const subtitleClips = words.map((word, index) => ({
    asset: {
      type: 'html',
      html: `<p>${word}</p>`,
      css: `p { 
        font-family: 'Montserrat', 'Arial', sans-serif; 
        font-size: 60px; 
        font-weight: 800;
        color: #ffffff; 
        text-align: center; 
        background: linear-gradient(135deg, rgba(0,0,0,0.9), rgba(0,0,0,0.85)); 
        padding: 24px 48px;
        border-radius: 12px;
        text-shadow: 3px 3px 6px rgba(0,0,0,0.9);
        letter-spacing: 1px;
      }`,
      width: 1920,
      height: 200
    },
    start: index * secondsPerWord,
    length: secondsPerWord * 1.2,
    position: 'center',
    transition: {
      in: 'fade',
      out: 'fade'
    }
  }));

  const edit = {
    timeline: {
      soundtrack: {
        src: assets.voiceoverUrl,
        effect: 'fadeInFadeOut'
      },
      tracks: [
        {
          clips: [{
            asset: {
              type: 'video',
              src: assets.backgroundVideoUrl,
            },
            start: 0,
            length: assets.duration,
            fit: 'cover',
            effect: 'zoomIn',
            scale: 1.1
          }]
        },
        {
          clips: subtitleClips
        }
      ]
    },
    output: {
      format: 'mp4',
      resolution: 'hd',
      fps: 30,
      quality: 'high'
    }
  };

  const endpoint = 'https://api.shotstack.io/v1/render';
  const requestSentAt = new Date();

  console.log(`[${videoJobId}] Submitting render to Shotstack...`);
  console.log(`[${videoJobId}] Video duration: ${assets.duration}s, Words: ${words.length}`);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': Deno.env.get('SHOTSTACK_API_KEY') ?? ''
    },
    body: JSON.stringify(edit)
  });

  const responseText = await response.text();
  let result = null;
  
  try {
    result = responseText ? JSON.parse(responseText) : null;
  } catch (parseError) {
    console.error('Failed to parse Shotstack response:', responseText);
  }

  // Log the API call with detailed error info
  logApiCall(
    supabase,
    {
      videoJobId,
      userId,
      serviceName: 'shotstack',
      endpoint,
      httpMethod: 'POST',
      stepName: 'submit_render',
      requestPayload: edit,
      additionalMetadata: {
        duration: assets.duration,
        word_count: words.length,
        subtitle_clips: subtitleClips.length
      }
    },
    requestSentAt,
    {
      statusCode: response.status,
      payload: result,
      isError: !response.ok,
      errorMessage: response.ok ? undefined : result?.message || result?.detail || `Shotstack returned ${response.status}`
    }
  ).catch(e => console.error('Failed to log API call:', e));

  if (!response.ok) {
    console.error(`[${videoJobId}] Shotstack error details:`, {
      status: response.status,
      response: result,
      requestPayload: edit
    });
    throw new Error(`Shotstack error: ${result?.message || result?.detail || response.statusText || 'Bad Request'}`);
  }

  console.log(`[${videoJobId}] Render submitted: ${result.response.id}`);
  return result.response.id;
}

async function pollRenderStatus(supabase: any, jobId: string, renderId: string, userId: string) {
  const maxAttempts = 120; // 10 minutes max (5s interval)
  let attempts = 0;

  console.log(`[${jobId}] Starting to poll render status for ${renderId}`);

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    attempts++;

    const endpoint = `https://api.shotstack.io/v1/render/${renderId}`;
    const requestSentAt = new Date();

    console.log(`[${jobId}] Polling render status (attempt ${attempts}/${maxAttempts})...`);

    const response = await fetch(endpoint, {
      headers: { 'x-api-key': Deno.env.get('SHOTSTACK_API_KEY') ?? '' }
    });

    const result = response.ok ? await response.json() : null;
    const status = result?.response?.status || 'unknown';
    
    // Log every status poll
    await logApiCall(
      supabase,
      {
        videoJobId: jobId,
        userId,
        serviceName: 'shotstack',
        endpoint,
        httpMethod: 'GET',
        stepName: 'poll_render_status',
        requestPayload: { render_id: renderId, attempt: attempts },
        additionalMetadata: { max_attempts: maxAttempts }
      },
      requestSentAt,
      {
        statusCode: response.status,
        payload: result,
        isError: !response.ok || status === 'failed',
        errorMessage: !response.ok ? `Shotstack returned ${response.status}` : status === 'failed' ? 'Render failed' : undefined
      }
    );

    console.log(`[${jobId}] Render status: ${status}`);

    if (status === 'done' && result.response.url) {
      const videoUrl = result.response.url;
      console.log(`[${jobId}] Render complete! Video URL: ${videoUrl}`);
      
      // Get job details to create generation
      const { data: job } = await supabase
        .from('video_jobs')
        .select('user_id, topic, duration, style, voice_id, cost_tokens')
        .eq('id', jobId)
        .single();
      
      // Define videoPath here after we have job data
      const videoPath = job ? `${job.user_id}/${new Date().toISOString().split('T')[0]}/${jobId}.mp4` : '';
      let finalVideoUrl = videoUrl; // Initialize with Shotstack URL as fallback
      
      if (job) {
        try {
          // Check if generation already exists (idempotency)
          const { data: existingGeneration } = await supabase
            .from('generations')
            .select('id')
            .eq('settings->>video_job_id', jobId)
            .single();
          
          if (existingGeneration) {
            console.log(`[${jobId}] Generation record already exists: ${existingGeneration.id}, skipping creation`);
          } else {
            // Download video from Shotstack
            console.log(`[${jobId}] Downloading video from Shotstack...`);
            const videoResponse = await fetch(videoUrl);
            if (!videoResponse.ok) {
              throw new Error('Failed to download video from Shotstack');
            }
            
            const videoBlob = await videoResponse.blob();
            const videoBuffer = await videoBlob.arrayBuffer();
            const videoData = new Uint8Array(videoBuffer);
            
            // Upload to generated-content bucket (using videoPath defined above)
            console.log(`[${jobId}] Uploading video to storage: ${videoPath}`);
            
            const { error: uploadError } = await supabase.storage
              .from('generated-content')
              .upload(videoPath, videoData, {
                contentType: 'video/mp4',
                upsert: true
              });
            
            if (uploadError) {
              console.error(`[${jobId}] Storage upload error:`, uploadError);
              throw uploadError;
            }
            
            // Generate signed URL from storage (valid for 7 days)
            console.log(`[${jobId}] Generating signed URL from storage...`);
            const { data: signedUrlData, error: signedUrlError } = await supabase.storage
              .from('generated-content')
              .createSignedUrl(videoPath, 60 * 60 * 24 * 7);
            
            // Update finalVideoUrl if we successfully got a signed URL
            if (!signedUrlError && signedUrlData?.signedUrl) {
              finalVideoUrl = signedUrlData.signedUrl;
              console.log(`[${jobId}] Using signed storage URL`);
            } else {
              console.warn(`[${jobId}] Could not generate signed URL, using Shotstack URL:`, signedUrlError);
            }
            
            // Create generation record with job's cost_tokens
            console.log(`[${jobId}] Creating generation record with ${job.cost_tokens} credits...`);
            const { data: generation, error: genError } = await supabase.from('generations').insert({
              user_id: job.user_id,
              type: 'video',
              prompt: `Faceless Video: ${job.topic}`,
              status: 'completed',
              tokens_used: job.cost_tokens,
              storage_path: videoPath,
              model_id: 'faceless-video-generator',
              file_size_bytes: videoData.length,
              settings: {
                duration: job.duration,
                style: job.style,
                voice_id: job.voice_id,
                video_job_id: jobId
              }
            }).select('id').single();
            
            if (genError) {
              console.error(`[${jobId}] Generation insert error:`, genError);
            } else {
              console.log(`[${jobId}] Generation record created: ${generation.id}`);
              
              // Link all API logs to this generation
              try {
                await supabase
                  .from('api_call_logs')
                  .update({ generation_id: generation.id })
                  .eq('video_job_id', jobId)
                  .is('generation_id', null);
              } catch (error) {
                console.error('Failed to link API logs to generation:', error);
              }
            }
          }
        } catch (error) {
          console.error(`[${jobId}] Error creating generation record:`, error);
          // Don't fail the job if generation creation fails
        }
      }
      
      await supabase.from('video_jobs').update({
        status: 'completed',
        final_video_url: finalVideoUrl,
        storage_path: videoPath,
        completed_at: new Date().toISOString()
      }).eq('id', jobId);
      
      console.log(`[${jobId}] Job completed successfully!`);
      return;
    }

    if (status === 'failed') {
      const errorDetails = {
        render_id: renderId,
        shotstack_status: status,
        shotstack_error: result.response.error || 'Unknown error',
        shotstack_message: result.response.data?.message || result.response.message || 'No error message provided',
        full_response: result
      };
      
      console.error(`[${jobId}] Shotstack render failed:`, JSON.stringify(errorDetails, null, 2));
      
      const errorMsg = errorDetails.shotstack_error || errorDetails.shotstack_message;
      throw new Error(`Shotstack rendering failed: ${errorMsg}`);
    }
  }

  console.error(`[${jobId}] Render timeout after ${maxAttempts} attempts (10 minutes)`);
  throw new Error('Render timeout after 10 minutes');
}
