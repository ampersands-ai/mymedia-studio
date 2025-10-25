import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

// Inlined helper: log API call
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let job_id: string | undefined;
  
  try {
    const body = await req.json();
    job_id = body.job_id;

    if (!job_id) {
      throw new Error('job_id is required');
    }

    // Get auth user
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

    // Get job and verify ownership
    const { data: job, error: jobError } = await supabaseClient
      .from('video_jobs')
      .select('user_id, script, voiceover_url, style, duration, aspect_ratio, caption_style, custom_background_video, status, topic, actual_audio_duration')
      .eq('id', job_id)
      .single();

    if (jobError || !job) {
      throw new Error('Job not found');
    }

    if (job.user_id !== user.id) {
      throw new Error('Unauthorized: not your job');
    }

    if (job.status !== 'awaiting_voice_approval') {
      throw new Error(`Job cannot be approved from status: ${job.status}`);
    }

    console.log(`Approving voiceover for job ${job_id}, continuing assembly...`);

    // Use actual audio duration if available, otherwise fall back to requested duration
    const videoDuration = job.actual_audio_duration || job.duration;
    console.log(`Using video duration: ${videoDuration}s (actual_audio_duration: ${job.actual_audio_duration}, requested: ${job.duration})`);

    const backgroundMediaType = (job as any).background_media_type || 'video';
    console.log(`Using background media type: ${backgroundMediaType}`);

    // Step 3: Fetch multiple background videos or images
    await updateJobStatus(supabaseClient, job_id, 'fetching_video');
    
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
        job.topic
      );
      console.log(`Fetched ${backgroundImageUrls.length} background images from Pixabay`);
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
        job.topic
      );
    }
    
    await supabaseClient.from('video_jobs').update({ 
      background_video_url: backgroundVideoUrls[0] || backgroundImageUrls[0] // Store first URL for reference
    }).eq('id', job_id);
    console.log(`Fetched background media for job ${job_id}`);

    // Step 4: Assemble video
    await updateJobStatus(supabaseClient, job_id, 'assembling');
    
    // Get public URL for voiceover from storage (need public URL for Shotstack)
    const voiceFileName = job.voiceover_url.split('/').pop();
    const { data: signedData } = await supabaseClient.storage
      .from('video-assets')
      .createSignedUrl(voiceFileName!, 7200); // 2 hour expiry for Shotstack processing
    
    if (!signedData?.signedUrl) {
      throw new Error('Failed to generate signed URL for voiceover');
    }
    
    const voiceoverPublicUrl = signedData.signedUrl;
    console.log('Generated signed URL for voiceover');
    
    // Validate assets before submission
    console.log('Validating asset accessibility...');
    const testVoiceover = await fetch(voiceoverPublicUrl, { method: 'HEAD' });
    if (!testVoiceover.ok) {
      throw new Error(`Voiceover URL is not accessible: ${testVoiceover.status}`);
    }
    // Test first background media
    const testBgMedia = await fetch(
      backgroundVideoUrls[0] || backgroundImageUrls[0], 
      { method: 'HEAD' }
    );
    if (!testBgMedia.ok) {
      throw new Error(`Background media URL is not accessible: ${testBgMedia.status}`);
    }
    console.log('Assets validated successfully');
    
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
      backgroundMediaType
    );
    await supabaseClient.from('video_jobs').update({ shotstack_render_id: renderId }).eq('id', job_id);
    console.log(`Submitted to Shotstack: ${renderId}`);

    // Step 5: Poll for completion
    await pollRenderStatus(supabaseClient, job_id, renderId, user.id);

    return new Response(
      JSON.stringify({ success: true, job_id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in approve-voiceover:', error);
    
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
              message: error.message || 'Video rendering failed',
              timestamp: new Date().toISOString(),
              step: 'approve_voiceover'
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', job_id);
      } catch (updateError) {
        console.error('Failed to update job status:', updateError);
      }
    }
    
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred' }),
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
  supabase: any,
  style: string,
  videoJobId: string,
  userId: string,
  aspectRatio: string = '4:5',
  customImageUrl?: string,
  topic?: string
): Promise<string[]> {
  // If user selected custom image, return it as single-item array
  if (customImageUrl) {
    console.log('Using custom background image:', customImageUrl);
    return [customImageUrl];
  }

  // Use topic for search if available, otherwise fall back to style
  let searchQuery: string;
  if (topic && topic.trim()) {
    searchQuery = extractSearchTerms(topic);
    console.log(`Using topic-based image search: "${searchQuery}" (from topic: "${topic}")`);
  } else {
    const queries: Record<string, string> = {
      modern: 'abstract modern design',
      tech: 'technology digital background',
      educational: 'education learning',
      dramatic: 'dramatic cinematic'
    };
    searchQuery = queries[style] || 'abstract background';
    console.log(`Using style-based image search: "${searchQuery}"`);
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

  // Request 6 images from Pixabay
  const endpoint = `https://pixabay.com/api/?key=${pixabayApiKey}&q=${encodeURIComponent(searchQuery)}&image_type=photo&orientation=${orientation}&per_page=6`;
  const requestSentAt = new Date();

  const response = await fetch(endpoint);
  const data = response.ok ? await response.json() : null;

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
  ).catch(e => console.error('Failed to log API call:', e));

  if (!response.ok) {
    throw new Error('Pixabay API error');
  }

  if (!data.hits?.length) {
    throw new Error('No background images found');
  }

  // CRITICAL: Use only largeImageURL or webformatURL for automatic backgrounds (Pixabay policy)
  // Premium URLs (fullHDURL, imageURL, vectorURL) are only for user-selected content
  const imageUrls = data.hits
    .map((hit: any) => hit.largeImageURL || hit.webformatURL)
    .filter(Boolean);

  console.log(`Selected ${imageUrls.length} background images from Pixabay using permitted URLs`);
  return imageUrls;
}

async function getBackgroundVideos(
  supabase: any,
  style: string,
  duration: number,
  videoJobId: string,
  userId: string,
  aspectRatio: string = '4:5',
  customVideoUrl?: string,
  topic?: string
): Promise<string[]> {
  // If user selected custom video, return it as single-item array
  if (customVideoUrl) {
    console.log('Using custom background video:', customVideoUrl);
    return [customVideoUrl];
  }

  // Use topic for search if available, otherwise fall back to style
  let searchQuery: string;
  if (topic && topic.trim()) {
    // Extract key terms from topic (remove filler words, limit length)
    searchQuery = extractSearchTerms(topic);
    console.log(`Using topic-based search: "${searchQuery}" (from topic: "${topic}")`);
  } else {
    // Fallback to style-based queries
    const queries: Record<string, string> = {
      modern: 'technology abstract motion',
      tech: 'digital technology futuristic',
      educational: 'books learning study',
      dramatic: 'cinematic nature dramatic'
    };
    searchQuery = queries[style] || 'abstract motion background';
    console.log(`Using style-based search: "${searchQuery}"`);
  }

  // Determine orientation based on aspect ratio
  const orientationMap: Record<string, string> = {
    '16:9': 'landscape',
    '9:16': 'portrait',
    '4:5': 'portrait',
    '1:1': 'square'
  };
  const orientation = orientationMap[aspectRatio] || 'portrait';
  
  // Request more videos (40 instead of 20) to have enough variety
  const endpoint = `https://api.pexels.com/videos/search?query=${encodeURIComponent(searchQuery)}&per_page=40&orientation=${orientation}`;
  const requestSentAt = new Date();

  const response = await fetch(
    endpoint,
    { headers: { Authorization: Deno.env.get('PEXELS_API_KEY') ?? '' } }
  );

  const data = response.ok ? await response.json() : null;

  // Log the API call
  logApiCall(
    supabase,
    {
      videoJobId,
      userId,
      serviceName: 'pexels',
      endpoint,
      httpMethod: 'GET',
      stepName: 'fetch_background_videos',
      requestPayload: { query: searchQuery, per_page: 40, orientation },
      additionalMetadata: { style, duration, topic: topic || 'none' }
    },
    requestSentAt,
    {
      statusCode: response.status,
      payload: data,
      isError: !response.ok,
      errorMessage: response.ok ? undefined : `Pexels returned ${response.status}`
    }
  ).catch(e => console.error('Failed to log API call:', e));

  if (!response.ok) {
    throw new Error('Pexels API error');
  }
  
  if (!data.videos?.length) {
    throw new Error('No background videos found');
  }

  // Select video file based on aspect ratio orientation
  const selectHdFile = (video: any) => {
    let hdFile;
    
    if (orientation === 'portrait') {
      // For portrait (9:16, 4:5), prioritize videos with height > width
      hdFile = video.video_files.find((f: any) => 
        f.quality === 'hd' && f.height >= 1920 && f.height > f.width
      ) || video.video_files.find((f: any) => 
        f.quality === 'hd' && f.height > f.width
      );
    } else {
      // For landscape (16:9), prioritize videos with width > height
      hdFile = video.video_files.find((f: any) => 
        f.quality === 'hd' && f.width === 1920 && f.width > f.height
      ) || video.video_files.find((f: any) => 
        f.quality === 'hd' && f.width > f.height
      );
    }
    
    // Fallback
    if (!hdFile) {
      hdFile = video.video_files.find((f: any) => f.quality === 'hd') || video.video_files[0];
    }
    
    return hdFile;
  };

  // Filter videos that are long enough (at least 10s for variety)
  const suitable = data.videos.filter((v: any) => v.duration >= 10);
  const videosToUse = suitable.length >= 5 ? suitable : data.videos;
  
  // Calculate how many clips we need (aim for 8-12 second clips)
  const averageClipDuration = 10;
  const numberOfClips = Math.min(5, Math.ceil(duration / averageClipDuration));
  
  console.log(`Selecting ${numberOfClips} background videos for ${duration}s duration`);
  
  // Randomly select different videos (no duplicates)
  const selectedVideos: string[] = [];
  const usedIndices = new Set<number>();
  
  for (let i = 0; i < numberOfClips && selectedVideos.length < videosToUse.length; i++) {
    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * videosToUse.length);
    } while (usedIndices.has(randomIndex) && usedIndices.size < videosToUse.length);
    
    usedIndices.add(randomIndex);
    const video = videosToUse[randomIndex];
    const hdFile = selectHdFile(video);
    selectedVideos.push(hdFile.link);
  }
  
  console.log(`Selected ${selectedVideos.length} unique background videos`);
  return selectedVideos;
}

async function assembleVideo(
  supabase: any,
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
  captionStyle?: any,
  backgroundMediaType: 'video' | 'image' = 'video'
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
  const dimensions: Record<string, any> = {
    '16:9': { width: 1920, height: 1080 },
    '9:16': { width: 1080, height: 1920 },
    '4:5': { width: 1080, height: 1350 },
    '1:1': { width: 1080, height: 1080 }
  };
  const config = dimensions[aspectRatio] || dimensions['4:5'];

  console.log(`Assembling video with Shotstack - ${config.width}x${config.height} (${aspectRatio})`);

  // Build Shotstack JSON using official format
  const edit = {
    timeline: {
      background: '#000000',
      tracks: [] as any[]
    },
    output: {
      format: 'mp4',
      fps: 30, // Increased from 25 for smoother playback
      size: {
        width: config.width,
        height: config.height
      }
    }
  };

  // Track 0: Background media (video or images)
  if (backgroundMediaType === 'image' && assets.backgroundImageUrls && assets.backgroundImageUrls.length > 0) {
    const clipDuration = Math.ceil(assets.duration / assets.backgroundImageUrls.length);
    const imageClips = assets.backgroundImageUrls.map((imageUrl, index) => ({
      asset: {
        type: 'image',
        src: imageUrl
      },
      start: index * clipDuration,
      length: Math.min(clipDuration, assets.duration - (index * clipDuration)),
      fit: 'cover',
      scale: 1.05,
      ...(index > 0 && { transition: { in: 'fade', out: 'fade' } })
    }));
    edit.timeline.tracks.push({ clips: imageClips });
    console.log(`Added ${imageClips.length} background image clips`);
  } else {
    const clipDuration = Math.ceil(assets.duration / assets.backgroundVideoUrls.length);
    const videoClips = assets.backgroundVideoUrls.map((videoUrl, index) => ({
      asset: {
        type: 'video',
        src: videoUrl
      },
      start: index * clipDuration,
      length: Math.min(clipDuration, assets.duration - (index * clipDuration)),
      fit: 'cover',
      scale: 1.05,
      ...(index > 0 && { transition: { in: 'fade', out: 'fade' } })
    }));
    edit.timeline.tracks.push({ clips: videoClips });
    console.log(`Added ${videoClips.length} background video clips`);
  }

  // Track 1: Audio with alias (for auto-captions)
  edit.timeline.tracks.push({
    clips: [{
      asset: {
        type: 'audio',
        src: assets.voiceoverUrl
      },
      start: 0,
      length: 'auto',
      alias: 'VOICEOVER' // Alias for caption generation
    }]
  });

  // Track 2: Auto-generated captions using alias://VOICEOVER
  const captionAsset: any = {
    type: 'caption',
    src: 'alias://VOICEOVER', // Auto-sync to voiceover audio!
    font: {
      color: style.textColor,
      size: Number(style.fontSize) || 48, // CRITICAL: NUMBER not string
      family: style.fontFamily || 'Montserrat ExtraBold',
      lineHeight: 1.2
    }
  };

  // Add stroke INSIDE font object per Shotstack docs
  if (style.strokeColor && style.strokeWidth) {
    captionAsset.font.stroke = style.strokeColor;
    captionAsset.font.strokeWidth = Number(style.strokeWidth);
  }

  // Add background if not transparent
  if (style.backgroundColor && style.backgroundColor !== 'rgba(0,0,0,0)') {
    captionAsset.background = {
      color: style.backgroundColor,
      padding: 20,
      borderRadius: 10,
      opacity: 0.85
    };
  }

  edit.timeline.tracks.push({
    clips: [{
      asset: captionAsset,
      start: 0,
      length: 'end' // Cover entire video duration
    }]
  });

  console.log('Using official Shotstack auto-captions with alias://VOICEOVER');
  console.log('Caption configuration:', {
    fontSize: captionAsset.font.size,
    fontFamily: captionAsset.font.family,
    hasStroke: !!(captionAsset.font.stroke),
    hasBackground: !!captionAsset.background
  });
  console.log('Caption asset payload:', captionAsset);

  // Submit to Shotstack API
  const endpoint = 'https://api.shotstack.io/v1/render';
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
    console.error('Failed to parse Shotstack response:', responseText);
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
  ).catch(e => console.error('Failed to log API call:', e));

  if (!response.ok) {
    console.error('Shotstack API Error:', {
      status: response.status,
      response: result,
      requestPayload: edit
    });
    
    // Extract detailed error message
    let errorMessage = 'Shotstack API error';
    if (result?.response?.message) {
      errorMessage = result.response.message;
    } else if (result?.response?.errors && Array.isArray(result.response.errors)) {
      errorMessage = result.response.errors.map((e: any) => e.message || e.code).join(', ');
    } else if (result?.message) {
      errorMessage = result.message;
    }
    
    throw new Error(`Shotstack error: ${errorMessage}`);
  }

  console.log('Shotstack render submitted successfully:', result.response.id);
  return result.response.id;
}

async function pollRenderStatus(supabase: any, jobId: string, renderId: string, userId: string) {
  const maxAttempts = 120;
  let attempts = 0;

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000));

    const endpoint = `https://api.shotstack.io/v1/render/${renderId}`;
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
    ).catch(e => console.error('Failed to log API call:', e));

    const status = result?.response?.status;
    
    console.log(`Job ${jobId} render status: ${status}`);

    if (status === 'done' && result.response.url) {
      const videoUrl = result.response.url;
      
      const { data: job } = await supabase
        .from('video_jobs')
        .select('user_id, topic, duration, style, voice_id')
        .eq('id', jobId)
        .single();
      
      if (job) {
        try {
          console.log('Downloading video from Shotstack using streaming...');
          const videoResponse = await fetch(videoUrl);
          if (!videoResponse.ok || !videoResponse.body) {
            throw new Error(`Failed to download video from Shotstack: ${videoResponse.status}`);
          }
          
          const videoPath = `${job.user_id}/${new Date().toISOString().split('T')[0]}/${jobId}.mp4`;
          console.log('Uploading video to storage with streaming:', videoPath);
          
          // Stream upload - no intermediate memory buffer
          const { error: uploadError } = await supabase.storage
            .from('video-assets')
            .upload(videoPath, videoResponse.body, {
              contentType: 'video/mp4',
              upsert: true
            });
          
          if (uploadError) {
            console.error('Storage upload error:', uploadError);
            throw uploadError;
          }
          
          console.log('Video uploaded successfully using streaming');
          
          console.log('Creating generation record...');
          const { data: generation, error: genError } = await supabase.from('generations').insert({
            user_id: job.user_id,
            type: 'video',
            prompt: `Faceless Video: ${job.topic}`,
            status: 'completed',
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
            console.error('Generation insert error:', genError);
          } else {
            console.log('Generation record created successfully');
            
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
        } catch (uploadError: any) {
          console.error('Error during video download/upload:', uploadError);
          
          // Update job status to failed with detailed error
          await supabase.from('video_jobs').update({
            status: 'failed',
            error_message: 'Failed to save final video',
            error_details: { 
              error: uploadError.message,
              step: 'video_upload',
              render_id: renderId
            },
            updated_at: new Date().toISOString()
          }).eq('id', jobId);
          
          throw new Error(`Video upload failed: ${uploadError.message}`);
        }
      }
      
      await supabase.from('video_jobs').update({
        status: 'completed',
        final_video_url: videoUrl,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).eq('id', jobId);
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
      
      console.error('Shotstack render failed:', JSON.stringify(errorDetails, null, 2));
      
      throw new Error(`Shotstack rendering failed: ${errorDetails.shotstack_error || errorDetails.shotstack_message}`);
    }

    attempts++;
  }

  throw new Error('Render timeout after 10 minutes');
}
