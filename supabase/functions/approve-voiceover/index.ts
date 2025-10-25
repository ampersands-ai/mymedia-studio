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

  try {
    const { job_id } = await req.json();

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
      .select('user_id, script, voiceover_url, style, duration, aspect_ratio, caption_style, custom_background_video, status, topic')
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

    // Step 3: Fetch background video
    await updateJobStatus(supabaseClient, job_id, 'fetching_video');
    const backgroundVideoUrl = await getBackgroundVideo(
      supabaseClient,
      job.style,
      job.duration,
      job_id,
      user.id,
      job.aspect_ratio || '4:5',
      job.custom_background_video,
      job.topic
    );
    await supabaseClient.from('video_jobs').update({ background_video_url: backgroundVideoUrl }).eq('id', job_id);
    console.log(`Fetched background video for job ${job_id}`);

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
    const testBgVideo = await fetch(backgroundVideoUrl, { method: 'HEAD' });
    if (!testBgVideo.ok) {
      throw new Error(`Background video URL is not accessible: ${testBgVideo.status}`);
    }
    console.log('Assets validated successfully');
    
    const renderId = await assembleVideo(
      supabaseClient,
      {
        script: job.script,
        voiceoverUrl: voiceoverPublicUrl,
        backgroundVideoUrl,
        duration: job.duration,
      },
      job_id,
      user.id,
      job.aspect_ratio || '4:5',
      job.caption_style
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
    
    // Update job as failed
    if (error.job_id) {
      try {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        
        await supabaseClient
          .from('video_jobs')
          .update({
            status: 'failed',
            error_message: error.message || 'Unknown error occurred',
          })
          .eq('id', error.job_id);
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

async function getBackgroundVideo(
  supabase: any,
  style: string,
  duration: number,
  videoJobId: string,
  userId: string,
  aspectRatio: string = '4:5',
  customVideoUrl?: string,
  topic?: string
): Promise<string> {
  // If user selected custom video, use it
  if (customVideoUrl) {
    console.log('Using custom background video:', customVideoUrl);
    return customVideoUrl;
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
  const endpoint = `https://api.pexels.com/videos/search?query=${encodeURIComponent(searchQuery)}&per_page=20&orientation=${orientation}`;
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
      stepName: 'fetch_background_video',
      requestPayload: { query: searchQuery, per_page: 20, orientation },
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

  const suitable = data.videos.filter((v: any) => v.duration >= duration);
  const video = suitable.length ? suitable[Math.floor(Math.random() * suitable.length)] : data.videos[0];

  // Select video file based on aspect ratio orientation
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
  
  return hdFile.link;
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
  userId: string,
  aspectRatio: string = '4:5',
  captionStyle?: any
): Promise<string> {
  // Default caption style
  const defaultStyle = {
    position: 'center',
    animation: 'zoom',
    fontSize: 72,
    fontWeight: 'black',
    fontFamily: 'Montserrat',
    textColor: '#FFFFFF',
    backgroundColor: 'rgba(0,0,0,0)',
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

  // Position mapping
  const positionMap: Record<string, string> = {
    top: 'top',
    center: 'center',
    bottom: 'bottom'
  };

  // Animation transitions
  const transitions: Record<string, any> = {
    fade: { in: 'fade', out: 'fade' },
    zoom: { in: 'zoom', out: 'zoom' },
    slide: { in: 'slideRight', out: 'slideLeft' },
    bounce: { in: 'zoom', out: 'zoom' }
  };
  const words = assets.script.split(' ');
  const wordsPerSecond = 2.5;
  const secondsPerWord = 1 / wordsPerSecond;
  
  // Font weight mapping
  const fontWeightMap: Record<string, string> = {
    normal: '400',
    bold: '700',
    black: '900'
  };
  
  // Build CSS string without complex template literals that might break
  const buildCss = (style: any, fontWeight: string) => {
    let css = `p { font-family: '${style.fontFamily}', Arial, sans-serif; font-size: ${style.fontSize}px; font-weight: ${fontWeight}; color: ${style.textColor}; text-align: center; background: ${style.backgroundColor}; padding: 20px 40px; margin: 0; border-radius: 12px; text-transform: uppercase; letter-spacing: 2px;`;
    
    if (style.strokeColor && style.strokeWidth) {
      css += ` -webkit-text-stroke: ${style.strokeWidth}px ${style.strokeColor}; paint-order: stroke fill; text-shadow: 3px 3px 6px ${style.strokeColor};`;
    } else {
      css += ` text-shadow: 2px 2px 4px rgba(0,0,0,0.8);`;
    }
    
    css += ` }`;
    return css;
  };
  
  const subtitleClips = words.map((word, index) => {
    const clip: any = {
      asset: {
        type: 'html',
        html: `<p>${word}</p>`,
        css: buildCss(style, fontWeightMap[style.fontWeight] || '700'),
        width: config.width,
        height: Math.floor(config.height * 0.2)
      },
      start: index * secondsPerWord,
      length: secondsPerWord * 1.2,
      position: positionMap[style.position] || 'center'
    };
    
    // Add transition based on animation style
    if (style.animation === 'fade') {
      clip.transition = { in: 'fade', out: 'fade' };
    } else if (style.animation === 'zoom') {
      clip.transition = { in: 'zoom', out: 'zoom' };
    }
    
    return clip;
  });

  // Normalize Shotstack resolution to a valid value
  const allowedResolutions = new Set(['preview','mobile','sd','hd','1080','4k']);
  const normalizeResolution = (res?: string) => {
    const val = typeof res === 'string' ? res : '';
    return allowedResolutions.has(val) ? val : '1080';
  };
  const resolutionForAspect: Record<string,string> = {
    '16:9': '1080',
    '9:16': '1080',
    '4:5': '1080',
    '1:1': '1080'
  };
  const safeResolution = normalizeResolution(resolutionForAspect[aspectRatio]);
  console.log(`Assembling video with Shotstack resolution: ${safeResolution} for aspect ratio ${aspectRatio}`);

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
              src: assets.backgroundVideoUrl
            },
            start: 0,
            length: assets.duration,
            fit: 'cover',
            scale: 1.05,
            loop: true
          }]
        },
        {
          clips: subtitleClips
        }
      ]
    },
    output: {
      format: 'mp4',
      resolution: safeResolution,
      fps: 30,
      quality: 'high'
    }
  };

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

  // Log the API call with detailed error info
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
    console.error('Shotstack error details:', {
      status: response.status,
      response: result,
      requestPayload: edit
    });
    throw new Error(`Shotstack error: ${result?.message || result?.detail || response.statusText || 'Bad Request'}`);
  }

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
          console.log('Downloading video from Shotstack...');
          const videoResponse = await fetch(videoUrl);
          if (!videoResponse.ok) {
            throw new Error('Failed to download video from Shotstack');
          }
          
          const videoBlob = await videoResponse.blob();
          const videoBuffer = await videoBlob.arrayBuffer();
          const videoData = new Uint8Array(videoBuffer);
          
          const videoPath = `${job.user_id}/${new Date().toISOString().split('T')[0]}/${jobId}.mp4`;
          console.log('Uploading video to storage:', videoPath);
          
          const { error: uploadError } = await supabase.storage
            .from('generated-content')
            .upload(videoPath, videoData, {
              contentType: 'video/mp4',
              upsert: true
            });
          
          if (uploadError) {
            console.error('Storage upload error:', uploadError);
            throw uploadError;
          }
          
          console.log('Creating generation record...');
          const { data: generation, error: genError } = await supabase.from('generations').insert({
            user_id: job.user_id,
            type: 'video',
            prompt: `Faceless Video: ${job.topic}`,
            status: 'completed',
            tokens_used: 15,
            storage_path: videoPath,
            model_id: 'faceless-video-generator',
            file_size_bytes: videoData.length,
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
        } catch (error) {
          console.error('Error creating generation record:', error);
        }
      }
      
      await supabase.from('video_jobs').update({
        status: 'completed',
        final_video_url: videoUrl,
        completed_at: new Date().toISOString()
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
