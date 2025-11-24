import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { VIDEO_JOB_STATUS } from "../_shared/constants.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { GENERATION_STATUS } from "../_shared/constants.ts";

// Type definitions
interface SanitizedData {
  [key: string]: unknown;
}

interface PixabayVideo {
  videos?: {
    large?: { url?: string; width?: number; height?: number };
    medium?: { url?: string; width?: number; height?: number };
    small?: { url?: string; width?: number; height?: number };
  };
  duration?: number;
  id?: number;
}

interface PixabayVideoResponse {
  hits?: PixabayVideo[];
}

// Inlined helper: sanitize sensitive data
function sanitizeData(data: unknown): SanitizedData {
  if (!data) return {};
  if (typeof data !== 'object' || data === null) return {};
  const sanitized = { ...data as Record<string, unknown> };
  const sensitiveKeys = ['api_key', 'authorization', 'token', 'secret', 'apiKey'];
  sensitiveKeys.forEach(key => delete sanitized[key]);
  if (sanitized.headers && typeof sanitized.headers === 'object') {
    const headers = sanitized.headers as Record<string, unknown>;
    sensitiveKeys.forEach(key => delete headers[key]);
  }
  return sanitized;
}

// Inlined helper: log API call with EdgeLogger integration
async function logApiCall(
  supabase: SupabaseClient,
  logger: EdgeLogger,
  request: {
    videoJobId: string;
    userId: string;
    serviceName: string;
    endpoint: string;
    httpMethod: string;
    stepName: string;
    requestPayload?: unknown;
    additionalMetadata?: Record<string, unknown>;
  },
  requestSentAt: Date,
  response: {
    statusCode: number;
    payload?: unknown;
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
    logger.warn('Failed to log API call', { metadata: { error: error instanceof Error ? error.message : String(error) } });
  }
}

Deno.serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

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
    if (job.status === VIDEO_JOB_STATUS.COMPLETED) {
      logger.info('Job already completed, skipping', { userId: job.user_id, metadata: { job_id } });
      return new Response(
        JSON.stringify({ success: true, status: 'already_completed' }),
        { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (job.status === VIDEO_JOB_STATUS.FAILED) {
      logger.info('Job already failed, skipping', { userId: job.user_id, metadata: { job_id } });
      return new Response(
        JSON.stringify({ success: false, status: 'already_failed' }),
        { headers: { ...responseHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (job.status === VIDEO_JOB_STATUS.AWAITING_SCRIPT_APPROVAL || job.status === VIDEO_JOB_STATUS.AWAITING_VOICE_APPROVAL) {
      logger.info('Awaiting user approval, skipping auto-processing', { 
        userId: job.user_id, 
        metadata: { job_id, status: job.status } 
      });
      return new Response(
        JSON.stringify({ success: true, status: job.status }),
        { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Generate script (skip if already done)
    let script = job.script;
    if (!script) {
      logger.info('Generating script', { userId: job.user_id, metadata: { job_id } });
      await updateJobStatus(supabaseClient, job_id, VIDEO_JOB_STATUS.GENERATING_SCRIPT);
      script = await generateScript(supabaseClient, logger, job.topic, job.duration, job.style, job_id, job.user_id);
      await supabaseClient.from('video_jobs').update({ script }).eq('id', job_id);
      logger.info('Script generated successfully', { userId: job.user_id, metadata: { job_id } });
    } else {
      logger.debug('Script already exists, skipping generation', { userId: job.user_id, metadata: { job_id } });
    }

    // Pause for user approval of script
    logger.info('Script ready for review', { userId: job.user_id, metadata: { job_id } });
    await updateJobStatus(supabaseClient, job_id, VIDEO_JOB_STATUS.AWAITING_SCRIPT_APPROVAL);

    return new Response(
      JSON.stringify({ 
        success: true, 
        job_id,
        status: 'awaiting_script_approval',
        message: 'Script ready for review'
      }),
      { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const logger = new EdgeLogger('process-video-job', requestId, supabaseClient, true);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    logger.error('Fatal error during processing', error instanceof Error ? error : new Error(String(error)), { metadata: { job_id: job_id || 'unknown' } });
    
    // Update job as failed if we have a job_id
    if (job_id) {
      try {
        await supabaseClient
          .from('video_jobs')
          .update({
            status: VIDEO_JOB_STATUS.FAILED,
            error_message: errorMessage,
            error_details: {
              error: errorMessage,
              stack: error instanceof Error ? error.stack : undefined,
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
        headers: { ...responseHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Helper functions

async function updateJobStatus(supabase: SupabaseClient, jobId: string, status: string) {
  await supabase.from('video_jobs').update({ status }).eq('id', jobId);
}

async function generateScript(
  supabase: SupabaseClient,
  logger: EdgeLogger,
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function _getBackgroundVideo(
  supabase: SupabaseClient,
  logger: EdgeLogger,
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
    logger.debug('Using topic-based search', { userId, metadata: { jobId: videoJobId, searchQuery, topic } });
  } else {
    // Fallback to style-based queries
    const queries: Record<string, string> = {
      modern: 'technology abstract motion',
      tech: 'digital technology futuristic',
      educational: 'books learning study',
      dramatic: 'cinematic nature dramatic'
    };
    searchQuery = queries[style] || 'abstract motion background';
    logger.debug('Using style-based search', { userId, metadata: { jobId: videoJobId, searchQuery, style } });
  }
  const pixabayApiKey = Deno.env.get('PIXABAY_API_KEY');
  const endpoint = `https://pixabay.com/api/videos/?key=${pixabayApiKey}&q=${encodeURIComponent(searchQuery)}&per_page=20`;
  const requestSentAt = new Date();

  logger.info('Searching Pixabay', { userId, metadata: { jobId: videoJobId, searchQuery } });

  const response = await fetch(endpoint);

  const data: PixabayVideoResponse | null = response.ok ? await response.json() : null;

  // Log the API call
  logApiCall(
    supabase,
    logger,
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
  ).catch(e => logger.error('Failed to log Pixabay API call', e instanceof Error ? e : undefined));

  if (!response.ok) {
    throw new Error(`Pixabay API error: ${response.status}`);
  }
  
  if (!data.hits?.length) {
    throw new Error('No background videos found');
  }

  logger.info('Pixabay search results', { userId, metadata: { jobId: videoJobId, hitCount: data.hits.length, searchQuery } });

  // Filter landscape videos (width > height) longer than required duration
  const landscapeVideos = data.hits.filter((v: PixabayVideo) => {
    const width = v.videos?.large?.width || v.videos?.medium?.width || 1920;
    const height = v.videos?.large?.height || v.videos?.medium?.height || 1080;
    return width > height && (v.duration || 0) >= duration;
  });
  
  const video = landscapeVideos.length 
    ? landscapeVideos[Math.floor(Math.random() * landscapeVideos.length)] 
    : data.hits[0];

  // Get best quality video URL
  const videoUrl = video.videos?.large?.url || video.videos?.medium?.url || video.videos?.small?.url;
  
  if (!videoUrl) {
    throw new Error('No video URL found');
  }

  logger.info('Selected Pixabay video', { userId, metadata: { jobId: videoJobId, videoId: video.id, duration: video.duration } });
  return videoUrl;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function _assembleVideo(
  supabase: SupabaseClient,
  logger: EdgeLogger,
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

  logger.info('Submitting render to Shotstack', { 
    userId,
    metadata: { 
      jobId: videoJobId, 
      duration: assets.duration, 
      wordCount: words.length,
      videoUrl: assets.backgroundVideoUrl 
    } 
  });

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
  } catch {
    logger.error('Failed to parse Shotstack response', new Error('JSON parse failed'), { 
      userId,
      metadata: { jobId: videoJobId, responseText: responseText.substring(0, 500) } 
    });
  }

  // Log the API call with detailed error info
  logApiCall(
    supabase,
    logger,
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
  ).catch(e => logger.error('Failed to log API call', e instanceof Error ? e : new Error(String(e))));

  if (!response.ok) {
    logger.error('Shotstack error details', undefined, {
      metadata: {
        status: response.status,
        response: result,
        requestPayload: edit
      }
    });
    throw new Error(`Shotstack error: ${result?.message || result?.detail || response.statusText || 'Bad Request'}`);
  }

  logger.info('Render submitted', { metadata: { jobId: videoJobId, renderId: result.response.id } });
  return result.response.id;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function _pollRenderStatus(supabase: SupabaseClient, logger: EdgeLogger, jobId: string, renderId: string, userId: string) {
  const maxAttempts = 120; // 10 minutes max (5s interval)
  let attempts = 0;

  logger.info('Starting render status polling', { 
    userId,
    metadata: { jobId, renderId, maxAttempts } 
  });

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    attempts++;

    const endpoint = `https://api.shotstack.io/v1/render/${renderId}`;
    const requestSentAt = new Date();

    logger.debug('Polling render status', { 
      userId,
      metadata: { jobId, renderId, attempt: attempts, maxAttempts } 
    });

    const response = await fetch(endpoint, {
      headers: { 'x-api-key': Deno.env.get('SHOTSTACK_API_KEY') ?? '' }
    });

    const result = response.ok ? await response.json() : null;
    const status = result?.response?.status || 'unknown';
    
    // Log every status poll
    await logApiCall(
      supabase,
      logger,
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

    logger.info('Render status check', { 
      userId,
      metadata: { jobId, renderId, status, attempt: attempts } 
    });

    if (status === 'done' && result.response.url) {
      const videoUrl = result.response.url;
      logger.info('Render completed successfully', { 
        userId,
        metadata: { jobId, renderId, videoUrl: videoUrl.substring(0, 100) } 
      });
      
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
            logger.info('Generation record already exists', { 
              userId,
              metadata: { jobId, generationId: existingGeneration.id } 
            });
          } else {
            // Download video from Shotstack
            logger.info('Downloading video from Shotstack', { 
              userId,
              metadata: { jobId, videoUrl: videoUrl.substring(0, 100) } 
            });
            const videoResponse = await fetch(videoUrl);
            if (!videoResponse.ok) {
              throw new Error('Failed to download video from Shotstack');
            }
            
            const videoBlob = await videoResponse.blob();
            const videoBuffer = await videoBlob.arrayBuffer();
            const videoData = new Uint8Array(videoBuffer);
            
            // Upload to generated-content bucket (using videoPath defined above)
            logger.info('Uploading video to storage', { 
              userId,
              metadata: { jobId, videoPath, sizeBytes: videoData.length } 
            });
            
            const { error: uploadError } = await supabase.storage
              .from('generated-content')
              .upload(videoPath, videoData, {
                contentType: 'video/mp4',
                upsert: true
              });
            
            if (uploadError) {
              logger.error('Storage upload failed', uploadError as Error, { 
                userId,
                metadata: { jobId, videoPath } 
              });
              throw uploadError;
            }
            
            // Generate signed URL from storage (valid for 7 days)
            logger.debug('Generating signed URL from storage', { 
              userId,
              metadata: { jobId, videoPath } 
            });
            const { data: signedUrlData, error: signedUrlError } = await supabase.storage
              .from('generated-content')
              .createSignedUrl(videoPath, 60 * 60 * 24 * 7);
            
            // Update finalVideoUrl if we successfully got a signed URL
            if (!signedUrlError && signedUrlData?.signedUrl) {
              finalVideoUrl = signedUrlData.signedUrl;
              logger.info('Using signed storage URL', { 
                userId,
                metadata: { jobId } 
              });
            } else {
              logger.warn('Could not generate signed URL, using Shotstack URL', { 
                userId,
                metadata: { jobId, error: signedUrlError } 
              });
            }
            
            // Create generation record with job's cost_tokens
            logger.info('Creating generation record', { 
              userId,
              metadata: { jobId, costTokens: job.cost_tokens } 
            });
            const { data: generation, error: genError } = await supabase.from('generations').insert({
              user_id: job.user_id,
              type: 'video',
              prompt: `Faceless Video: ${job.topic}`,
              status: GENERATION_STATUS.COMPLETED,
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
              logger.error('Generation insert failed', genError as Error, { 
                userId,
                metadata: { jobId } 
              });
            } else {
              logger.info('Generation record created', { 
                userId,
                metadata: { jobId, generationId: generation.id } 
              });
              
              // Link all API logs to this generation
              try {
                await supabase
                  .from('api_call_logs')
                  .update({ generation_id: generation.id })
                  .eq('video_job_id', jobId)
                  .is('generation_id', null);
              } catch (error) {
                logger.error('Failed to link API logs to generation', error as Error, { 
                  userId,
                  metadata: { jobId, generationId: generation.id } 
                });
              }
            }
          }
        } catch (error) {
          logger.error('Error creating generation record', error as Error, { 
            userId,
            metadata: { jobId } 
          });
          // Don't fail the job if generation creation fails
        }
      }
      
      await supabase.from('video_jobs').update({
        status: GENERATION_STATUS.COMPLETED,
        final_video_url: finalVideoUrl,
        storage_path: videoPath,
        completed_at: new Date().toISOString()
      }).eq('id', jobId);
      
      logger.info('Job completed successfully', { 
        userId,
        metadata: { jobId, finalVideoUrl: finalVideoUrl.substring(0, 100) } 
      });
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
      
      logger.error('Shotstack render failed', new Error(errorDetails.shotstack_error || errorDetails.shotstack_message), { 
        userId,
        metadata: { jobId, renderId, errorDetails } 
      });
      
      const errorMsg = errorDetails.shotstack_error || errorDetails.shotstack_message;
      throw new Error(`Shotstack rendering failed: ${errorMsg}`);
    }
  }

  logger.error('Render timeout', new Error('Render timeout after 10 minutes'), { 
    userId,
    metadata: { jobId, renderId, maxAttempts, totalTime: '10 minutes' } 
  });
  throw new Error('Render timeout after 10 minutes');
}
