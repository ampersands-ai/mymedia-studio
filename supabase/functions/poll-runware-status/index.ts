import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { API_ENDPOINTS } from "../_shared/api-endpoints.ts";
import { GENERATION_STATUS } from "../_shared/constants.ts";

/**
 * Poll Runware API for long-running task status
 * Used for models like KlingAI Avatar that can take up to 30 minutes
 */

Deno.serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);
  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('poll-runware-status', requestId);
  const startTime = Date.now();

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  try {
    const { generation_id, task_id } = await req.json();
    
    if (!generation_id && !task_id) {
      logger.warn('Missing required parameters');
      return new Response(
        JSON.stringify({ error: 'Missing generation_id or task_id' }),
        { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const runwareApiKey = Deno.env.get('RUNWARE_API_KEY');
    if (!runwareApiKey) {
      throw new Error('RUNWARE_API_KEY not configured');
    }

    // Get generation details if generation_id provided
    let taskIdToQuery = task_id;
    let generation: { 
      id: string; 
      user_id: string; 
      provider_task_id?: string; 
      status: string;
      model_id?: string;
    } | null = null;

    if (generation_id) {
      logger.info('Fetching generation details', {
        metadata: { generationId: generation_id }
      });

      const { data, error } = await supabase
        .from('generations')
        .select('id, user_id, provider_task_id, status, model_id')
        .eq('id', generation_id)
        .maybeSingle();

      if (error || !data) {
        logger.error('Generation not found', error instanceof Error ? error : undefined, {
          metadata: { generationId: generation_id }
        });
        throw new Error('Generation not found');
      }

      generation = data;
      taskIdToQuery = data.provider_task_id;
    }

    if (!taskIdToQuery) {
      logger.warn('No task ID available');
      return new Response(
        JSON.stringify({ error: 'No task ID found for this generation' }),
        { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('Polling Runware for task status', {
      metadata: { taskUUID: taskIdToQuery, generationId: generation_id }
    });

    // Poll Runware API
    const apiUrl = API_ENDPOINTS.RUNWARE.fullUrl;
    const pollPayload = [
      { taskType: "authentication", apiKey: runwareApiKey },
      { taskType: "getResponse", taskUUID: taskIdToQuery }
    ];

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pollPayload),
    });

    if (!response.ok) {
      logger.error('Runware poll request failed', undefined, {
        metadata: { status: response.status }
      });
      return new Response(
        JSON.stringify({ 
          status: 'processing',
          message: 'Unable to check status, please try again'
        }),
        { status: 200, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    logger.info('Runware poll response received', { metadata: { taskUUID: taskIdToQuery } });

    // Check for task result
    let taskResult = null;
    if (result.data) {
      for (const item of result.data) {
        if (item.taskUUID === taskIdToQuery) {
          taskResult = item;
          break;
        }
      }
    }

    // Check for errors
    if (result.errors?.length > 0) {
      const error = result.errors.find((e: { taskUUID: string }) => e.taskUUID === taskIdToQuery);
      if (error) {
        logger.error('Runware task failed', undefined, {
          metadata: { error: error.message || error.code, taskUUID: taskIdToQuery }
        });

        if (generation) {
          await supabase
            .from('generations')
            .update({
              status: GENERATION_STATUS.FAILED,
              provider_response: { error: error.message || error.code }
            })
            .eq('id', generation.id);
        }

        return new Response(
          JSON.stringify({ 
            status: 'failed',
            error: error.message || error.code || 'Unknown error'
          }),
          { status: 200, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check if complete with video URL
    if (taskResult?.status === "success" && taskResult.videoURL) {
      logger.info('Video ready - downloading and storing', {
        metadata: { videoURL: taskResult.videoURL.substring(0, 80), taskUUID: taskIdToQuery }
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
      const storagePath = `${generation?.user_id || 'system'}/generations/${timestamp}.${fileExtension}`;

      const { error: uploadError } = await supabase.storage
        .from('generated-content')
        .upload(storagePath, uint8Data, {
          contentType: `video/${fileExtension}`,
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        logger.error('Failed to upload video to storage', uploadError instanceof Error ? uploadError : new Error(String(uploadError)));
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      // Generate signed URL
      const { data: signedData } = await supabase.storage
        .from('generated-content')
        .createSignedUrl(storagePath, 3600 * 24);

      // Update generation record with timing data
      if (generation) {
        // Fetch api_call_started_at to calculate timing
        const { data: genData } = await supabase
          .from('generations')
          .select('created_at, api_call_started_at')
          .eq('id', generation.id)
          .single();
        
        const completedAt = new Date().toISOString();
        const completedAtMs = Date.now();
        
        // Calculate timing durations
        let setupDurationMs: number | null = null;
        let apiDurationMs: number | null = null;
        
        if (genData) {
          const createdAtMs = new Date(genData.created_at).getTime();
          const apiCallStartedAtMs = genData.api_call_started_at 
            ? new Date(genData.api_call_started_at).getTime() 
            : null;
          
          if (apiCallStartedAtMs) {
            setupDurationMs = apiCallStartedAtMs - createdAtMs;
            apiDurationMs = completedAtMs - apiCallStartedAtMs;
          } else {
            // If no api_call_started_at, use total time as api time
            apiDurationMs = completedAtMs - createdAtMs;
          }
        }
        
        await supabase
          .from('generations')
          .update({
            status: GENERATION_STATUS.COMPLETED,
            storage_path: storagePath,
            output_url: signedData?.signedUrl,
            file_size_bytes: uint8Data.length,
            completed_at: completedAt,
            setup_duration_ms: setupDurationMs,
            api_duration_ms: apiDurationMs,
            provider_response: taskResult
          })
          .eq('id', generation.id);
        
        logger.info('Timing data saved', {
          metadata: { generationId: generation.id, setupDurationMs, apiDurationMs }
        });
      }

      const duration = Date.now() - startTime;
      logger.info('Runware task completed successfully', {
        duration,
        metadata: { 
          generationId: generation?.id,
          storagePath,
          fileSize: uint8Data.length
        }
      });

      return new Response(
        JSON.stringify({
          status: 'completed',
          storage_path: storagePath,
          output_url: signedData?.signedUrl,
          file_size: uint8Data.length
        }),
        { status: 200, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Still processing
    if (taskResult?.status === GENERATION_STATUS.PROCESSING || !taskResult) {
      logger.info('Task still processing', {
        metadata: { taskUUID: taskIdToQuery }
      });

      return new Response(
        JSON.stringify({
          status: 'processing',
          message: 'Generation in progress, please check again later'
        }),
        { status: 200, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Unknown status
    logger.warn('Unknown task status', {
      metadata: { taskUUID: taskIdToQuery, status: taskResult?.status }
    });

    return new Response(
      JSON.stringify({
        status: taskResult?.status || 'unknown',
        message: 'Unexpected status, please try again'
      }),
      { status: 200, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error('Fatal error in poll-runware-status', error instanceof Error ? error : new Error(String(error)));
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
