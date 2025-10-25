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

    console.log(`[${job_id}] Current status: ${job.status}, topic: ${job.topic}`);

    // Idempotency: Resume from current status
    if (job.status === 'completed') {
      console.log(`[${job_id}] Already completed, skipping`);
      return new Response(
        JSON.stringify({ success: true, status: 'already_completed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (job.status === 'failed') {
      console.log(`[${job_id}] Already failed, skipping`);
      return new Response(
        JSON.stringify({ success: false, status: 'already_failed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (job.status === 'awaiting_script_approval' || job.status === 'awaiting_voice_approval') {
      console.log(`[${job_id}] Awaiting user approval (${job.status}), skipping auto-processing`);
      return new Response(
        JSON.stringify({ success: true, status: job.status }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Generate script (skip if already done)
    let script = job.script;
    if (!script) {
      console.log(`[${job_id}] Generating script...`);
      await updateJobStatus(supabaseClient, job_id, 'generating_script');
      script = await generateScript(supabaseClient, job.topic, job.duration, job.style, job_id, job.user_id);
      await supabaseClient.from('video_jobs').update({ script }).eq('id', job_id);
      console.log(`[${job_id}] Script generated successfully`);
    } else {
      console.log(`[${job_id}] Script already exists, skipping generation`);
    }

    // Pause for user approval of script
    console.log(`[${job_id}] Script ready for review`);
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
    console.error('Error in process-video-job:', error);
    console.error('Error stack:', error.stack);
    
    const errorMessage = error.message || 'Unknown error occurred';
    
    console.error(`[${job_id || 'unknown'}] Fatal error during processing:`, {
      message: errorMessage,
      stack: error.stack,
      name: error.name
    });
    
    // Update job as failed if we have a job_id
    if (job_id) {
      try {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        
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
        console.error('Failed to update job status:', updateError);
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
  await logApiCall(
    supabase,
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
  );

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
    let errorDetails: any = {};
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

async function getBackgroundVideo(
  supabase: any,
  style: string,
  duration: number,
  videoJobId: string,
  userId: string
): Promise<string> {
  const queries: Record<string, string> = {
    modern: 'technology abstract motion',
    tech: 'digital technology futuristic',
    educational: 'books learning study',
    dramatic: 'cinematic nature dramatic'
  };

  const query = queries[style] || 'abstract motion background';
  const endpoint = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=20&orientation=landscape`;
  const requestSentAt = new Date();

  console.log(`[${videoJobId}] Searching Pexels for: ${query}`);

  const response = await fetch(endpoint, {
    headers: { Authorization: Deno.env.get('PEXELS_API_KEY') ?? '' }
  });

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
      requestPayload: { query, style, duration },
      additionalMetadata: { per_page: 20, orientation: 'landscape' }
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
    throw new Error(`Pexels API error: ${response.status}`);
  }
  
  if (!data.videos?.length) {
    throw new Error('No background videos found');
  }

  console.log(`[${videoJobId}] Found ${data.videos.length} videos from Pexels`);

  // Filter videos longer than required duration
  const suitable = data.videos.filter((v: any) => v.duration >= duration);
  const video = suitable.length ? suitable[Math.floor(Math.random() * suitable.length)] : data.videos[0];

  // Get HD file
  const hdFile = video.video_files.find((f: any) => f.quality === 'hd' && f.width === 1920) || 
                 video.video_files.find((f: any) => f.quality === 'hd') || 
                 video.video_files[0];
  
  console.log(`[${videoJobId}] Selected video: ${video.id}, quality: ${hdFile.quality}`);
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
      height: 200,
      position: 'center'
    },
    start: index * secondsPerWord,
    length: secondsPerWord * 1.2,
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
      errorMessage: response.ok ? undefined : `Shotstack returned ${response.status}`
    }
  );

  if (!response.ok) {
    const error = result || { message: 'Unknown error' };
    const errorMsg = error.message || error.error || 'Unknown Shotstack error';
    console.error(`[${videoJobId}] Shotstack submit error:`, JSON.stringify(error, null, 2));
    throw new Error(`Shotstack error: ${errorMsg}`);
  }

  const renderId = result.response.id;
  console.log(`[${videoJobId}] Shotstack render submitted: ${renderId}`);
  return renderId;
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
        .select('user_id, topic, duration, style, voice_id')
        .eq('id', jobId)
        .single();
      
      if (job) {
        try {
          // Download video from Shotstack
          console.log(`[${jobId}] Downloading video from Shotstack...`);
          const videoResponse = await fetch(videoUrl);
          if (!videoResponse.ok) {
            throw new Error('Failed to download video from Shotstack');
          }
          
          const videoBlob = await videoResponse.blob();
          const videoBuffer = await videoBlob.arrayBuffer();
          const videoData = new Uint8Array(videoBuffer);
          
          // Upload to generated-content bucket
          const videoPath = `${job.user_id}/${new Date().toISOString().split('T')[0]}/${jobId}.mp4`;
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
          
          // Create generation record
          console.log(`[${jobId}] Creating generation record...`);
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
          }).select('id').single();
          
          if (genError) {
            console.error(`[${jobId}] Generation insert error:`, genError);
          } else {
            console.log(`[${jobId}] Generation record created: ${generation.id}`);
            
            // Link all API logs to this generation
            await linkApiLogsToGeneration(supabase, jobId, generation.id);
          }
        } catch (error) {
          console.error(`[${jobId}] Error creating generation record:`, error);
          // Don't fail the job if generation creation fails
        }
      }
      
      await supabase.from('video_jobs').update({
        status: 'completed',
        final_video_url: videoUrl,
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
