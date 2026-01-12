import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { GENERATION_STATUS } from "../_shared/constants.ts";
import { API_ENDPOINTS } from "../_shared/api-endpoints.ts";

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

interface AssembleRequest {
  job_id: string;
  user_id: string;
  script: string;
  voiceover_url: string;
  topic: string;
  duration: number;
  aspect_ratio: string;
  caption_style?: CaptionStyle;
  notify_on_completion?: boolean;
}

Deno.serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('assemble-ai-video', requestId);

  try {
    logger.info("Assemble AI video request received");
    
    // Note: verify_jwt = false in config.toml allows internal service-to-service calls
    // This function is invoked by approve-voiceover using service role key

    const body: AssembleRequest = await req.json();
    const { 
      job_id, 
      user_id, 
      script, 
      voiceover_url, 
      topic, 
      duration, 
      aspect_ratio, 
      caption_style,
      notify_on_completion 
    } = body;

    if (!job_id || !user_id || !script || !voiceover_url) {
      throw new Error('Missing required fields');
    }

    logger.info("Processing AI video assembly", { 
      metadata: { jobId: job_id, userId: user_id } 
    });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update job status
    await supabase.from('video_jobs').update({
      status: 'assembling',
      updated_at: new Date().toISOString()
    }).eq('id', job_id);

    // Validate voiceover URL
    logger.debug("Validating voiceover URL accessibility");
    const headResponse = await fetch(voiceover_url, { method: 'HEAD' });
    if (!headResponse.ok) {
      throw new Error(`Voiceover not accessible: ${headResponse.status}`);
    }
    logger.info("Voiceover URL validated successfully");

    // Generate scenes from script
    const renderId = await assembleVideoWithAIBackgrounds(
      supabase,
      {
        script,
        voiceoverUrl: voiceover_url,
        topic: topic || 'general content',
        duration,
      },
      job_id,
      user_id,
      aspect_ratio || '4:5',
      caption_style,
      logger
    );

    // Update job with render ID
    await supabase.from('video_jobs').update({ 
      shotstack_render_id: renderId,
      renderer: 'json2video' 
    }).eq('id', job_id);

    logger.info("Submitted to JSON2Video", { metadata: { renderId, jobId: job_id } });

    // Poll for completion
    await pollJson2VideoStatus(supabase, job_id, renderId, user_id, logger, notify_on_completion);

    return new Response(
      JSON.stringify({ success: true, job_id, render_id: renderId }),
      { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logger.error("Error in assemble-ai-video", error instanceof Error ? error : new Error(String(error)));

    // Try to update job status
    try {
      const body = await req.clone().json();
      if (body.job_id) {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );
        await supabase.from('video_jobs').update({
          status: 'awaiting_voice_approval',
          error_details: {
            message: error instanceof Error ? error.message : 'AI video assembly failed',
            timestamp: new Date().toISOString(),
            step: 'assemble_ai_video'
          },
          updated_at: new Date().toISOString()
        }).eq('id', body.job_id);
      }
    } catch {
      // Silent failure
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function assembleVideoWithAIBackgrounds(
  supabase: SupabaseClient,
  assets: {
    script: string;
    voiceoverUrl: string;
    topic: string;
    duration: number;
  },
  videoJobId: string,
  userId: string,
  aspectRatio: string = '4:5',
  captionStyle?: CaptionStyle,
  logger?: EdgeLogger
): Promise<string> {
  const json2videoApiKey = Deno.env.get('JSON2VIDEO_API_KEY');
  if (!json2videoApiKey) {
    throw new Error('JSON2VIDEO_API_KEY not configured');
  }

  // Map aspect ratio to JSON2Video resolution
  const resolutionMap: Record<string, string> = {
    '16:9': 'full-hd',
    '9:16': 'instagram-story',
    '4:5': 'instagram-feed',
    '1:1': 'squared'
  };
  const resolution = resolutionMap[aspectRatio] || 'instagram-feed';

  // Split script into scenes
  const sentences = assets.script
    .split(/(?<=[.!?])\s+/)
    .filter(s => s.trim().length > 10);
  
  const scenes: { voiceOverText: string; imagePrompt: string }[] = [];
  let currentChunk = '';
  
  for (const sentence of sentences) {
    currentChunk += (currentChunk ? ' ' : '') + sentence;
    const wordCount = currentChunk.split(/\s+/).length;
    
    if (wordCount >= 10 || sentence === sentences[sentences.length - 1]) {
      const imagePrompt = `Professional ${assets.topic} visual: ${currentChunk.slice(0, 150)}. High quality, cinematic, 4K`;
      scenes.push({
        voiceOverText: currentChunk,
        imagePrompt
      });
      currentChunk = '';
    }
  }

  if (scenes.length === 0) {
    scenes.push({
      voiceOverText: assets.script,
      imagePrompt: `Professional visual about ${assets.topic}. High quality, cinematic, 4K`
    });
  }

  logger?.info("Generated scenes for AI backgrounds", { 
    metadata: { sceneCount: scenes.length, topic: assets.topic } 
  });

  const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/json2video-webhook`;
  const uniqueRenderJobId = `video-job-${videoJobId}-${Date.now()}`;

  // Complete subtitle settings matching JSON2Video template requirements
  const subtitleSettings = captionStyle ? {
    // Transcription settings
    subtitlesModel: 'default',
    subtitleStyle: 'boxed-word',
    keywords: [],
    fontUrl: '',
    
    // Font settings
    fontFamily: captionStyle.fontFamily || 'Oswald Bold',
    fontSize: captionStyle.fontSize || 140,
    allCaps: false,
    
    // Colors
    boxColor: captionStyle.backgroundColor || '#000000',
    lineColor: captionStyle.textColor || '#FFFFFF',
    wordColor: captionStyle.textColor || '#FFFF00',
    
    // Outline and shadow
    outlineColor: '#000000',
    outlineWidth: 8,
    shadowColor: '#000000',
    shadowOffset: 0,
    
    // Position
    position: captionStyle.position === 'bottom' ? 'mid-bottom-center' : 
              captionStyle.position === 'top' ? 'mid-top-center' : 'mid-bottom-center',
    x: 0,
    y: 0,
    maxWordsPerLine: 4,
  } : {
    // Default settings when no caption style provided
    subtitlesModel: 'default',
    subtitleStyle: 'boxed-word',
    keywords: [],
    fontUrl: '',
    fontFamily: 'Oswald Bold',
    fontSize: 140,
    allCaps: false,
    boxColor: '#000000',
    lineColor: '#FFFFFF',
    wordColor: '#FFFF00',
    outlineColor: '#000000',
    outlineWidth: 8,
    shadowColor: '#000000',
    shadowOffset: 0,
    position: 'mid-bottom-center',
    x: 0,
    y: 0,
    maxWordsPerLine: 4,
  };

  logger?.info('Subtitle settings for JSON2Video', { 
    metadata: { subtitleSettings, hasCaptionStyle: !!captionStyle } 
  });

  const renderPayload = {
    template: 'hae1en4rQdJHFgFS3545',
    variables: {
      voiceModel: 'azure',
      voiceID: 'en-US-AndrewMultilingualNeural',
      audioURL: assets.voiceoverUrl,
      imageModel: 'freepik-classic',
      introText: '',
      scenes,
      ...subtitleSettings,
    },
    project: uniqueRenderJobId,
    exports: [{
      destinations: [{
        type: "webhook",
        endpoint: webhookUrl,
        "content-type": "json"
      }]
    }],
    resolution,
    quality: 'high',
    cache: true,
    draft: false,
  };

  logger?.info('Calling JSON2Video API for AI backgrounds', { 
    metadata: { sceneCount: scenes.length, resolution } 
  });

  const response = await fetch(API_ENDPOINTS.JSON2VIDEO.moviesUrl, {
    method: 'POST',
    headers: {
      'x-api-key': json2videoApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(renderPayload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger?.error('JSON2Video API error', new Error(errorText));
    throw new Error(`JSON2Video API error: ${response.status}`);
  }

  const data = await response.json();
  logger?.info('JSON2Video response', { metadata: { project: data.project } });
  
  return data.project;
}

async function pollJson2VideoStatus(
  supabase: SupabaseClient,
  jobId: string,
  projectId: string,
  userId: string,
  logger?: EdgeLogger,
  notifyOnCompletion?: boolean
) {
  const json2videoApiKey = Deno.env.get('JSON2VIDEO_API_KEY');
  if (!json2videoApiKey) {
    throw new Error('JSON2VIDEO_API_KEY not configured');
  }

  const maxAttempts = 120;
  let attempts = 0;

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 10000));

    const response = await fetch(`${API_ENDPOINTS.JSON2VIDEO.moviesUrl}?project=${projectId}`, {
      method: 'GET',
      headers: { 'x-api-key': json2videoApiKey },
    });

    if (!response.ok) {
      logger?.warn('JSON2Video status check failed', { metadata: { status: response.status } });
      attempts++;
      continue;
    }

    const data = await response.json();
    const status = data.status;

    logger?.debug('JSON2Video status', { metadata: { status, attempt: attempts } });

    if (status === 'done' && data.movie) {
      const videoUrl = data.movie;
      const videoResponse = await fetch(videoUrl);
      if (!videoResponse.ok) {
        throw new Error('Failed to download rendered video');
      }

      const videoBlob = await videoResponse.blob();
      const storagePath = `video-jobs/${userId}/${jobId}/final-video.mp4`;

      const { error: uploadError } = await supabase.storage
        .from('generations')
        .upload(storagePath, videoBlob, {
          contentType: 'video/mp4',
          upsert: true
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const { data: publicUrlData } = supabase.storage
        .from('generations')
        .getPublicUrl(storagePath);

      await supabase.from('video_jobs').update({
        status: GENERATION_STATUS.COMPLETED,
        final_video_url: publicUrlData.publicUrl,
        completed_at: new Date().toISOString()
      }).eq('id', jobId);

      logger?.info('Video completed via JSON2Video', { metadata: { jobId } });

      // Send notification if enabled
      if (notifyOnCompletion) {
        try {
          await supabase.functions.invoke('notify-generation-complete', {
            body: {
              user_id: userId,
              type: 'video_job',
              video_topic: 'AI Generated Video',
            }
          });
        } catch {
          logger?.warn('Failed to send notification');
        }
      }

      return;
    }

    if (status === 'failed' || status === 'error') {
      throw new Error(`JSON2Video rendering failed: ${data.error || 'Unknown error'}`);
    }

    attempts++;
  }

  throw new Error('JSON2Video render timeout after 20 minutes');
}
