import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logApiCall, linkApiLogsToGeneration } from '../_shared/api-logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      .select('user_id, script, voiceover_url, style, duration, aspect_ratio, caption_style, custom_background_video, status')
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
      job.custom_background_video
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

async function getBackgroundVideo(
  supabase: any,
  style: string,
  duration: number,
  videoJobId: string,
  userId: string,
  aspectRatio: string = '4:5',
  customVideoUrl?: string
): Promise<string> {
  // If user selected custom video, use it
  if (customVideoUrl) {
    console.log('Using custom background video:', customVideoUrl);
    return customVideoUrl;
  }
  const queries: Record<string, string> = {
    modern: 'technology abstract motion',
    tech: 'digital technology futuristic',
    educational: 'books learning study',
    dramatic: 'cinematic nature dramatic'
  };

  // Determine orientation based on aspect ratio
  const orientationMap: Record<string, string> = {
    '16:9': 'landscape',
    '9:16': 'portrait',
    '4:5': 'portrait',
    '1:1': 'square'
  };
  const orientation = orientationMap[aspectRatio] || 'portrait';

  const query = queries[style] || 'abstract motion background';
  const endpoint = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=20&orientation=${orientation}`;
  const requestSentAt = new Date();

  const response = await fetch(
    endpoint,
    { headers: { Authorization: Deno.env.get('PEXELS_API_KEY') ?? '' } }
  );

  const data = response.ok ? await response.json() : null;

  // Log the API call
  await logApiCall(
    supabase,
    {
      videoJobId,
      userId,
      serviceName: 'pexels',
      endpoint,
      httpMethod: 'GET',
      stepName: 'fetch_background_video',
      requestPayload: { query, per_page: 20, orientation: 'landscape' },
      additionalMetadata: { style, duration }
    },
    requestSentAt,
    {
      statusCode: response.status,
      payload: data,
      isError: !response.ok,
      errorMessage: response.ok ? undefined : `Pexels returned ${response.status}`
    }
  );

  if (!response.ok) {
    throw new Error('Pexels API error');
  }
  
  if (!data.videos?.length) {
    throw new Error('No background videos found');
  }

  const suitable = data.videos.filter((v: any) => v.duration >= duration);
  const video = suitable.length ? suitable[Math.floor(Math.random() * suitable.length)] : data.videos[0];

  const hdFile = video.video_files.find((f: any) => f.quality === 'hd' && f.width === 1920) || 
                 video.video_files.find((f: any) => f.quality === 'hd') || 
                 video.video_files[0];
  
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
  
  const subtitleClips = words.map((word, index) => ({
    asset: {
      type: 'html',
      html: `<p>${word}</p>`,
      css: `p { 
        font-family: '${style.fontFamily}', Arial, sans-serif; 
        font-size: ${style.fontSize}px; 
        font-weight: ${fontWeightMap[style.fontWeight] || '700'};
        color: ${style.textColor}; 
        text-align: center; 
        background: ${style.backgroundColor}; 
        padding: 20px 40px;
        margin: 0;
        border-radius: 12px;
        text-transform: uppercase;
        letter-spacing: 2px;
        ${style.strokeColor && style.strokeWidth ? `
          -webkit-text-stroke: ${style.strokeWidth}px ${style.strokeColor};
          paint-order: stroke fill;
          text-shadow: 3px 3px 6px ${style.strokeColor};
        ` : `text-shadow: 2px 2px 4px rgba(0,0,0,0.8);`}
      }`,
      width: config.width,
      height: Math.floor(config.height * 0.2),
      position: positionMap[style.position] || 'center'
    },
    start: index * secondsPerWord,
    length: secondsPerWord * 1.2,
    transition: transitions[style.animation] || { in: 'fade', out: 'fade' },
    effect: style.animation === 'bounce' ? 'zoomIn' : undefined
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
      resolution: 'custom',
      width: config.width,
      height: config.height,
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

  const result = response.ok ? await response.json() : null;

  // Log the API call
  await logApiCall(
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
      errorMessage: response.ok ? undefined : `Shotstack returned ${response.status}`
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Shotstack error: ${error.message || 'Unknown error'}`);
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
    await logApiCall(
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
    );

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
            await linkApiLogsToGeneration(supabase, jobId, generation.id);
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
