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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check for force sync of specific job via query param
    const url = new URL(req.url);
    const forceJobId = url.searchParams.get('job_id');

    if (forceJobId) {
      console.log(`[Force Sync] Processing specific job: ${forceJobId}`);
      
      const { data: job, error: jobError } = await supabaseClient
        .from('video_jobs')
        .select('*')
        .eq('id', forceJobId)
        .single();

      if (jobError || !job) {
        return new Response(
          JSON.stringify({ error: 'Job not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const stuckJobs = [job];
      const recoveredJobs = [];

      // Process the single job (copy logic from below)
      for (const job of stuckJobs) {
        console.log(`Recovering job ${job.id} (status: ${job.status})`);

        try {
          if (job.status === 'assembling' && job.shotstack_render_id) {
            console.log(`Job ${job.id}: Checking Shotstack status for render ${job.shotstack_render_id}`);
            
            try {
              const shotstackResponse = await fetch(
                `https://api.shotstack.io/v1/render/${job.shotstack_render_id}`,
                { headers: { 'x-api-key': Deno.env.get('SHOTSTACK_API_KEY') ?? '' } }
              );
              
              if (shotstackResponse.ok) {
                const shotstackResult = await shotstackResponse.json();
                const renderStatus = shotstackResult?.response?.status;
                
                console.log(`Shotstack render ${job.shotstack_render_id} status: ${renderStatus}`);
                
                if (renderStatus === 'done' && shotstackResult.response.url) {
                  console.log(`Job ${job.id}: Render complete, downloading video with streaming`);
                  const videoUrl = shotstackResult.response.url;
                  
                  const videoResponse = await fetch(videoUrl);
                  if (!videoResponse.ok || !videoResponse.body) {
                    throw new Error('Failed to fetch video from Shotstack');
                  }
                  
                  const videoPath = `${job.user_id}/${new Date().toISOString().split('T')[0]}/${job.id}.mp4`;
                  const { error: uploadError } = await supabaseClient.storage
                    .from('video-assets')
                    .upload(videoPath, videoResponse.body, {
                      contentType: 'video/mp4',
                      upsert: true
                    });
                  
                  if (uploadError) {
                    console.error(`Job ${job.id}: Upload error:`, uploadError);
                    throw uploadError;
                  }
                  
                  await supabaseClient.from('generations').insert({
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
                      video_job_id: job.id
                    }
                  });
                  
                  await supabaseClient.from('video_jobs').update({
                    status: 'completed',
                    final_video_url: videoUrl,
                    completed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  }).eq('id', job.id);
                  
                  recoveredJobs.push({ id: job.id, action: 'completed_from_shotstack' });
                  continue;
                } else if (renderStatus === 'failed') {
                  await supabaseClient.from('video_jobs').update({
                    status: 'failed',
                    error_message: 'Shotstack rendering failed',
                    updated_at: new Date().toISOString()
                  }).eq('id', job.id);
                  recoveredJobs.push({ id: job.id, action: 'marked_failed_shotstack' });
                  continue;
                }
              }
            } catch (shotstackError: any) {
              console.error(`Job ${job.id}: Shotstack check failed:`, shotstackError);
            }
          }
          
          if (job.status === 'generating_voice' && job.script && job.voiceover_url) {
            console.log(`Job ${job.id}: Moving to awaiting_approval`);
            await supabaseClient
              .from('video_jobs')
              .update({ 
                status: 'awaiting_approval',
                updated_at: new Date().toISOString()
              })
              .eq('id', job.id);
            recoveredJobs.push({ id: job.id, action: 'moved_to_approval' });
          } 
          else if (job.status === 'generating_script' && job.script) {
            console.log(`Job ${job.id}: Script exists, retrying from voiceover`);
            await supabaseClient.functions.invoke('process-video-job', {
              body: { job_id: job.id }
            });
            recoveredJobs.push({ id: job.id, action: 'retried_processing' });
          }
          else if (['pending', 'generating_script', 'generating_voice'].includes(job.status)) {
            console.log(`Job ${job.id}: Retrying from beginning`);
            await supabaseClient.functions.invoke('process-video-job', {
              body: { job_id: job.id }
            });
            recoveredJobs.push({ id: job.id, action: 'retried_processing' });
          }
          else if (job.status !== 'assembling') {
            console.log(`Job ${job.id}: Cannot recover, marking as failed`);
            await supabaseClient
              .from('video_jobs')
              .update({ 
                status: 'failed',
                error_message: `Auto-failed: stuck in ${job.status} for >5 minutes`,
                updated_at: new Date().toISOString()
              })
              .eq('id', job.id);
            recoveredJobs.push({ id: job.id, action: 'marked_failed' });
          }
        } catch (err: any) {
          console.error(`Failed to recover job ${job.id}:`, err);
          recoveredJobs.push({ id: job.id, action: 'recovery_failed', error: err.message || 'Unknown error' });
        }
      }

      console.log('Recovery complete:', recoveredJobs);

      return new Response(
        JSON.stringify({ 
          success: true, 
          recovered: recoveredJobs.length,
          jobs: recoveredJobs
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Scanning for stuck video jobs...');

    // Find jobs stuck in intermediate states for > 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: stuckJobs, error: fetchError } = await supabaseClient
      .from('video_jobs')
      .select('*')
      .in('status', ['pending', 'generating_script', 'generating_voice', 'fetching_video', 'assembling'])
      .lt('updated_at', fiveMinutesAgo)
      .order('updated_at', { ascending: true });

    if (fetchError) {
      throw fetchError;
    }

    if (!stuckJobs || stuckJobs.length === 0) {
      console.log('No stuck jobs found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          recovered: 0,
          message: 'No stuck jobs found'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${stuckJobs.length} stuck jobs:`, stuckJobs.map(j => ({
      id: j.id,
      status: j.status,
      updated_at: j.updated_at
    })));

    const recoveredJobs = [];

    for (const job of stuckJobs) {
      console.log(`Recovering job ${job.id} (status: ${job.status})`);

      try {
        // Special handling for jobs stuck in assembling - check Shotstack status
        if (job.status === 'assembling' && job.shotstack_render_id) {
          console.log(`Job ${job.id}: Checking Shotstack status for render ${job.shotstack_render_id}`);
          
          try {
            const shotstackResponse = await fetch(
              `https://api.shotstack.io/v1/render/${job.shotstack_render_id}`,
              { headers: { 'x-api-key': Deno.env.get('SHOTSTACK_API_KEY') ?? '' } }
            );
            
            if (shotstackResponse.ok) {
              const shotstackResult = await shotstackResponse.json();
              const renderStatus = shotstackResult?.response?.status;
              
              console.log(`Shotstack render ${job.shotstack_render_id} status: ${renderStatus}`);
              
              if (renderStatus === 'done' && shotstackResult.response.url) {
                // Render is done, download and upload with streaming
                console.log(`Job ${job.id}: Render complete, downloading video with streaming`);
                const videoUrl = shotstackResult.response.url;
                
                const videoResponse = await fetch(videoUrl);
                if (!videoResponse.ok || !videoResponse.body) {
                  throw new Error('Failed to fetch video from Shotstack');
                }
                
                // Upload using streaming (no memory buffer)
                const videoPath = `${job.user_id}/${new Date().toISOString().split('T')[0]}/${job.id}.mp4`;
                const { error: uploadError } = await supabaseClient.storage
                  .from('video-assets')
                  .upload(videoPath, videoResponse.body, {
                    contentType: 'video/mp4',
                    upsert: true
                  });
                
                if (uploadError) {
                  console.error(`Job ${job.id}: Upload error:`, uploadError);
                  throw uploadError;
                }
                
                // Create generation record
                await supabaseClient.from('generations').insert({
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
                    video_job_id: job.id
                  }
                });
                
                // Mark job as completed
                await supabaseClient.from('video_jobs').update({
                  status: 'completed',
                  final_video_url: videoUrl,
                  completed_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }).eq('id', job.id);
                
                recoveredJobs.push({ id: job.id, action: 'completed_from_shotstack' });
                continue;
              } else if (renderStatus === 'failed') {
                // Shotstack render failed
                await supabaseClient.from('video_jobs').update({
                  status: 'failed',
                  error_message: 'Shotstack rendering failed',
                  updated_at: new Date().toISOString()
                }).eq('id', job.id);
                recoveredJobs.push({ id: job.id, action: 'marked_failed_shotstack' });
                continue;
              }
              // If still rendering, leave it alone
            }
          } catch (shotstackError: any) {
            console.error(`Job ${job.id}: Shotstack check failed:`, shotstackError);
          }
        }
        
        // Other recovery logic
        if (job.status === 'generating_voice' && job.script && job.voiceover_url) {
          console.log(`Job ${job.id}: Moving to awaiting_approval`);
          await supabaseClient
            .from('video_jobs')
            .update({ 
              status: 'awaiting_approval',
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id);
          recoveredJobs.push({ id: job.id, action: 'moved_to_approval' });
        } 
        else if (job.status === 'generating_script' && job.script) {
          console.log(`Job ${job.id}: Script exists, retrying from voiceover`);
          await supabaseClient.functions.invoke('process-video-job', {
            body: { job_id: job.id }
          });
          recoveredJobs.push({ id: job.id, action: 'retried_processing' });
        }
        else if (['pending', 'generating_script', 'generating_voice'].includes(job.status)) {
          console.log(`Job ${job.id}: Retrying from beginning`);
          await supabaseClient.functions.invoke('process-video-job', {
            body: { job_id: job.id }
          });
          recoveredJobs.push({ id: job.id, action: 'retried_processing' });
        }
        else if (job.status !== 'assembling') {
          // Unknown state (not assembling which we handled above)
          console.log(`Job ${job.id}: Cannot recover, marking as failed`);
          await supabaseClient
            .from('video_jobs')
            .update({ 
              status: 'failed',
              error_message: `Auto-failed: stuck in ${job.status} for >5 minutes`,
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id);
          recoveredJobs.push({ id: job.id, action: 'marked_failed' });
        }
      } catch (err: any) {
        console.error(`Failed to recover job ${job.id}:`, err);
        recoveredJobs.push({ id: job.id, action: 'recovery_failed', error: err.message || 'Unknown error' });
      }
    }

    console.log('Recovery complete:', recoveredJobs);

    return new Response(
      JSON.stringify({ 
        success: true, 
        recovered: recoveredJobs.length,
        jobs: recoveredJobs
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in recover-stuck-jobs:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
