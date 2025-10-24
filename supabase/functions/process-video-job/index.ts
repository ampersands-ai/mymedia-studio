import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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

    if (job.status === 'awaiting_approval') {
      console.log(`[${job_id}] Awaiting user approval, skipping auto-processing`);
      return new Response(
        JSON.stringify({ success: true, status: 'awaiting_approval' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Generate script (skip if already done)
    let script = job.script;
    if (!script) {
      console.log(`[${job_id}] Generating script...`);
      await updateJobStatus(supabaseClient, job_id, 'generating_script');
      script = await generateScript(job.topic, job.duration, job.style);
      await supabaseClient.from('video_jobs').update({ script }).eq('id', job_id);
      console.log(`[${job_id}] Script generated successfully`);
    } else {
      console.log(`[${job_id}] Script already exists, skipping generation`);
    }

    // Step 2: Generate voiceover (skip if already done)
    let voiceoverUrl = job.voiceover_url;
    if (!voiceoverUrl) {
      console.log(`[${job_id}] Generating voiceover...`);
      await updateJobStatus(supabaseClient, job_id, 'generating_voice');
      const voiceoverBlob = await generateVoiceover(script, job.voice_id);
      
      const voiceoverPath = `${job.user_id}/voiceovers/${job_id}.mp3`;
      const { error: uploadError } = await supabaseClient.storage
        .from('video-assets')
        .upload(voiceoverPath, voiceoverBlob, { 
          contentType: 'audio/mpeg',
          upsert: true 
        });

      if (uploadError) {
        throw new Error(`Failed to upload voiceover: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabaseClient.storage
        .from('video-assets')
        .getPublicUrl(voiceoverPath);

      voiceoverUrl = publicUrl;
      await supabaseClient.from('video_jobs').update({ voiceover_url: voiceoverUrl }).eq('id', job_id);
      console.log(`[${job_id}] Voiceover generated and uploaded successfully`);
    } else {
      console.log(`[${job_id}] Voiceover already exists, skipping generation`);
    }

    // Pause for user approval
    console.log(`[${job_id}] Script and voiceover ready, awaiting user approval`);
    await updateJobStatus(supabaseClient, job_id, 'awaiting_approval');

    return new Response(
      JSON.stringify({ 
        success: true, 
        job_id,
        status: 'awaiting_approval',
        message: 'Script and voiceover ready for review'
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

async function generateScript(topic: string, duration: number, style: string): Promise<string> {
  const wordsPerSecond = 2.5;
  const targetWords = Math.floor(duration * wordsPerSecond);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') ?? '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
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
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${error}`);
  }

  const data = await response.json();
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

async function getBackgroundVideo(style: string, duration: number): Promise<string> {
  const queries: Record<string, string> = {
    modern: 'technology abstract motion',
    tech: 'digital technology futuristic',
    educational: 'books learning study',
    dramatic: 'cinematic nature dramatic'
  };

  const query = queries[style] || 'abstract motion background';

  const response = await fetch(
    `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=20&orientation=landscape`,
    { headers: { Authorization: Deno.env.get('PEXELS_API_KEY') ?? '' } }
  );

  if (!response.ok) {
    throw new Error('Pexels API error');
  }

  const data = await response.json();
  
  if (!data.videos?.length) {
    throw new Error('No background videos found');
  }

  // Filter videos longer than required duration
  const suitable = data.videos.filter((v: any) => v.duration >= duration);
  const video = suitable.length ? suitable[Math.floor(Math.random() * suitable.length)] : data.videos[0];

  // Get HD file
  const hdFile = video.video_files.find((f: any) => f.quality === 'hd' && f.width === 1920) || 
                 video.video_files.find((f: any) => f.quality === 'hd') || 
                 video.video_files[0];
  
  return hdFile.link;
}

async function assembleVideo(assets: {
  script: string;
  voiceoverUrl: string;
  backgroundVideoUrl: string;
  duration: number;
}): Promise<string> {
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

  const response = await fetch('https://api.shotstack.io/v1/render', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': Deno.env.get('SHOTSTACK_API_KEY') ?? ''
    },
    body: JSON.stringify(edit)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Shotstack error: ${error.message || 'Unknown error'}`);
  }

  const result = await response.json();
  return result.response.id;
}

async function pollRenderStatus(supabase: any, jobId: string, renderId: string) {
  const maxAttempts = 120; // 10 minutes max (5s interval)
  let attempts = 0;

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

    const response = await fetch(`https://api.shotstack.io/v1/render/${renderId}`, {
      headers: { 'x-api-key': Deno.env.get('SHOTSTACK_API_KEY') ?? '' }
    });

    const result = await response.json();
    const status = result.response.status;
    
    console.log(`Job ${jobId} render status: ${status}`);

    if (status === 'done' && result.response.url) {
      const videoUrl = result.response.url;
      
      // Get job details to create generation
      const { data: job } = await supabase
        .from('video_jobs')
        .select('user_id, topic, duration, style, voice_id')
        .eq('id', jobId)
        .single();
      
      if (job) {
        try {
          // Download video from Shotstack
          console.log('Downloading video from Shotstack...');
          const videoResponse = await fetch(videoUrl);
          if (!videoResponse.ok) {
            throw new Error('Failed to download video from Shotstack');
          }
          
          const videoBlob = await videoResponse.blob();
          const videoBuffer = await videoBlob.arrayBuffer();
          const videoData = new Uint8Array(videoBuffer);
          
          // Upload to generated-content bucket
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
          
          // Create generation record
          console.log('Creating generation record...');
          const { error: genError } = await supabase.from('generations').insert({
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
          });
          
          if (genError) {
            console.error('Generation insert error:', genError);
          } else {
            console.log('Generation record created successfully');
          }
        } catch (error) {
          console.error('Error creating generation record:', error);
          // Don't fail the job if generation creation fails
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
