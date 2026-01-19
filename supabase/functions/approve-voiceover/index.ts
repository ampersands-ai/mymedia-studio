import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { GENERATION_STATUS } from "../_shared/constants.ts";
import { API_ENDPOINTS } from "../_shared/api-endpoints.ts";
import { applyRateLimit } from "../_shared/rate-limit-middleware.ts";
import { withCircuitBreaker } from "../_shared/circuit-breaker-enhanced.ts";

// ============= MEMORY OPTIMIZATION CONSTANTS =============
// These values are tuned for Deno's 150MB memory limit under concurrent load
const TARGET_UNIQUE_VIDEOS = 25;  // Reduced from 40 - sufficient for 60s videos
const PER_PAGE = 30;              // Reduced from 50 - less memory per API call
const MAX_QUERIES = 5;            // Limit total Pixabay API calls
const FETCH_TIMEOUT_MS = 10000;   // 10 second timeout for external APIs
const MAX_CLIPS_SAFETY = 100;     // Safety limit for clip assembly loops

// ============= TYPE DEFINITIONS =============
interface SanitizedData {
  [key: string]: unknown;
}

interface PixabayImage {
  largeImageURL?: string;
  webformatURL?: string;
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

// Background video with minimal metadata (memory-optimized)
interface BackgroundVideo {
  url: string;
  duration: number; // in seconds
}

// Minimal video metadata for memory efficiency during fetching
interface VideoMetadata {
  id: number;
  url: string;
  duration: number;
  isPortrait: boolean; // Pre-computed to avoid storing width/height
}

interface PixabayImageResponse {
  hits?: PixabayImage[];
}

interface PixabayVideoResponse {
  hits?: PixabayVideo[];
}

// ============= UTILITY FUNCTIONS =============

/**
 * Fetch with timeout wrapper - prevents hanging requests from consuming memory
 * Implements AbortController for clean cancellation
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

interface VideoJob {
  user_id: string;
  script: string;
  voiceover_url: string;
  style: string;
  duration: number;
  aspect_ratio: string;
  caption_style?: CaptionStyle;
  custom_background_video?: string;
  status: string;
  topic?: string;
  actual_audio_duration?: number;
  background_media_type?: string;
  background_mode?: 'stock' | 'ai_generated';
}

interface CaptionStyle {
  position?: string;
  horizontalAlignment?: string;
  verticalAlignment?: string;
  backgroundPadding?: number;
  backgroundColor?: string;
  backgroundBorderRadius?: number;
  backgroundOpacity?: number;
  lineHeight?: number;
  fontFamily?: string;
  fontSize?: number;
  textColor?: string;
  fontUrl?: string;
  offsetY?: number;
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

// Inlined helper: log API call
async function logApiCall(
  supabase: SupabaseClient,
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
  } catch {
    // Failed to log API call - silent failure to prevent breaking main flow
  }
}

Deno.serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  // Apply rate limiting (strict tier: 10 req/min)
  const rateLimitResponse = await applyRateLimit(req, 'strict', 'approve-voiceover');
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('approve-voiceover', requestId);
  let job_id: string | undefined;
  
  try {
    logger.info("Approve voiceover request received");
    const body = await req.json();
    job_id = body.job_id;

    if (!job_id) {
      logger.error("Missing job_id in request");
      throw new Error('job_id is required');
    }

    logger.info("Processing job", { metadata: { jobId: job_id } });

    // Get auth user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      logger.error("Missing Authorization header");
      throw new Error('Missing Authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      logger.error("Authentication failed", authError || undefined);
      throw new Error('Unauthorized');
    }

    logger.info("User authenticated", { userId: user.id });

    // Get job and verify ownership
    const { data: job, error: jobError} = await supabaseClient
      .from('video_jobs')
      .select('user_id, script, voiceover_url, style, duration, aspect_ratio, caption_style, custom_background_video, status, topic, actual_audio_duration, background_media_type, notify_on_completion, background_mode')
      .eq('id', job_id)
      .single();

    if (jobError || !job) {
      logger.error("Job not found", jobError, { metadata: { jobId: job_id } });
      throw new Error('Job not found');
    }

    if (job.user_id !== user.id) {
      logger.error("Unauthorized access attempt", undefined, { 
        userId: user.id,
        metadata: { jobUserId: job.user_id, jobId: job_id }
      });
      throw new Error('Unauthorized: not your job');
    }

    // Allow retry if job is stuck in assembling/fetching_video (e.g., previous timeout)
    const allowedStatuses = ['awaiting_voice_approval', 'assembling', 'fetching_video', GENERATION_STATUS.FAILED];
    if (!allowedStatuses.includes(job.status)) {
      logger.error("Invalid job status for approval", undefined, { 
        metadata: { jobId: job_id, status: job.status }
      });
      throw new Error(`Job cannot be approved from status: ${job.status}`);
    }

    if (job.status === GENERATION_STATUS.FAILED) {
      logger.info("Resetting failed job for retry", { metadata: { jobId: job_id } });
      await updateJobStatus(supabaseClient, job_id, 'awaiting_voice_approval', logger);
    }

    logger.info("Starting video assembly", { userId: user.id, metadata: { jobId: job_id } });

    // Use actual audio duration if available, otherwise fall back to requested duration
    const videoDuration = job.actual_audio_duration || job.duration;
    logger.info("Video duration calculated", {
      metadata: {
        videoDuration,
        actualAudioDuration: job.actual_audio_duration,
        requestedDuration: job.duration
      }
    });

    // Check if using AI-generated backgrounds
    const backgroundMode = (job as any).background_mode || 'stock';
    logger.info("Background mode", { metadata: { backgroundMode } });

    if (backgroundMode === 'ai_generated') {
      // AI-Generated path: Delegate to separate edge function to avoid memory limits
      logger.info("Delegating to assemble-ai-video for AI backgrounds", { 
        metadata: { jobId: job_id } 
      });
      
      // Invoke the separate edge function for AI video assembly
      const { error: invokeError } = await supabaseClient.functions.invoke('assemble-ai-video', {
        body: {
          job_id,
          user_id: user.id,
          script: job.script,
          voiceover_url: job.voiceover_url,
          topic: job.topic || 'general content',
          duration: videoDuration,
          aspect_ratio: job.aspect_ratio || '4:5',
          caption_style: job.caption_style,
          notify_on_completion: (job as any).notify_on_completion
        }
      });

      if (invokeError) {
        logger.error("Failed to invoke assemble-ai-video", invokeError as Error);
        throw new Error(`AI video assembly failed: ${invokeError.message}`);
      }

      return new Response(
        JSON.stringify({ success: true, job_id, delegated: true }),
        { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Stock path: Fetch background videos/images from Pixabay
    let backgroundMediaType: 'video' | 'image' | 'hybrid' = (job.background_media_type || 'video') as 'video' | 'image' | 'hybrid';
    logger.info("Initial background media type", { metadata: { backgroundMediaType } });

    // Step 3: Fetch multiple background videos or images
    await updateJobStatus(supabaseClient, job_id, 'fetching_video', logger);
    
    let backgroundVideoUrls: BackgroundVideo[] = [];
    let backgroundImageUrls: string[] = [];
    
    // Calculate how many clips we need (3-5 second clips, average 4s)
    const averageClipDuration = 4;
    const numberOfClipsNeeded = Math.min(30, Math.ceil(videoDuration / averageClipDuration));
    
    if (backgroundMediaType === 'image') {
      // For images: Use custom background or fetch from Pixabay
      backgroundImageUrls = await getBackgroundImages(
        supabaseClient,
        job.style,
        job_id,
        user.id,
        job.aspect_ratio || '4:5',
        job.custom_background_video,
        job.topic,
        logger
      );
      logger.info("Background images fetched", { 
        metadata: { imageCount: backgroundImageUrls.length, jobId: job_id }
      });
    } else {
      // For videos: Try to fetch, use hybrid if insufficient variety
      try {
        backgroundVideoUrls = await getBackgroundVideos(
          supabaseClient,
          job.style,
          videoDuration,
          job_id,
          user.id,
          job.aspect_ratio || '4:5',
          job.custom_background_video,
          job.topic,
          logger
        );
      } catch (videoError) {
        logger.warn("Video fetch failed, will try images", { 
          metadata: { error: (videoError as Error).message } 
        });
        backgroundVideoUrls = [];
      }
      
      // Get unique video count (dedupe by URL)
      const uniqueVideoUrls = [...new Map(backgroundVideoUrls.map(v => [v.url, v])).values()];
      
      // If videos cover all clips without repeats, use videos only
      if (uniqueVideoUrls.length >= numberOfClipsNeeded) {
        backgroundMediaType = 'video';
        // Use only unique videos, no repeats
        backgroundVideoUrls = uniqueVideoUrls.slice(0, numberOfClipsNeeded);
        logger.info("Sufficient video variety, using videos only", {
          metadata: { uniqueCount: uniqueVideoUrls.length, clipsNeeded: numberOfClipsNeeded }
        });
      }
      // If we have some videos but not enough for all clips, use hybrid
      else if (uniqueVideoUrls.length >= 3) {
        const imagesNeeded = numberOfClipsNeeded - uniqueVideoUrls.length;
        logger.info("Insufficient video variety, fetching images for hybrid", {
          metadata: { uniqueVideos: uniqueVideoUrls.length, imagesNeeded, clipsNeeded: numberOfClipsNeeded }
        });
        
        try {
          backgroundImageUrls = await getBackgroundImages(
            supabaseClient,
            job.style,
            job_id,
            user.id,
            job.aspect_ratio || '4:5',
            undefined, // Don't use custom for supplementary images
            job.topic,
            logger
          );
          backgroundMediaType = 'hybrid';
          backgroundVideoUrls = uniqueVideoUrls; // Use only unique videos with duration
          logger.info("Hybrid mode: videos + images", { 
            metadata: { 
              videoCount: uniqueVideoUrls.length, 
              imageCount: backgroundImageUrls.length,
              totalAvailable: uniqueVideoUrls.length + backgroundImageUrls.length
            } 
          });
        } catch (imageError) {
          // If images fail, just use videos with minimal repeats
          logger.warn("Image fetch failed for hybrid, using videos with repeats", {
            metadata: { error: (imageError as Error).message }
          });
          backgroundMediaType = 'video';
        }
      }
      // If no videos or too few (<3), fall back to images only
      else {
        logger.warn("Insufficient video variety, falling back to images", {
          metadata: { videoCount: uniqueVideoUrls.length }
        });
        
        try {
          backgroundImageUrls = await getBackgroundImages(
            supabaseClient,
            job.style,
            job_id,
            user.id,
            job.aspect_ratio || '4:5',
            job.custom_background_video,
            job.topic,
            logger
          );
          backgroundMediaType = 'image';
          logger.info("Image fallback successful", { 
            metadata: { imageCount: backgroundImageUrls.length, newMediaType: 'image' } 
          });
        } catch (imageError) {
          throw new Error(`No background media available: videos=${uniqueVideoUrls.length}, images failed: ${(imageError as Error).message}`);
        }
      }
    }
    
    await supabaseClient.from('video_jobs').update({ 
      background_video_url: backgroundVideoUrls[0]?.url || backgroundImageUrls[0] // Store first URL for reference
    }).eq('id', job_id);
    logger.info("Background media fetched", { metadata: { jobId: job_id } });

    // Step 4: Assemble video
    await updateJobStatus(supabaseClient, job_id, 'assembling', logger);
    
    // Use voiceover URL directly from database (already stored as full public URL)
    const voiceoverPublicUrl = job.voiceover_url;
    logger.info("Using voiceover URL from database", { metadata: { voiceoverPublicUrl } });
    
    // Validate voiceover URL is accessible
    logger.debug("Validating voiceover URL accessibility");
    try {
      const headResponse = await fetch(voiceoverPublicUrl, { method: 'HEAD' });
      if (!headResponse.ok) {
        logger.error("Voiceover URL not accessible", undefined, {
          metadata: {
            url: voiceoverPublicUrl,
            status: headResponse.status
          }
        });
        throw new Error(`Voiceover not accessible: ${headResponse.status}`);
      }
      logger.info("Voiceover URL validated successfully");
    } catch (validateError) {
      logger.error("Voiceover validation failed", validateError as Error);
      throw new Error('Failed to access voiceover file');
    }
    
    const renderId = await assembleVideo(
      supabaseClient,
      {
        script: job.script,
        voiceoverUrl: voiceoverPublicUrl,
        backgroundVideoUrls,
        backgroundImageUrls,
        duration: videoDuration, // Use actual audio duration
      },
      job_id,
      user.id,
      job.aspect_ratio || '4:5',
      job.caption_style,
      backgroundMediaType,
      logger
    );
    await supabaseClient.from('video_jobs').update({ shotstack_render_id: renderId }).eq('id', job_id);
    logger.info("Submitted to Shotstack", { metadata: { renderId, jobId: job_id } });

    // Step 5: Poll for completion
    await pollRenderStatus(supabaseClient, job_id, renderId, user.id, logger);

    return new Response(
      JSON.stringify({ success: true, job_id }),
      { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logger.error("Error in approve-voiceover", error instanceof Error ? error : new Error(String(error)), { metadata: { jobId: job_id } });
    
    // Revert job to awaiting_voice_approval so user can retry
    if (job_id) {
      try {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        
        await supabaseClient
          .from('video_jobs')
          .update({
            status: 'awaiting_voice_approval',
            error_details: {
              message: error instanceof Error ? error.message : 'Video rendering failed',
              timestamp: new Date().toISOString(),
              step: 'approve_voiceover',
              error_type: error instanceof Error ? error.name : 'UnknownError'
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', job_id);
      } catch (updateError) {
        logger.error("Failed to update job status", updateError as Error, { metadata: { jobId: job_id } });
      }
    }
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      {
        status: 500,
        headers: { ...responseHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Helper functions
async function updateJobStatus(supabase: SupabaseClient, jobId: string, status: string, logger?: EdgeLogger) {
  await supabase.from('video_jobs').update({ status }).eq('id', jobId);
  logger?.debug("Job status updated", { metadata: { jobId, status } });
}

// Fisher-Yates shuffle for proper randomization
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
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

// Fetch background images from Pixabay for automatic background
async function getBackgroundImages(
  supabase: SupabaseClient,
  style: string,
  videoJobId: string,
  userId: string,
  aspectRatio: string = '4:5',
  customImageUrl?: string,
  topic?: string,
  logger?: EdgeLogger
): Promise<string[]> {
  // If user selected custom image, return it as single-item array
  if (customImageUrl) {
    logger?.info("Using custom background image", { metadata: { customImageUrl } });
    return [customImageUrl];
  }

  // Use topic for search if available, otherwise fall back to style
  let searchQuery: string;
  if (topic && topic.trim()) {
    searchQuery = extractSearchTerms(topic);
    logger?.info("Using topic-based image search", { metadata: { searchQuery, topic } });
  } else {
    const queries: Record<string, string> = {
      modern: 'abstract modern design',
      tech: 'technology digital background',
      educational: 'education learning',
      dramatic: 'dramatic cinematic'
    };
    searchQuery = queries[style] || 'abstract background';
    logger?.info("Using style-based image search", { metadata: { searchQuery, style } });
  }

  // Determine orientation based on aspect ratio
  const orientationMap: Record<string, string> = {
    '16:9': 'horizontal',
    '9:16': 'vertical',
    '4:5': 'vertical',
    '1:1': 'all'
  };
  const orientation = orientationMap[aspectRatio] || 'vertical';

  const pixabayApiKey = Deno.env.get('PIXABAY_API_KEY');
  if (!pixabayApiKey) {
    throw new Error('Pixabay API key not configured');
  }

  // Request 30 images from Pixabay for variety with 3-5s clips
  const endpoint = `${API_ENDPOINTS.PIXABAY.apiUrl}/?key=${pixabayApiKey}&q=${encodeURIComponent(searchQuery)}&image_type=photo&orientation=${orientation}&per_page=30`;
  const requestSentAt = new Date();

  const response = await fetch(endpoint);
  const data: PixabayImageResponse | null = response.ok ? await response.json() : null;

  // Log the API call
  logApiCall(
    supabase,
    {
      videoJobId,
      userId,
      serviceName: 'pixabay',
      endpoint: endpoint.replace(pixabayApiKey, '[REDACTED]'),
      httpMethod: 'GET',
      stepName: 'fetch_background_images',
      requestPayload: { query: searchQuery, per_page: 6, orientation },
      additionalMetadata: { style, topic: topic || 'none' }
    },
    requestSentAt,
    {
      statusCode: response.status,
      payload: data,
      isError: !response.ok,
      errorMessage: response.ok ? undefined : `Pixabay returned ${response.status}`
    }
  ).catch(e => logger?.error('Failed to log API call', e as Error));

  if (!response.ok) {
    throw new Error('Pixabay API error');
  }

  if (!data || !data.hits?.length) {
    throw new Error('No background images found');
  }

  // CRITICAL: Use only largeImageURL or webformatURL for automatic backgrounds (Pixabay policy)
  // Premium URLs (fullHDURL, imageURL, vectorURL) are only for user-selected content
  const imageUrls = data.hits
    .map((hit: PixabayImage) => hit.largeImageURL || hit.webformatURL)
    .filter((url): url is string => Boolean(url));

  logger?.debug(`Selected background images from Pixabay`, { 
    metadata: { count: imageUrls.length, usedPermittedUrls: true } 
  });
  return imageUrls;
}

/**
 * Memory-optimized video fetching using streaming-first approach
 * 
 * Key optimizations:
 * 1. Fetch one query at a time, process immediately, release response
 * 2. Store only minimal metadata (url, duration, isPortrait)
 * 3. Stop early once TARGET_UNIQUE_VIDEOS reached
 * 4. Use timeouts to prevent hanging requests
 * 5. Explicit garbage collection hints
 */
async function getBackgroundVideos(
  supabase: SupabaseClient,
  style: string,
  duration: number,
  videoJobId: string,
  userId: string,
  aspectRatio: string = '4:5',
  customVideoUrl?: string,
  topic?: string,
  logger?: EdgeLogger
): Promise<BackgroundVideo[]> {
  // If user selected custom video, return it as single-item array
  if (customVideoUrl) {
    logger?.info("Using custom background video", { metadata: { customVideoUrl } });
    return [{ url: customVideoUrl, duration: 60 }]; // Assume 60s for custom
  }

  const pixabayApiKey = Deno.env.get('PIXABAY_API_KEY');
  if (!pixabayApiKey) {
    throw new Error('Pixabay API key not configured');
  }

  // Determine target orientation for filtering
  const orientationMap: Record<string, string> = {
    '16:9': 'landscape',
    '9:16': 'portrait',
    '4:5': 'portrait',
    '1:1': 'square'
  };
  const targetOrientation = orientationMap[aspectRatio] || 'portrait';
  const isPortraitTarget = targetOrientation === 'portrait';

  // Build search queries - primary based on topic, then fallbacks
  const searchQueries: string[] = [];
  
  if (topic && topic.trim()) {
    // Primary: topic-based search
    searchQueries.push(extractSearchTerms(topic));
    logger?.info("Using topic-based search", { metadata: { searchQuery: searchQueries[0], topic } });
  } else {
    // Primary: style-based search
    const styleQueries: Record<string, string> = {
      modern: 'technology abstract motion',
      tech: 'digital technology futuristic',
      educational: 'books learning study',
      dramatic: 'cinematic nature dramatic'
    };
    searchQueries.push(styleQueries[style] || 'abstract motion background');
    logger?.info("Using style-based search", { metadata: { searchQuery: searchQueries[0], style } });
  }

  // Add loop-focused fallback search queries for more variety
  const loopFallbackQueries = [
    'tunnel loop',
    'abstract loop',
    'underground loops',
    'rave loops',
    '90s loops',
    'glitter loop',
    'music loops',
    'disco loop',
    'fire loop',
    'money loop',
    'abstract neon light loops',
    'falling music note loops',
    'neon loop',
    'particles loop',
  ];
  searchQueries.push(...loopFallbackQueries);

  // Streaming-first fetch: process each query immediately, store minimal data
  const selectedVideos: VideoMetadata[] = [];
  const seenIds = new Set<number>();
  let queriesExecuted = 0;

  for (const searchQuery of searchQueries) {
    // Stop if we have enough videos or hit query limit
    if (selectedVideos.length >= TARGET_UNIQUE_VIDEOS || queriesExecuted >= MAX_QUERIES) {
      break;
    }

    const endpoint = `${API_ENDPOINTS.PIXABAY.apiUrl}/videos/?key=${pixabayApiKey}&q=${encodeURIComponent(searchQuery)}&per_page=${PER_PAGE}`;
    const requestSentAt = new Date();

    try {
      // Use timeout wrapper to prevent hanging requests
      const response = await fetchWithTimeout(endpoint, {}, FETCH_TIMEOUT_MS);
      
      if (!response.ok) {
        logger?.warn("Pixabay API returned error", { 
          metadata: { query: searchQuery, status: response.status }
        });
        continue;
      }
      
      // Parse response and immediately extract minimal data
      const data = await response.json() as PixabayVideoResponse;
      const hits = data?.hits || [];
      
      // Log only for first query to avoid log spam
      if (queriesExecuted === 0) {
        logApiCall(
          supabase,
          {
            videoJobId,
            userId,
            serviceName: 'pixabay',
            endpoint: endpoint.replace(pixabayApiKey, 'REDACTED'),
            httpMethod: 'GET',
            stepName: 'fetch_background_videos',
            requestPayload: { query: searchQuery, per_page: PER_PAGE },
            additionalMetadata: { style, duration, topic: topic || 'none', targetOrientation }
          },
          requestSentAt,
          {
            statusCode: response.status,
            payload: { totalHits: hits.length },
            isError: false
          }
        ).catch(e => logger?.error('Failed to log API call', e as Error));
      }

      // Stream-friendly: process hits immediately, extract only needed data
      for (const video of hits) {
        // Early break if we have enough
        if (selectedVideos.length >= TARGET_UNIQUE_VIDEOS) break;
        
        // Skip if no ID, already seen, or too short
        if (!video.id || seenIds.has(video.id)) continue;
        if (!video.duration || video.duration < 3) continue;
        
        // Extract video URL - prefer large, fall back to medium/small
        const videoData = video.videos;
        const selectedVideo = videoData?.large || videoData?.medium || videoData?.small;
        if (!selectedVideo?.url) continue;
        
        // Compute orientation once, store as boolean (saves memory vs width/height)
        const width = selectedVideo.width || 1920;
        const height = selectedVideo.height || 1080;
        const isPortrait = height > width;
        
        seenIds.add(video.id);
        selectedVideos.push({
          id: video.id,
          url: selectedVideo.url,
          duration: video.duration,
          isPortrait
        });
      }
      
      // Explicit cleanup hint for GC
      // deno-lint-ignore no-explicit-any
      (data as any).hits = null;
      
      logger?.debug("Fetched videos from query", { 
        metadata: { 
          query: searchQuery, 
          newVideos: hits.length, 
          totalUnique: selectedVideos.length,
          queryNumber: queriesExecuted + 1
        }
      });
      
    } catch (e) {
      logger?.warn("Failed to fetch from query, continuing", { 
        metadata: { 
          query: searchQuery, 
          error: (e as Error).message,
          queryNumber: queriesExecuted + 1
        }
      });
    }
    
    queriesExecuted++;
  }

  // Clear the seen IDs set to free memory
  seenIds.clear();

  if (selectedVideos.length === 0) {
    throw new Error('No background videos found');
  }

  // Log warning if low variety
  if (selectedVideos.length < 10) {
    logger?.warn("Low video variety - may cause repeats", {
      metadata: { uniqueCount: selectedVideos.length, topic: topic || 'none', style }
    });
  }

  // Tiered filtering to ensure video variety (at least 5 unique videos)
  let videosToUse: VideoMetadata[] = [];
  
  // Tier 1: Strict - matching orientation + 10s minimum duration
  const orientationFiltered = selectedVideos.filter(v => isPortraitTarget ? v.isPortrait : !v.isPortrait);
  const tier1 = orientationFiltered.filter(v => v.duration >= 10);
  
  if (tier1.length >= 5) {
    videosToUse = tier1;
    logger?.debug("Using Tier 1: orientation + 10s duration", { metadata: { count: tier1.length } });
  } else {
    // Tier 2: Relax duration - matching orientation + 5s minimum
    const tier2 = orientationFiltered.filter(v => v.duration >= 5);
    
    if (tier2.length >= 5) {
      videosToUse = tier2;
      logger?.debug("Using Tier 2: orientation + 5s duration", { metadata: { count: tier2.length } });
    } else {
      // Tier 3: Relax orientation - any orientation + 10s minimum
      const tier3 = selectedVideos.filter(v => v.duration >= 10);
      
      if (tier3.length >= 5) {
        videosToUse = tier3;
        logger?.warn("Using Tier 3: any orientation + 10s (portrait videos scarce)", { 
          metadata: { count: tier3.length } 
        });
      } else {
        // Tier 4: Relax duration further - any orientation + 3s minimum
        const tier4 = selectedVideos.filter(v => v.duration >= 3);
        
        if (tier4.length >= 3) {
          videosToUse = tier4;
          logger?.warn("Using Tier 4: any orientation + 3s duration", { 
            metadata: { count: tier4.length } 
          });
        } else {
          // Tier 5: No restrictions - use all available
          videosToUse = selectedVideos;
          logger?.warn("Using Tier 5: no filtering (video pool very limited)", { 
            metadata: { count: selectedVideos.length } 
          });
        }
      }
    }
  }
  
  // If still insufficient, return empty to trigger image fallback
  if (videosToUse.length < 3) {
    logger?.warn("Insufficient video variety, will trigger image fallback", {
      metadata: { uniqueCount: videosToUse.length, topic: topic || 'none', style }
    });
    return [];
  }
  
  // Calculate how many clips we need based on actual video durations
  const averageClipDuration = 8;
  const numberOfClips = Math.min(20, Math.ceil(duration / averageClipDuration));

  logger?.info("Selecting background videos for duration", {
    metadata: { 
      numberOfClips, 
      duration, 
      availableVideos: videosToUse.length,
      queriesExecuted
    }
  });

  // Shuffle videos using Fisher-Yates algorithm
  const shuffledVideos = shuffleArray(videosToUse);
  
  // Convert to BackgroundVideo format (only url and duration)
  const result: BackgroundVideo[] = shuffledVideos
    .slice(0, numberOfClips)
    .map(v => ({ url: v.url, duration: v.duration }));

  logger?.info("Background videos selected", {
    metadata: { 
      videoCount: result.length, 
      targetClips: numberOfClips,
      uniquePoolSize: videosToUse.length,
      memoryOptimized: true
    }
  });
  
  return result;
}

async function assembleVideo(
  supabase: SupabaseClient,
  assets: {
    script: string;
    voiceoverUrl: string;
    backgroundVideoUrls: BackgroundVideo[];
    backgroundImageUrls?: string[];
    duration: number;
  },
  videoJobId: string,
  userId: string,
  aspectRatio: string = '4:5',
  captionStyle?: CaptionStyle,
  backgroundMediaType: 'video' | 'image' | 'hybrid' = 'video',
  logger?: EdgeLogger
): Promise<string> {
  // Default caption style matching official Shotstack format
  const defaultStyle = {
    position: 'center',
    animation: 'zoom',
    fontSize: 48, // NUMBER not string!
    fontWeight: 'black',
    fontFamily: 'Montserrat ExtraBold',
    textColor: '#FFFFFF',
    backgroundColor: 'rgba(0,0,0,0.8)',
    strokeColor: '#000000',
    strokeWidth: 3
  };
  
  const style = captionStyle || defaultStyle;
  
  // Get dimensions from aspect ratio
  const dimensions: Record<string, { width: number; height: number }> = {
    '16:9': { width: 1920, height: 1080 },
    '9:16': { width: 1080, height: 1920 },
    '4:5': { width: 1080, height: 1350 },
    '1:1': { width: 1080, height: 1080 }
  };
  const config = dimensions[aspectRatio] || dimensions['4:5'];

  logger?.info("Assembling video with Shotstack", {
    metadata: {
      width: config.width,
      height: config.height,
      aspectRatio
    }
  });

  interface ShotstackEdit {
    timeline: {
      background: string;
      tracks: unknown[];
      fonts?: Array<{ src: string }>;
    };
    output: {
      format: string;
      fps: number;
      size: { width: number; height: number };
    };
  }

  // Build Shotstack JSON using official format
  const edit: ShotstackEdit = {
    timeline: {
      background: '#000000',
      tracks: []
    },
    output: {
      format: 'mp4',
      fps: 30,
      size: {
        width: config.width,
        height: config.height
      }
    }
  };

  // Add fonts array if custom font URL provided
  const styleTyped = style as CaptionStyle | undefined;
  if (styleTyped?.fontUrl) {
    edit.timeline.fonts = [{
      src: styleTyped.fontUrl
    }];
    logger?.info("Added custom font", { metadata: { fontUrl: styleTyped.fontUrl } });
  }

  // Track 0: Audio with alias (for caption sync)
  edit.timeline.tracks.push({
    clips: [{
      asset: {
        type: 'audio',
        src: assets.voiceoverUrl
      },
      start: 0,
      length: 'auto',
      alias: 'VOICEOVER'
    }]
  });

  // Track 1: Rich caption with custom styling
  const styleAny = style as any; // Safe cast for mixed property access
  const captionClip: Record<string, unknown> = {
    start: 0,
    length: 'auto',
    position: styleTyped?.position || styleAny?.position || 'bottom',
    asset: {
      type: 'caption',
      trim: 0,
      src: 'alias://VOICEOVER',
      alignment: {
        horizontal: styleTyped?.horizontalAlignment || 'center',
        vertical: styleTyped?.verticalAlignment || 'center'
      },
      background: {
        padding: styleTyped?.backgroundPadding ?? 15,
        color: styleAny?.backgroundColor || '#FF9947',
        borderRadius: styleTyped?.backgroundBorderRadius ?? 8,
        opacity: styleTyped?.backgroundOpacity ?? 0.95
      },
      font: {
        lineHeight: styleTyped?.lineHeight ?? 1.3,
        family: styleAny?.fontFamily || 'Space Grotesk Bold',
        size: styleAny?.fontSize || 55,
        color: styleAny?.textColor || '#000000'
      }
    },
    offset: {
      y: styleTyped?.offsetY ?? 0.15
    }
  };

  edit.timeline.tracks.push({
    clips: [captionClip]
  });

  logger?.info("Using rich caption styling with custom font and alignment");

  // Track 2: Background media (bottom layer)
  // Use 3-5 second clips for dynamic background changes
  const getRandomClipDuration = () => 3 + Math.random() * 2; // 3-5 seconds
  
  // Available Shotstack transitions for variety
  const TRANSITIONS_IN = [
    'fade', 'fadeFast', 'fadeSlow', 'reveal',
    'wipeLeft', 'wipeRight', 'slideLeft', 'slideRight', 'slideUp', 'slideDown',
    'carouselLeft', 'carouselRight', 'carouselUp', 'carouselDown',
    'shuffleTopRight', 'shuffleRightTop', 'shuffleRightBottom', 'shuffleBottomRight',
    'shuffleBottomLeft', 'shuffleLeftBottom', 'shuffleLeftTop', 'shuffleTopLeft', 'zoom'
  ];
  const TRANSITIONS_OUT = [
    'fade', 'fadeFast', 'fadeSlow', 'reveal',
    'wipeLeft', 'wipeRight', 'slideLeft', 'slideRight', 'slideUp', 'slideDown',
    'carouselLeft', 'carouselRight', 'carouselUp', 'carouselDown',
    'shuffleTopRight', 'shuffleRightTop', 'shuffleRightBottom', 'shuffleBottomRight',
    'shuffleBottomLeft', 'shuffleLeftBottom', 'shuffleLeftTop', 'shuffleTopLeft', 'zoom'
  ];
  
  const getRandomTransition = () => ({
    in: TRANSITIONS_IN[Math.floor(Math.random() * TRANSITIONS_IN.length)],
    out: TRANSITIONS_OUT[Math.floor(Math.random() * TRANSITIONS_OUT.length)]
  });
  
  // Transition duration for clip overlap - prevents black frames between clips
  const TRANSITION_DURATION = 0.5;
  
  // Minimum clip duration - clips shorter than this are not useful
  const MIN_CLIP_DURATION = 1.0;
  
  if (backgroundMediaType === 'image' && assets.backgroundImageUrls && assets.backgroundImageUrls.length > 0) {
    // Image-only mode: use shuffled unique images with safety limit
    const shuffledImages = shuffleArray([...new Set(assets.backgroundImageUrls)]);
    const imageClips: Array<Record<string, unknown>> = [];
    let currentTime = 0;
    let imageIndex = 0;
    
    while (currentTime < assets.duration) {
      // SAFETY: Prevent infinite loops
      if (imageClips.length >= MAX_CLIPS_SAFETY) {
        logger?.warn("Image clip safety limit reached", { 
          metadata: { clipCount: imageClips.length, currentTime, duration: assets.duration }
        });
        break;
      }
      
      const remainingTime = assets.duration - currentTime;
      
      // Early exit if we've reached or passed the end
      if (remainingTime <= 0) break;
      
      // Stop if remaining time is too short for a meaningful clip
      if (remainingTime < MIN_CLIP_DURATION) {
        // Extend the last clip to cover remaining time instead of adding a tiny clip
        if (imageClips.length > 0) {
          const lastClip = imageClips[imageClips.length - 1] as { length: number };
          lastClip.length += remainingTime;
          logger?.debug("Extended last image clip to cover remaining time", {
            metadata: { remainingTime, newLength: lastClip.length }
          });
        }
        break;
      }
      
      // Ensure clip duration is at least MIN_CLIP_DURATION
      const clipDuration = Math.max(MIN_CLIP_DURATION, Math.min(getRandomClipDuration(), remainingTime));
      const imageUrl = shuffledImages[imageIndex % shuffledImages.length];
      const isFirstClip = imageClips.length === 0;
      
      imageClips.push({
        asset: {
          type: 'image',
          src: imageUrl
        },
        start: currentTime,
        length: clipDuration,
        fit: 'cover',
        scale: 1.05,
        ...(!isFirstClip && { transition: getRandomTransition() })
      });
      
      // Overlap clips by transition duration to prevent black frames
      // First clip: full advancement; subsequent clips: subtract transition for overlap
      const transitionOverlap = isFirstClip ? 0 : TRANSITION_DURATION;
      const advancement = clipDuration - transitionOverlap;
      
      // CRITICAL: Always advance by at least a meaningful amount to prevent infinite loops
      currentTime += Math.max(advancement, MIN_CLIP_DURATION / 2);
      imageIndex++;
    }
    
    edit.timeline.tracks.push({ clips: imageClips });
    logger?.info("Added background image clips", { 
      metadata: { clipCount: imageClips.length, uniqueImages: shuffledImages.length, safetyLimitApplied: imageClips.length >= MAX_CLIPS_SAFETY }
    });
  } else if (backgroundMediaType === 'hybrid' && assets.backgroundVideoUrls.length > 0 && assets.backgroundImageUrls && assets.backgroundImageUrls.length > 0) {
    // Hybrid mode: use unique videos first, then unique images (no repeats)
    const uniqueVideos = shuffleArray([...new Map(assets.backgroundVideoUrls.map(v => [v.url, v])).values()]);
    const uniqueImages = shuffleArray([...new Set(assets.backgroundImageUrls)]);
    
    // Maximum clip duration cap for variety
    const MAX_CLIP_DURATION = 15;
    
    // Combine: all unique videos first, then fill with images
    const combinedMedia: Array<{ type: 'video' | 'image'; url: string; duration?: number }> = [];
    
    // Add all unique videos with their duration
    for (const video of uniqueVideos) {
      combinedMedia.push({ type: 'video', url: video.url, duration: video.duration });
    }
    // Add unique images to fill remaining
    for (const url of uniqueImages) {
      combinedMedia.push({ type: 'image', url });
    }
    
    const mediaClips: Array<Record<string, unknown>> = [];
    let currentTime = 0;
    let mediaIndex = 0;
    
    while (currentTime < assets.duration) {
      // SAFETY: Prevent infinite loops
      if (mediaClips.length >= MAX_CLIPS_SAFETY) {
        logger?.warn("Hybrid clip safety limit reached", { 
          metadata: { clipCount: mediaClips.length, currentTime, duration: assets.duration }
        });
        break;
      }
      
      const media = combinedMedia[mediaIndex % combinedMedia.length];
      const remainingTime = assets.duration - currentTime;
      const isFirstClip = mediaClips.length === 0;
      
      // Early exit if we've reached or passed the end
      if (remainingTime <= 0) break;
      
      // Stop if remaining time is too short for a meaningful clip
      if (remainingTime < MIN_CLIP_DURATION) {
        // Extend the last clip to cover remaining time instead of adding a tiny clip
        if (mediaClips.length > 0) {
          const lastClip = mediaClips[mediaClips.length - 1] as { length: number };
          lastClip.length += remainingTime;
          logger?.debug("Extended last hybrid clip to cover remaining time", {
            metadata: { remainingTime, newLength: lastClip.length }
          });
        }
        break;
      }
      
      // Use actual video duration (capped at 15s), or random for images
      // Ensure clip duration is at least MIN_CLIP_DURATION
      let clipDuration: number;
      if (media.type === 'video' && media.duration) {
        clipDuration = Math.max(MIN_CLIP_DURATION, Math.min(media.duration, MAX_CLIP_DURATION, remainingTime));
      } else {
        clipDuration = Math.max(MIN_CLIP_DURATION, Math.min(getRandomClipDuration(), remainingTime));
      }
      
      if (media.type === 'video') {
        mediaClips.push({
          asset: {
            type: 'video',
            src: media.url,
            volume: 0
          },
          start: currentTime,
          length: clipDuration,
          fit: 'cover',
          scale: 1.05,
          ...(!isFirstClip && { transition: getRandomTransition() })
        });
      } else {
        mediaClips.push({
          asset: {
            type: 'image',
            src: media.url
          },
          start: currentTime,
          length: clipDuration,
          fit: 'cover',
          scale: 1.05,
          ...(!isFirstClip && { transition: getRandomTransition() })
        });
      }
      
      // Overlap clips by transition duration to prevent black frames
      // First clip: full advancement; subsequent clips: subtract transition for overlap
      const transitionOverlap = isFirstClip ? 0 : TRANSITION_DURATION;
      const advancement = clipDuration - transitionOverlap;
      
      // CRITICAL: Always advance by at least a meaningful amount to prevent infinite loops
      currentTime += Math.max(advancement, MIN_CLIP_DURATION / 2);
      mediaIndex++;
    }
    
    edit.timeline.tracks.push({ clips: mediaClips });
    logger?.info("Added hybrid background clips with safety limits", { 
      metadata: { 
        clipCount: mediaClips.length, 
        uniqueVideos: uniqueVideos.length, 
        uniqueImages: uniqueImages.length,
        maxClipDuration: MAX_CLIP_DURATION,
        safetyLimitApplied: mediaClips.length >= MAX_CLIPS_SAFETY
      } 
    });
  } else {
    // Video-only mode: use shuffled unique videos with actual duration metadata
    const shuffledVideos = shuffleArray([...new Map(assets.backgroundVideoUrls.map(v => [v.url, v])).values()]);
    const videoClips: Array<Record<string, unknown>> = [];
    let currentTime = 0;
    let videoIndex = 0;
    
    // Maximum clip duration cap for variety
    const MAX_CLIP_DURATION = 15;
    
    while (currentTime < assets.duration) {
      // SAFETY: Prevent infinite loops
      if (videoClips.length >= MAX_CLIPS_SAFETY) {
        logger?.warn("Video clip safety limit reached", { 
          metadata: { clipCount: videoClips.length, currentTime, duration: assets.duration }
        });
        break;
      }
      
      const video = shuffledVideos[videoIndex % shuffledVideos.length];
      const remainingTime = assets.duration - currentTime;
      const isFirstClip = videoClips.length === 0;
      
      // Early exit if we've reached or passed the end
      if (remainingTime <= 0) break;
      
      // Stop if remaining time is too short for a meaningful clip
      if (remainingTime < MIN_CLIP_DURATION) {
        // Extend the last clip to cover remaining time instead of adding a tiny clip
        if (videoClips.length > 0) {
          const lastClip = videoClips[videoClips.length - 1] as { length: number };
          lastClip.length += remainingTime;
          logger?.debug("Extended last video clip to cover remaining time", {
            metadata: { remainingTime, newLength: lastClip.length }
          });
        }
        break;
      }
      
      // Use actual video duration, capped at 15s for variety
      // Ensure clip duration is at least MIN_CLIP_DURATION
      const clipDuration = Math.max(
        MIN_CLIP_DURATION,
        Math.min(
          video.duration,      // Actual stock video duration
          MAX_CLIP_DURATION,   // 15 second cap for variety
          remainingTime        // Don't exceed remaining video length
        )
      );
      
      videoClips.push({
        asset: {
          type: 'video',
          src: video.url,
          volume: 0
        },
        start: currentTime,
        length: clipDuration,
        fit: 'cover',
        scale: 1.05,
        ...(!isFirstClip && { transition: getRandomTransition() })
      });
      
      // Overlap clips by transition duration to prevent black frames
      // First clip: full advancement; subsequent clips: subtract transition for overlap
      const transitionOverlap = isFirstClip ? 0 : TRANSITION_DURATION;
      const advancement = clipDuration - transitionOverlap;
      
      // CRITICAL: Always advance by at least a meaningful amount to prevent infinite loops
      currentTime += Math.max(advancement, MIN_CLIP_DURATION / 2);
      videoIndex++;
    }
    
    edit.timeline.tracks.push({ clips: videoClips });
    logger?.info("Added background video clips with safety limits", { 
      metadata: { 
        clipCount: videoClips.length, 
        uniqueVideos: shuffledVideos.length,
        maxClipDuration: MAX_CLIP_DURATION,
        avgVideoDuration: shuffledVideos.length > 0 
          ? (shuffledVideos.reduce((sum, v) => sum + v.duration, 0) / shuffledVideos.length).toFixed(1)
          : 0,
        safetyLimitApplied: videoClips.length >= MAX_CLIPS_SAFETY
      } 
    });
  }

  // Debug: Log track order before submission
  logger?.debug("Track order and caption asset", {
    metadata: {
      trackOrder: edit.timeline.tracks.map((t: any) => {
        const clips = (t.clips as Array<{ asset?: { type?: string } }>) || [];
        return clips[0]?.asset?.type;
      }),
      captionAsset: (edit.timeline.tracks[1] as Record<string, unknown>)
    }
  });

  // Submit to Shotstack API with timeout
  const endpoint = API_ENDPOINTS.SHOTSTACK.renderUrl;
  const requestSentAt = new Date();
  const SHOTSTACK_TIMEOUT_MS = 30000; // 30 second timeout for Shotstack

  const response = await fetchWithTimeout(
    endpoint, 
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('SHOTSTACK_API_KEY') ?? ''
      },
      body: JSON.stringify(edit)
    },
    SHOTSTACK_TIMEOUT_MS
  );

  const responseText = await response.text();
  let result = null;
  
  try {
    result = responseText ? JSON.parse(responseText) : null;
  } catch (parseError) {
    logger?.error("Failed to parse Shotstack response", parseError as Error);
  }

  // Log the API call
  logApiCall(
    supabase,
    {
      videoJobId,
      userId,
      serviceName: 'shotstack',
      endpoint,
      httpMethod: 'POST',
      stepName: 'assemble_video',
      requestPayload: edit,
      additionalMetadata: {
        duration: assets.duration,
        captionMethod: 'auto_alias',
        backgroundMediaType
      }
    },
    requestSentAt,
    {
      statusCode: response.status,
      payload: result,
      isError: !response.ok,
      errorMessage: response.ok ? undefined : result?.message || result?.detail || `Shotstack API error ${response.status}`
    }
  ).catch(e => logger?.error('Failed to log API call', e as Error));

  if (!response.ok) {
    logger?.error("Shotstack API Error", undefined, {
      metadata: {
        status: response.status,
        response: result,
        requestPayload: edit
      }
    });
    
    // Extract detailed error message
    let errorMessage = 'Shotstack API error';
    if (result?.response?.message) {
      errorMessage = result.response.message;
    } else if (result?.response?.errors && Array.isArray(result.response.errors)) {
      errorMessage = result.response.errors.map((e: { message?: string; code?: string }) => e.message || e.code).join(', ');
    } else if (result?.message) {
      errorMessage = result.message;
    }

    const isCaptionValidation = (errorMessage || '').toLowerCase().includes('caption asset');

    if (isCaptionValidation) {
      logger?.info("Retrying with minimal caption asset and auto length...");
      const fallbackEdit = JSON.parse(JSON.stringify(edit)) as ShotstackEdit;
      try {
        // Dynamically find caption track instead of using hardcoded index
        const captionTrackIndex = fallbackEdit.timeline.tracks.findIndex((t: unknown) => {
          const track = t as Record<string, unknown>;
          const clips = (track.clips as Array<{ asset?: { type?: string } }>) || [];
          return clips[0]?.asset?.type === 'caption' || clips[0]?.asset?.type === 'captions';
        });
      if (captionTrackIndex !== -1 && (fallbackEdit.timeline.tracks[captionTrackIndex] as any)?.clips?.[0]) {
        (fallbackEdit.timeline.tracks[captionTrackIndex] as any).clips[0].asset = { type: 'caption', src: 'alias://VOICEOVER' };
        (fallbackEdit.timeline.tracks[captionTrackIndex] as any).clips[0].length = 'auto';
      }
      } catch {
        // Ignore errors when trying to modify caption track
      }

      const retryRequestSentAt = new Date();
      const retryRes = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': Deno.env.get('SHOTSTACK_API_KEY') ?? ''
        },
        body: JSON.stringify(fallbackEdit)
      });
      const retryText = await retryRes.text();
      let retryResult = null;
      try { retryResult = retryText ? JSON.parse(retryText) : null; } catch {
        // Ignore JSON parse errors
      }

      logApiCall(
        supabase,
        {
          videoJobId,
          userId,
          serviceName: 'shotstack',
          endpoint,
          httpMethod: 'POST',
          stepName: 'assemble_video_retry_minimal_captions',
          requestPayload: fallbackEdit,
          additionalMetadata: { captionRetry: 'minimal' }
        },
        retryRequestSentAt,
        {
          statusCode: retryRes.status,
          payload: retryResult,
          isError: !retryRes.ok,
          errorMessage: retryRes.ok ? undefined : retryResult?.message || retryResult?.detail || `Shotstack API error ${retryRes.status}`
        }
      ).catch(e => logger?.error('Failed to log API call (retry minimal)', e as Error));

      if (!retryRes.ok) {
        logger?.error("Shotstack API Error (retry minimal captions)", undefined, {
          metadata: {
            status: retryRes.status,
            response: retryResult,
            requestPayload: fallbackEdit
          }
        });

        logger?.info("Retrying with asset type 'captions'...");
        const fallbackEdit2 = JSON.parse(JSON.stringify(fallbackEdit)) as ShotstackEdit;
        try {
          // Dynamically find caption track for second retry
          const captionTrackIndex2 = fallbackEdit2.timeline.tracks.findIndex((t: unknown) => {
            const track = t as Record<string, unknown>;
            const clips = (track.clips as Array<{ asset?: { type?: string } }>) || [];
            return clips[0]?.asset?.type === 'caption' || clips[0]?.asset?.type === 'captions';
          });
      if (captionTrackIndex2 !== -1 && (fallbackEdit2.timeline.tracks[captionTrackIndex2] as any)?.clips?.[0]) {
        (fallbackEdit2.timeline.tracks[captionTrackIndex2] as any).clips[0].asset = { type: 'captions', src: 'alias://VOICEOVER' };
      }
        } catch {
          // Ignore errors when trying to modify caption track
        }

        const retryRequestSentAt2 = new Date();
        const retryRes2 = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': Deno.env.get('SHOTSTACK_API_KEY') ?? ''
          },
          body: JSON.stringify(fallbackEdit2)
        });
        const retryText2 = await retryRes2.text();
        let retryResult2 = null;
        try { retryResult2 = retryText2 ? JSON.parse(retryText2) : null; } catch {
          // Ignore JSON parse errors
        }

        logApiCall(
          supabase,
          {
            videoJobId,
            userId,
            serviceName: 'shotstack',
            endpoint,
            httpMethod: 'POST',
            stepName: 'assemble_video_retry_captions_type',
            requestPayload: fallbackEdit2,
            additionalMetadata: { captionRetry: 'captions_type' }
          },
          retryRequestSentAt2,
          {
            statusCode: retryRes2.status,
            payload: retryResult2,
            isError: !retryRes2.ok,
            errorMessage: retryRes2.ok ? undefined : retryResult2?.message || retryResult2?.detail || `Shotstack API error ${retryRes2.status}`
          }
        ).catch(e => logger?.error('Failed to log API call (retry captions type)', e as Error));

        if (!retryRes2.ok) {
          const errors = retryResult2?.response?.errors;
          const errorList = Array.isArray(errors) ? errors.map((e: { message?: string; code?: string }) => e.message || e.code).join(', ') : '';
          const retryMsg = retryResult2?.response?.message || errorList || retryResult2?.message || errorMessage;
          throw new Error(`Shotstack error: ${retryMsg}`);
        }
        logger?.info('Shotstack render submitted successfully (captions type fallback)', { 
          metadata: { renderId: retryResult2.response.id } 
        });
        return retryResult2.response.id;
      }

      logger?.info("Shotstack render submitted successfully (minimal captions)", { 
        metadata: { renderId: retryResult.response.id } 
      });
      return retryResult.response.id;
    }
    
    throw new Error(`Shotstack error: ${errorMessage}`);
  }

  logger?.info("Shotstack render submitted successfully", { 
    metadata: { renderId: result.response.id } 
  });
  return result.response.id;
}

async function pollRenderStatus(supabase: SupabaseClient, jobId: string, renderId: string, userId: string, logger?: EdgeLogger) {
  // Max 20 minutes for very long videos (render time ≈ audio_duration / 2)
  // 240 attempts × 5 seconds = 1200 seconds = 20 minutes
  const maxAttempts = 240;
  let attempts = 0;

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000));

    const endpoint = API_ENDPOINTS.SHOTSTACK.getRenderStatusUrl(renderId);
    const requestSentAt = new Date();

    const response = await fetch(endpoint, {
      headers: { 'x-api-key': Deno.env.get('SHOTSTACK_API_KEY') ?? '' }
    });

    const result = response.ok ? await response.json() : null;

    // Log the status check API call
    logApiCall(
      supabase,
      {
        videoJobId: jobId,
        userId,
        serviceName: 'shotstack',
        endpoint,
        httpMethod: 'GET',
        stepName: 'poll_render_status',
        requestPayload: { render_id: renderId },
        additionalMetadata: { attempt: attempts }
      },
      requestSentAt,
      {
        statusCode: response.status,
        payload: result,
        isError: !response.ok,
        errorMessage: response.ok ? undefined : `Shotstack status check returned ${response.status}`
      }
    ).catch(e => logger?.error('Failed to log API call', e as Error));

    const status = result?.response?.status;
    
    logger?.debug('Render status check', { metadata: { jobId, status } });

    if (status === 'done' && result.response.url) {
      const videoUrl = result.response.url;
      
      const { data: job } = await supabase
        .from('video_jobs')
        .select('user_id, topic, duration, style, voice_id')
        .eq('id', jobId)
        .single();
      
      if (job) {
        try {
          logger?.info("Downloading video from Shotstack using streaming", { metadata: { jobId } });
          const videoResponse = await fetch(videoUrl);
          if (!videoResponse.ok || !videoResponse.body) {
            throw new Error(`Failed to download video from Shotstack: ${videoResponse.status}`);
          }
          
          const videoPath = `${job.user_id}/${new Date().toISOString().split('T')[0]}/${jobId}.mp4`;
          logger?.info("Uploading video to storage with streaming", { 
            metadata: { videoPath, jobId } 
          });
          
          // Stream upload - no intermediate memory buffer
          const { error: uploadError } = await supabase.storage
            .from('generated-content')
            .upload(videoPath, videoResponse.body, {
              contentType: 'video/mp4',
              upsert: true
            });
          
          if (uploadError) {
            logger?.error("Storage upload error", uploadError, { metadata: { videoPath, jobId } });
            throw uploadError;
          }
          
          logger?.info("Video uploaded successfully using streaming", { metadata: { videoPath, jobId } });
          
          // Generate direct public URL for the video
          const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
          const videoPublicUrl = `${supabaseUrl}/storage/v1/object/public/generated-content/${videoPath}`;
          logger?.info("Video available", { metadata: { videoPublicUrl, jobId } });
          
          logger?.info("Creating generation record", { metadata: { jobId, userId: job.user_id } });
          const { data: generation, error: genError } = await supabase.from('generations').insert({
            user_id: job.user_id,
            type: 'video',
            prompt: `Faceless Video: ${job.topic}`,
            status: GENERATION_STATUS.COMPLETED,
            tokens_used: 15,
            storage_path: videoPath,
            model_id: 'faceless-video-generator',
            settings: {
              duration: job.duration,
              style: job.style,
              voice_id: job.voice_id,
              video_job_id: jobId
            }
          }).select().single();
          
          if (genError) {
            logger?.error("Generation insert error", genError, { metadata: { jobId } });
          } else {
            logger?.info("Generation record created successfully", { 
              metadata: { generationId: generation.id, jobId } 
            });
            
            // Link all API logs to this generation
            try {
              await supabase
                .from('api_call_logs')
                .update({ generation_id: generation.id })
                .eq('video_job_id', jobId)
                .is('generation_id', null);
            } catch (error) {
              logger?.error("Failed to link API logs to generation", error as Error, { 
                metadata: { jobId, generationId: generation.id } 
              });
            }
          }
          
          // Update job with permanent storage URL instead of temporary Shotstack URL
          // Clear any stale error fields from previous failed attempts
          await supabase.from('video_jobs').update({
            status: GENERATION_STATUS.COMPLETED,
            final_video_url: videoPublicUrl,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            error_message: null,
            error_details: null
          }).eq('id', jobId);
          
          // Trigger email notification if enabled
          const { data: jobWithNotify } = await supabase
            .from('video_jobs')
            .select('notify_on_completion, topic, duration')
            .eq('id', jobId)
            .single();
          
          if (jobWithNotify?.notify_on_completion) {
            logger?.info('Triggering completion notification for video job', { metadata: { jobId } });
            try {
              await supabase.functions.invoke('notify-generation-complete', {
                body: {
                  generation_id: generation.id,
                  user_id: job.user_id,
                  generation_duration_seconds: job.duration || 60,
                  type: 'video_job',
                  video_topic: jobWithNotify.topic,
                }
              });
            } catch (notifyError) {
              logger?.error('Failed to send completion notification', notifyError as Error, { metadata: { jobId } });
            }
          }
          
          return; // Exit after successful completion
        } catch (uploadError) {
          logger?.error("Error during video download/upload", uploadError instanceof Error ? uploadError : new Error(String(uploadError)), { 
            metadata: { jobId, renderId } 
          });
          
          // Update job status to failed with detailed error
          await supabase.from('video_jobs').update({
            status: GENERATION_STATUS.FAILED,
            error_message: 'Failed to save final video',
            error_details: {
              error: uploadError instanceof Error ? uploadError.message : String(uploadError),
              step: 'video_upload',
              render_id: renderId
            },
            updated_at: new Date().toISOString()
          }).eq('id', jobId);
          
          throw new Error(`Video upload failed: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`);
        }
      }
      
      // Job completed successfully - should have already been updated above
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
      
      logger?.error("Shotstack render failed", undefined, { 
        metadata: errorDetails 
      });
      
      throw new Error(`Shotstack rendering failed: ${errorDetails.shotstack_error || errorDetails.shotstack_message}`);
    }

    attempts++;
  }

  throw new Error('Render timeout after 20 minutes');
}
