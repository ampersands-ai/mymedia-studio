import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('recover-stuck-jobs', requestId);
  const startTime = Date.now();

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
      logger.info('Force sync requested', { metadata: { jobId: forceJobId } });
      
      const { data: job, error: jobError } = await supabaseClient
        .from('video_jobs')
        .select('*')
        .eq('id', forceJobId)
        .single();

      if (jobError || !job) {
        logger.error('Job not found for force sync', jobError instanceof Error ? jobError : new Error(jobError?.message || 'Not found'), { metadata: { jobId: forceJobId } });
        return new Response(
          JSON.stringify({ error: 'Job not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const stuckJobs = [job];
      const recoveredJobs = [];

      // Process the single job
      for (const job of stuckJobs) {
        logger.info('Starting recovery for job', { 
          metadata: { jobId: job.id, status: job.status }
        });

        try {
          if (job.status === 'assembling' && job.shotstack_render_id) {
            logger.info('Checking Shotstack render status', { 
              metadata: { 
                jobId: job.id, 
                renderId: job.shotstack_render_id 
              }
            });
            
            try {
              const shotstackResponse = await fetch(
                `https://api.shotstack.io/v1/render/${job.shotstack_render_id}`,
                { headers: { 'x-api-key': Deno.env.get('SHOTSTACK_API_KEY') ?? '' } }
              );
              
              if (shotstackResponse.ok) {
                const shotstackResult = await shotstackResponse.json();
                const renderStatus = shotstackResult?.response?.status;
                
                logger.info('Shotstack render status retrieved', { 
                  metadata: { 
                    jobId: job.id, 
                    renderStatus 
                  }
                });
                
                if (renderStatus === 'done' && shotstackResult.response.url) {
                  logger.info('Render complete, downloading video', { 
                    metadata: { jobId: job.id }
                  });
                  const videoUrl = shotstackResult.response.url;
                  
                  const videoResponse = await fetch(videoUrl);
                  if (!videoResponse.ok || !videoResponse.body) {
                    throw new Error('Failed to fetch video from Shotstack');
                  }
                  
                  const videoPath = `${job.user_id}/${new Date().toISOString().split('T')[0]}/${job.id}.mp4`;
                  const { error: uploadError } = await supabaseClient.storage
                    .from('generated-content')
                    .upload(videoPath, videoResponse.body, {
                      contentType: 'video/mp4',
                      upsert: true
                    });
                  
                  if (uploadError) {
                    logger.error('Video upload failed', uploadError, { 
                      metadata: { jobId: job.id }
                    });
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
                  
                  logger.info('Job recovered from Shotstack', { 
                    metadata: { jobId: job.id }
                  });
                  recoveredJobs.push({ id: job.id, action: 'completed_from_shotstack' });
                  continue;
                } else if (renderStatus === 'failed') {
                  await supabaseClient.from('video_jobs').update({
                    status: 'failed',
                    error_message: 'Shotstack rendering failed',
                    updated_at: new Date().toISOString()
                  }).eq('id', job.id);
                  logger.warn('Shotstack render failed', { 
                    metadata: { jobId: job.id }
                  });
                  recoveredJobs.push({ id: job.id, action: 'marked_failed_shotstack' });
                  continue;
                }
              }
            } catch (shotstackError: any) {
              logger.error('Shotstack check failed', shotstackError, { 
                metadata: { jobId: job.id }
              });
            }
          }
          
          if (job.status === 'generating_voice' && job.script && job.voiceover_url) {
            logger.info('Moving job to awaiting approval', { 
              metadata: { jobId: job.id }
            });
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
            logger.info('Retrying job from voiceover step', { 
              metadata: { jobId: job.id }
            });
            await supabaseClient.functions.invoke('process-video-job', {
              body: { job_id: job.id }
            });
            recoveredJobs.push({ id: job.id, action: 'retried_processing' });
          }
          else if (['pending', 'generating_script', 'generating_voice'].includes(job.status)) {
            logger.info('Retrying job from beginning', { 
              metadata: { jobId: job.id }
            });
            await supabaseClient.functions.invoke('process-video-job', {
              body: { job_id: job.id }
            });
            recoveredJobs.push({ id: job.id, action: 'retried_processing' });
          }
          else if (job.status !== 'assembling') {
            logger.warn('Job cannot be recovered, marking as failed', { 
              metadata: { jobId: job.id, status: job.status }
            });
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
          logger.error('Job recovery failed', err, { 
            metadata: { jobId: job.id }
          });
          recoveredJobs.push({ id: job.id, action: 'recovery_failed', error: err.message || 'Unknown error' });
        }
      }

      logger.info('Force sync recovery complete', { 
        metadata: { recoveredCount: recoveredJobs.length }
      });
      logger.logDuration('Force sync completed', startTime);

      return new Response(
        JSON.stringify({ 
          success: true, 
          recovered: recoveredJobs.length,
          jobs: recoveredJobs
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('Scanning for stuck video jobs');

    // Find jobs stuck in intermediate states for > 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: stuckJobs, error: fetchError } = await supabaseClient
      .from('video_jobs')
      .select('*')
      .in('status', ['pending', 'generating_script', 'generating_voice', 'fetching_video', 'assembling'])
      .lt('updated_at', fiveMinutesAgo)
      .order('updated_at', { ascending: true });

    if (fetchError) {
      const errorMsg = fetchError && typeof fetchError === 'object' && 'message' in fetchError ? fetchError.message : 'Database error';
      logger.error('Failed to fetch stuck jobs', fetchError instanceof Error ? fetchError : new Error(String(errorMsg)));
      throw fetchError;
    }

    if (!stuckJobs || stuckJobs.length === 0) {
      logger.info('No stuck jobs found');
      logger.logDuration('Recovery scan completed', startTime);
      return new Response(
        JSON.stringify({ 
          success: true, 
          recovered: 0,
          message: 'No stuck jobs found'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info(`Found ${stuckJobs.length} stuck job(s)`, { 
      metadata: { 
        jobIds: stuckJobs.map(j => j.id),
        statuses: stuckJobs.map(j => ({ id: j.id, status: j.status }))
      }
    });

    const recoveredJobs = [];

    for (const job of stuckJobs) {
      logger.info('Starting recovery for job', { 
        metadata: { jobId: job.id, status: job.status }
      });

      try {
        // Special handling for jobs stuck in assembling - check Shotstack status
        if (job.status === 'assembling' && job.shotstack_render_id) {
          logger.info('Checking Shotstack render status', { 
            metadata: { 
              jobId: job.id, 
              renderId: job.shotstack_render_id 
            }
          });
          
          try {
            const shotstackResponse = await fetch(
              `https://api.shotstack.io/v1/render/${job.shotstack_render_id}`,
              { headers: { 'x-api-key': Deno.env.get('SHOTSTACK_API_KEY') ?? '' } }
            );
            
            if (shotstackResponse.ok) {
              const shotstackResult = await shotstackResponse.json();
              const renderStatus = shotstackResult?.response?.status;
              
              logger.info('Shotstack render status retrieved', { 
                metadata: { 
                  jobId: job.id, 
                  renderStatus 
                }
              });
              
              if (renderStatus === 'done' && shotstackResult.response.url) {
                // Render is done, download and upload with streaming
                logger.info('Render complete, downloading video', { 
                  metadata: { jobId: job.id }
                });
                const videoUrl = shotstackResult.response.url;
                
                const videoResponse = await fetch(videoUrl);
                if (!videoResponse.ok || !videoResponse.body) {
                  throw new Error('Failed to fetch video from Shotstack');
                }
                
                // Upload using streaming (no memory buffer)
                const videoPath = `${job.user_id}/${new Date().toISOString().split('T')[0]}/${job.id}.mp4`;
                const { error: uploadError } = await supabaseClient.storage
                  .from('generated-content')
                  .upload(videoPath, videoResponse.body, {
                    contentType: 'video/mp4',
                    upsert: true
                  });
                
                if (uploadError) {
                  logger.error('Video upload failed', uploadError, { 
                    metadata: { jobId: job.id }
                  });
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
                
                logger.info('Job recovered from Shotstack', { 
                  metadata: { jobId: job.id }
                });
                recoveredJobs.push({ id: job.id, action: 'completed_from_shotstack' });
                continue;
              } else if (renderStatus === 'failed') {
                // Shotstack render failed
                await supabaseClient.from('video_jobs').update({
                  status: 'failed',
                  error_message: 'Shotstack rendering failed',
                  updated_at: new Date().toISOString()
                }).eq('id', job.id);
                logger.warn('Shotstack render failed', { 
                  metadata: { jobId: job.id }
                });
                recoveredJobs.push({ id: job.id, action: 'marked_failed_shotstack' });
                continue;
              }
              // If still rendering, leave it alone
            }
          } catch (shotstackError: any) {
            logger.error('Shotstack check failed', shotstackError, { 
              metadata: { jobId: job.id }
            });
          }
        }
        
        // Other recovery logic
        if (job.status === 'generating_voice' && job.script && job.voiceover_url) {
          logger.info('Moving job to awaiting approval', { 
            metadata: { jobId: job.id }
          });
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
          logger.info('Retrying job from voiceover step', { 
            metadata: { jobId: job.id }
          });
          await supabaseClient.functions.invoke('process-video-job', {
            body: { job_id: job.id }
          });
          recoveredJobs.push({ id: job.id, action: 'retried_processing' });
        }
        else if (['pending', 'generating_script', 'generating_voice'].includes(job.status)) {
          logger.info('Retrying job from beginning', { 
            metadata: { jobId: job.id }
          });
          await supabaseClient.functions.invoke('process-video-job', {
            body: { job_id: job.id }
          });
          recoveredJobs.push({ id: job.id, action: 'retried_processing' });
        }
        else if (job.status !== 'assembling') {
          // Unknown state (not assembling which we handled above)
          logger.warn('Job cannot be recovered, marking as failed', { 
            metadata: { jobId: job.id, status: job.status }
          });
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
        logger.error('Job recovery failed', err, { 
          metadata: { jobId: job.id }
        });
        recoveredJobs.push({ id: job.id, action: 'recovery_failed', error: err.message || 'Unknown error' });
      }
    }

    logger.info('Recovery complete', { 
      metadata: { 
        totalScanned: stuckJobs.length,
        recoveredCount: recoveredJobs.length 
      }
    });
    logger.logDuration('Recovery scan completed', startTime);

    return new Response(
      JSON.stringify({ 
        success: true, 
        recovered: recoveredJobs.length,
        jobs: recoveredJobs
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    logger.error('Fatal error in recovery', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
