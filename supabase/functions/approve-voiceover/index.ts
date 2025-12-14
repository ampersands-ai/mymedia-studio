import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { GENERATION_STATUS } from "../_shared/constants.ts";
import { API_ENDPOINTS } from "../_shared/api-endpoints.ts";

// Type definitions
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

interface PixabayImageResponse {
  hits?: PixabayImage[];
}

interface PixabayVideoResponse {
  hits?: PixabayVideo[];
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
      .select('user_id, script, voiceover_url, style, duration, aspect_ratio, caption_style, custom_background_video, status, topic, actual_audio_duration, background_media_type')
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

    const backgroundMediaType = (job.background_media_type || 'video') as 'video' | 'image';
    logger.info("Background media type determined", { metadata: { backgroundMediaType } });

    // Step 3: Fetch multiple background videos or images
    await updateJobStatus(supabaseClient, job_id, 'fetching_video', logger);
    
    let backgroundVideoUrls: string[] = [];
    let backgroundImageUrls: string[] = [];
    
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
      // For videos: Use existing logic
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
    }
    
    await supabaseClient.from('video_jobs').update({ 
      background_video_url: backgroundVideoUrls[0] || backgroundImageUrls[0] // Store first URL for reference
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
): Promise<string[]> {
  // If user selected custom video, return it as single-item array
  if (customVideoUrl) {
    logger?.info("Using custom background video", { metadata: { customVideoUrl } });
    return [customVideoUrl];
  }

  // Use topic for search if available, otherwise fall back to style
  let searchQuery: string;
  if (topic && topic.trim()) {
    // Extract key terms from topic (remove filler words, limit length)
    searchQuery = extractSearchTerms(topic);
    logger?.info("Using topic-based search", { metadata: { searchQuery, topic } });
  } else {
    // Fallback to style-based queries
    const queries: Record<string, string> = {
      modern: 'technology abstract motion',
      tech: 'digital technology futuristic',
      educational: 'books learning study',
      dramatic: 'cinematic nature dramatic'
    };
    searchQuery = queries[style] || 'abstract motion background';
    logger?.info("Using style-based search", { metadata: { searchQuery, style } });
  }

  // Determine target orientation for filtering
  const orientationMap: Record<string, string> = {
    '16:9': 'landscape',
    '9:16': 'portrait',
    '4:5': 'portrait',
    '1:1': 'square'
  };
  const targetOrientation = orientationMap[aspectRatio] || 'portrait';
  
  // Request more videos (40 instead of 20) to have enough variety
  const pixabayApiKey = Deno.env.get('PIXABAY_API_KEY');
  const endpoint = `${API_ENDPOINTS.PIXABAY.apiUrl}/videos/?key=${pixabayApiKey}&q=${encodeURIComponent(searchQuery)}&per_page=40`;
  const requestSentAt = new Date();

  const response = await fetch(endpoint);

  const data: PixabayVideoResponse | null = response.ok ? await response.json() : null;

  // Log the API call
  logApiCall(
    supabase,
    {
      videoJobId,
      userId,
      serviceName: 'pixabay',
      endpoint: endpoint.replace(pixabayApiKey || '', 'REDACTED'),
      httpMethod: 'GET',
      stepName: 'fetch_background_videos',
      requestPayload: { query: searchQuery, per_page: 40 },
      additionalMetadata: { style, duration, topic: topic || 'none', targetOrientation }
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
    throw new Error('No background videos found');
  }

  // Filter videos by orientation based on aspect ratio
  const filterByOrientation = (video: PixabayVideo) => {
    const videoWidth = video.videos?.large?.width || video.videos?.medium?.width || 1920;
    const videoHeight = video.videos?.large?.height || video.videos?.medium?.height || 1080;
    const videoRatio = videoWidth / videoHeight;
    
    if (targetOrientation === 'portrait') {
      return videoRatio < 1; // height > width
    } else if (targetOrientation === 'landscape') {
      return videoRatio > 1; // width > height
    }
    return true; // square or all
  };

  // Select video URL based on aspect ratio and availability
  const selectVideoUrl = (video: PixabayVideo): string | undefined => {
    const videos = video.videos;
    
    if (targetOrientation === 'portrait') {
      // Prefer medium/small for portrait to ensure proper dimensions
      return videos?.medium?.url || videos?.small?.url || videos?.large?.url;
    } else {
      // Prefer large for landscape
      return videos?.large?.url || videos?.medium?.url || videos?.small?.url;
    }
  };

  // Filter videos that match orientation and are long enough (at least 10s for variety)
  const orientationFiltered = data.hits.filter(filterByOrientation);
  const suitable = orientationFiltered.filter((v: PixabayVideo) => (v.duration || 0) >= 10);
  const videosToUse = suitable.length >= 5 ? suitable : (orientationFiltered.length ? orientationFiltered : data.hits);
  
  // Calculate how many clips we need (aim for 3-5 second clips, average 4s)
  const averageClipDuration = 4;
  const numberOfClips = Math.min(30, Math.ceil(duration / averageClipDuration));

  logger?.info("Selecting background videos for duration", {
    metadata: { numberOfClips, duration, averageClipDuration }
  });
  
  // Randomly select different videos (allow wrapping for long videos)
  const selectedVideos: string[] = [];
  const usedIndices = new Set<number>();
  
  for (let i = 0; i < numberOfClips; i++) {
    // Reset used indices if we've used all available videos (for long videos)
    if (usedIndices.size >= videosToUse.length) {
      usedIndices.clear();
    }
    
    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * videosToUse.length);
    } while (usedIndices.has(randomIndex) && usedIndices.size < videosToUse.length);
    
    usedIndices.add(randomIndex);
    const video = videosToUse[randomIndex];
    const videoUrl = selectVideoUrl(video);
    if (videoUrl) {
      selectedVideos.push(videoUrl);
    }
  }
  
  logger?.info("Background videos selected", { metadata: { videoCount: selectedVideos.length, targetClips: numberOfClips } });
  return selectedVideos;
}

async function assembleVideo(
  supabase: SupabaseClient,
  assets: {
    script: string;
    voiceoverUrl: string;
    backgroundVideoUrls: string[];
    backgroundImageUrls?: string[];
    duration: number;
  },
  videoJobId: string,
  userId: string,
  aspectRatio: string = '4:5',
  captionStyle?: CaptionStyle,
  backgroundMediaType: 'video' | 'image' = 'video',
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
  
  if (backgroundMediaType === 'image' && assets.backgroundImageUrls && assets.backgroundImageUrls.length > 0) {
    const imageClips: Array<Record<string, unknown>> = [];
    let currentTime = 0;
    let imageIndex = 0;
    
    while (currentTime < assets.duration) {
      const clipDuration = Math.min(getRandomClipDuration(), assets.duration - currentTime);
      const imageUrl = assets.backgroundImageUrls[imageIndex % assets.backgroundImageUrls.length];
      
      imageClips.push({
        asset: {
          type: 'image',
          src: imageUrl
        },
        start: currentTime,
        length: clipDuration,
        fit: 'cover',
        scale: 1.05,
        ...(imageClips.length > 0 && { transition: { in: 'fade', out: 'fade' } })
      });
      
      currentTime += clipDuration;
      imageIndex++;
    }
    
    edit.timeline.tracks.push({ clips: imageClips });
    logger?.info("Added background image clips with 3-5s duration", { metadata: { clipCount: imageClips.length, totalDuration: assets.duration } });
  } else {
    const videoClips: Array<Record<string, unknown>> = [];
    let currentTime = 0;
    let videoIndex = 0;
    
    while (currentTime < assets.duration) {
      const clipDuration = Math.min(getRandomClipDuration(), assets.duration - currentTime);
      const videoUrl = assets.backgroundVideoUrls[videoIndex % assets.backgroundVideoUrls.length];
      
      videoClips.push({
        asset: {
          type: 'video',
          src: videoUrl
        },
        start: currentTime,
        length: clipDuration,
        fit: 'cover',
        scale: 1.05,
        ...(videoClips.length > 0 && { transition: { in: 'fade', out: 'fade' } })
      });
      
      currentTime += clipDuration;
      videoIndex++;
    }
    
    edit.timeline.tracks.push({ clips: videoClips });
    logger?.info("Added background video clips with 3-5s duration", { metadata: { clipCount: videoClips.length, totalDuration: assets.duration } });
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

  // Submit to Shotstack API
  const endpoint = API_ENDPOINTS.SHOTSTACK.renderUrl;
  const requestSentAt = new Date();

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
          await supabase.from('video_jobs').update({
            status: GENERATION_STATUS.COMPLETED,
            final_video_url: videoPublicUrl,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }).eq('id', jobId);
          
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
