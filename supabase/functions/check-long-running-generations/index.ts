import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { API_ENDPOINTS } from "../_shared/api-endpoints.ts";
import { GENERATION_STATUS } from "../_shared/constants.ts";

/**
 * Scheduled job to check long-running async generations
 * Runs every 60 seconds to poll Runware API for KlingAI Avatar models
 * 
 * This handles the case where:
 * 1. Frontend stops polling (tab closed, network issues)
 * 2. Webhook doesn't arrive (network issues, timeout)
 * 3. Real-time subscription drops
 */

const LONG_RUNNING_MODEL_PATTERNS = [
  'klingai:avatar@%',  // KlingAI Avatar models (can take 30+ minutes)
];

// Maximum age of generations to check (6 hours)
const MAX_GENERATION_AGE_HOURS = 6;

// Maximum generations to process per run (prevent timeout)
const MAX_BATCH_SIZE = 10;

Deno.serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);
  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('check-long-running-generations', requestId);
  const startTime = Date.now();

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const runwareApiKey = Deno.env.get('RUNWARE_API_KEY');
    if (!runwareApiKey) {
      throw new Error('RUNWARE_API_KEY not configured');
    }

    // Calculate cutoff time (don't check very old generations)
    const cutoffTime = new Date(Date.now() - MAX_GENERATION_AGE_HOURS * 60 * 60 * 1000).toISOString();

    logger.info('Starting long-running generation check', {
      metadata: { 
        cutoffTime,
        maxBatchSize: MAX_BATCH_SIZE,
        patterns: LONG_RUNNING_MODEL_PATTERNS
      }
    });

    // Query for pending/processing long-running generations with provider_task_id
    // Using ILIKE pattern matching for model_id
    let query = supabase
      .from('generations')
      .select('id, user_id, provider_task_id, status, model_id, created_at')
      .in('status', [GENERATION_STATUS.PENDING, GENERATION_STATUS.PROCESSING])
      .not('provider_task_id', 'is', null)
      .gte('created_at', cutoffTime)
      .order('created_at', { ascending: true })
      .limit(MAX_BATCH_SIZE);

    // Add model pattern filter - check for klingai:avatar models
    query = query.ilike('model_id', 'klingai:avatar@%');

    const { data: generations, error: queryError } = await query;

    if (queryError) {
      logger.error('Failed to query generations', queryError instanceof Error ? queryError : new Error(String(queryError)));
      throw new Error(`Database query failed: ${queryError.message}`);
    }

    if (!generations || generations.length === 0) {
      logger.info('No pending long-running generations found');
      return new Response(
        JSON.stringify({ 
          status: 'ok',
          message: 'No pending generations',
          checked: 0
        }),
        { status: 200, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('Found pending generations to check', {
      metadata: { count: generations.length }
    });

    const results: Array<{
      generation_id: string;
      status: string;
      result: string;
    }> = [];

    // Process each generation
    for (const generation of generations) {
      try {
        logger.info('Checking generation', {
          metadata: { 
            generationId: generation.id,
            taskId: generation.provider_task_id,
            model: generation.model_id
          }
        });

        // Poll Runware API for task status
        const apiUrl = API_ENDPOINTS.RUNWARE.fullUrl;
        const pollPayload = [
          { taskType: "authentication", apiKey: runwareApiKey },
          { taskType: "getResponse", taskUUID: generation.provider_task_id }
        ];

        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pollPayload),
        });

        if (!response.ok) {
          logger.warn('Runware poll failed', {
            metadata: { generationId: generation.id, status: response.status }
          });
          results.push({
            generation_id: generation.id,
            status: 'error',
            result: `API returned ${response.status}`
          });
          continue;
        }

        const result = await response.json();

        // Find task result
        let taskResult = null;
        if (result.data) {
          for (const item of result.data) {
            if (item.taskUUID === generation.provider_task_id) {
              taskResult = item;
              break;
            }
          }
        }

        // Check for errors
        if (result.errors?.length > 0) {
          const error = result.errors.find((e: { taskUUID: string }) => 
            e.taskUUID === generation.provider_task_id
          );
          if (error) {
            logger.error('Runware task failed', undefined, {
              metadata: { 
                generationId: generation.id,
                error: error.message || error.code
              }
            });

            await supabase
              .from('generations')
              .update({
                status: GENERATION_STATUS.FAILED,
                provider_response: { error: error.message || error.code }
              })
              .eq('id', generation.id);

            results.push({
              generation_id: generation.id,
              status: 'failed',
              result: error.message || error.code || 'Unknown error'
            });
            continue;
          }
        }

        // Check if complete with video URL
        if (taskResult?.status === "success" && taskResult.videoURL) {
          logger.info('Video ready - processing completion', {
            metadata: { 
              generationId: generation.id,
              videoURL: taskResult.videoURL.substring(0, 80)
            }
          });

          // Download the video
          const videoResponse = await fetch(taskResult.videoURL);
          if (!videoResponse.ok) {
            throw new Error(`Failed to download video: ${videoResponse.status}`);
          }

          const videoData = await videoResponse.arrayBuffer();
          const uint8Data = new Uint8Array(videoData);

          // Determine file extension from URL
          const urlMatch = taskResult.videoURL.match(/\.([a-z0-9]+)(?:\?|$)/i);
          const fileExtension = urlMatch ? urlMatch[1] : 'mp4';

          // Upload to storage
          const timestamp = Date.now();
          const storagePath = `${generation.user_id}/generations/${timestamp}.${fileExtension}`;

          const { error: uploadError } = await supabase.storage
            .from('generated-content')
            .upload(storagePath, uint8Data, {
              contentType: `video/${fileExtension}`,
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            logger.error('Storage upload failed', uploadError instanceof Error ? uploadError : new Error(String(uploadError)));
            results.push({
              generation_id: generation.id,
              status: 'error',
              result: `Storage upload failed: ${uploadError.message}`
            });
            continue;
          }

          // Generate signed URL for output_url
          const { data: signedData } = await supabase.storage
            .from('generated-content')
            .createSignedUrl(storagePath, 3600 * 24);

          // Update generation record
          await supabase
            .from('generations')
            .update({
              status: GENERATION_STATUS.COMPLETED,
              storage_path: storagePath,
              output_url: signedData?.signedUrl,
              file_size_bytes: uint8Data.length,
              completed_at: new Date().toISOString(),
              provider_response: taskResult
            })
            .eq('id', generation.id);

          logger.info('Generation completed successfully', {
            metadata: { 
              generationId: generation.id,
              storagePath,
              fileSize: uint8Data.length
            }
          });

          results.push({
            generation_id: generation.id,
            status: 'completed',
            result: storagePath
          });

          // Trigger completion notification
          try {
            await supabase.functions.invoke('notify-generation-complete', {
              body: {
                generation_id: generation.id,
                user_id: generation.user_id,
                generation_duration_seconds: Math.floor((Date.now() - new Date(generation.created_at).getTime()) / 1000),
                type: 'generation'
              }
            });
          } catch (notifyError) {
            logger.warn('Failed to send completion notification', {
              metadata: { generationId: generation.id }
            });
          }
        } else {
          // Still processing
          results.push({
            generation_id: generation.id,
            status: 'processing',
            result: 'Still in progress'
          });
        }

      } catch (genError) {
        logger.error('Error processing generation', genError instanceof Error ? genError : new Error(String(genError)), {
          metadata: { generationId: generation.id }
        });
        results.push({
          generation_id: generation.id,
          status: 'error',
          result: genError instanceof Error ? genError.message : String(genError)
        });
      }
    }

    const duration = Date.now() - startTime;
    const completed = results.filter(r => r.status === 'completed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const processing = results.filter(r => r.status === 'processing').length;

    logger.info('Long-running generation check completed', {
      duration,
      metadata: { 
        total: results.length,
        completed,
        failed,
        processing
      }
    });

    return new Response(
      JSON.stringify({
        status: 'ok',
        checked: results.length,
        completed,
        failed,
        processing,
        results,
        duration_ms: duration
      }),
      { status: 200, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error('Fatal error in check-long-running-generations', error instanceof Error ? error : new Error(String(error)));
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
