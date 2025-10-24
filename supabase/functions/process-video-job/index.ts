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

  try {
    const { job_id } = await req.json();

    if (!job_id) {
      throw new Error('job_id is required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get job details
    const { data: job, error: jobError } = await supabaseClient
      .from('video_jobs')
      .select('*')
      .eq('id', job_id)
      .single();

    if (jobError || !job) {
      throw new Error('Job not found');
    }

    console.log(`Processing video job ${job_id}: ${job.topic}`);

    // Step 1: Generate script using Claude
    await updateJobStatus(supabaseClient, job_id, 'generating_script');
    const script = await generateScript(job.topic, job.duration, job.style);
    await supabaseClient.from('video_jobs').update({ script }).eq('id', job_id);
    console.log(`Generated script for job ${job_id}`);

    // Step 2: Generate voiceover using ElevenLabs
    await updateJobStatus(supabaseClient, job_id, 'generating_voice');
    const voiceoverBlob = await generateVoiceover(script, job.voice_id);
    
    // Upload voiceover to storage
    const voiceoverPath = `${job.user_id}/${job_id}-voiceover.mp3`;
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

    await supabaseClient.from('video_jobs').update({ voiceover_url: publicUrl }).eq('id', job_id);
    console.log(`Generated voiceover for job ${job_id}`);

    // Step 3: Fetch background video from Pexels
    await updateJobStatus(supabaseClient, job_id, 'fetching_video');
    const backgroundVideoUrl = await getBackgroundVideo(job.style, job.duration);
    await supabaseClient.from('video_jobs').update({ background_video_url: backgroundVideoUrl }).eq('id', job_id);
    console.log(`Fetched background video for job ${job_id}`);

    // Step 4: Assemble video using Shotstack
    await updateJobStatus(supabaseClient, job_id, 'assembling');
    const renderId = await assembleVideo({
      script,
      voiceoverUrl: publicUrl,
      backgroundVideoUrl,
      duration: job.duration,
    });
    await supabaseClient.from('video_jobs').update({ shotstack_render_id: renderId }).eq('id', job_id);
    console.log(`Submitted to Shotstack: ${renderId}`);

    // Step 5: Poll for completion (in production, use webhooks)
    await pollRenderStatus(supabaseClient, job_id, renderId);

    return new Response(
      JSON.stringify({ success: true, job_id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in process-video-job:', error);
    
    // Update job as failed
    if (error.job_id) {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      await supabaseClient
        .from('video_jobs')
        .update({
          status: 'failed',
          error_message: error.message,
          error_details: { error: error.message, stack: error.stack }
        })
        .eq('id', error.job_id);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
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
    const error = await response.text();
    throw new Error(`ElevenLabs error: ${error}`);
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
      await supabase.from('video_jobs').update({
        status: 'completed',
        final_video_url: result.response.url,
        completed_at: new Date().toISOString()
      }).eq('id', jobId);
      return;
    }

    if (status === 'failed') {
      throw new Error('Shotstack rendering failed');
    }

    attempts++;
  }

  throw new Error('Render timeout after 10 minutes');
}
