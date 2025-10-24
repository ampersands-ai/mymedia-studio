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

    // Get auth user
    const authHeader = req.headers.get('authorization');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { authorization: authHeader ?? '' } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Use service role for operations
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get job and verify ownership
    const { data: job, error: jobError } = await serviceClient
      .from('video_jobs')
      .select('*')
      .eq('id', job_id)
      .single();

    if (jobError || !job) {
      throw new Error('Job not found');
    }

    if (job.user_id !== user.id) {
      throw new Error('Unauthorized: not your job');
    }

    if (job.status !== 'awaiting_approval') {
      throw new Error(`Job cannot be approved from status: ${job.status}`);
    }

    console.log(`Approving video job ${job_id}, continuing assembly...`);

    // Continue from where process-video-job left off
    // Step 3: Fetch background video
    await updateJobStatus(serviceClient, job_id, 'fetching_video');
    const backgroundVideoUrl = await getBackgroundVideo(job.style, job.duration);
    await serviceClient.from('video_jobs').update({ background_video_url: backgroundVideoUrl }).eq('id', job_id);
    console.log(`Fetched background video for job ${job_id}`);

    // Step 4: Assemble video
    await updateJobStatus(serviceClient, job_id, 'assembling');
    
    // Validate assets before submission
    console.log('Validating asset accessibility...');
    const testVoiceover = await fetch(job.voiceover_url, { method: 'HEAD' });
    if (!testVoiceover.ok) {
      throw new Error(`Voiceover URL is not accessible: ${testVoiceover.status}`);
    }
    const testBgVideo = await fetch(backgroundVideoUrl, { method: 'HEAD' });
    if (!testBgVideo.ok) {
      throw new Error(`Background video URL is not accessible: ${testBgVideo.status}`);
    }
    console.log('Assets validated successfully');
    
    const renderId = await assembleVideo({
      script: job.script,
      voiceoverUrl: job.voiceover_url,
      backgroundVideoUrl,
      duration: job.duration,
    });
    await serviceClient.from('video_jobs').update({ shotstack_render_id: renderId }).eq('id', job_id);
    console.log(`Submitted to Shotstack: ${renderId}`);

    // Step 5: Poll for completion
    await pollRenderStatus(serviceClient, job_id, renderId);

    return new Response(
      JSON.stringify({ success: true, job_id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in approve-video-job:', error);
    
    // Update job as failed
    if (error.job_id) {
      try {
        const serviceClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        
        await serviceClient
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

  const suitable = data.videos.filter((v: any) => v.duration >= duration);
  const video = suitable.length ? suitable[Math.floor(Math.random() * suitable.length)] : data.videos[0];

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
  const maxAttempts = 120;
  let attempts = 0;

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000));

    const response = await fetch(`https://api.shotstack.io/v1/render/${renderId}`, {
      headers: { 'x-api-key': Deno.env.get('SHOTSTACK_API_KEY') ?? '' }
    });

    const result = await response.json();
    const status = result.response.status;
    
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
