import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";



Deno.serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);

  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('check-video-generation-status', requestId);
  const startTime = Date.now();
  
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { generation_id } = await req.json();

    if (!generation_id) {
      return new Response(
        JSON.stringify({ error: 'Missing generation_id' }),
        { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('Checking video generation status', { metadata: { generation_id } });

    // Fetch the generation
    const { data: generation, error: fetchError } = await supabase
      .from('generations')
      .select('*')
      .eq('id', generation_id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !generation) {
      return new Response(
        JSON.stringify({ error: 'Generation not found' }),
        { status: 404, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If already completed or failed, return current status
    if (generation.status === 'completed' || generation.status === 'failed') {
      logger.info('Generation already in final state', { metadata: { status: generation.status } });
      return new Response(
        JSON.stringify({ 
          status: generation.status,
          storage_path: generation.storage_path,
          output_url: generation.output_url
        }),
        { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const kieTaskId = generation.provider_task_id;
    if (!kieTaskId) {
      logger.error('No provider_task_id found', new Error('Missing task ID'));
      return new Response(
        JSON.stringify({ error: 'No task ID found for this generation' }),
        { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('Querying Kie.ai for task', { metadata: { taskId: kieTaskId } });

    // Query Kie.ai API for task status
    const kieApiKey = Deno.env.get('KIE_AI_API_KEY');
    if (!kieApiKey) {
      throw new Error('KIE_AI_API_KEY not configured');
    }

    const kieResponse = await fetch(
      `https://api.kie.ai/api/v1/mp4/record-info?taskId=${kieTaskId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${kieApiKey}`
        }
      }
    );

    const kieData = await kieResponse.json();
    logger.debug('Kie.ai response received', { metadata: { response: kieData } });

    // Check if task completed successfully
    const successFlag = kieData.data?.successFlag;
    const videoUrl = kieData.data?.response?.videoUrl;

    if (successFlag === 'SUCCESS' && videoUrl) {
      logger.info('Task completed, processing video', { metadata: { videoUrl } });

      // Download and store video
      const videoResponse = await fetch(videoUrl);
      const videoBlob = await videoResponse.arrayBuffer();

      const timestamp = Date.now();
      const fileName = `video-${generation_id}-${timestamp}.mp4`;
      const storagePath = `videos/${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('generated-content')
        .upload(storagePath, videoBlob, {
          contentType: 'video/mp4',
          upsert: false
        });

      if (uploadError) {
        logger.error('Failed to upload video', uploadError instanceof Error ? uploadError : new Error(String(uploadError) || 'Upload error'));
        throw uploadError;
      }

      // Update generation record
      const { error: updateError } = await supabase
        .from('generations')
        .update({
          status: 'completed',
          storage_path: storagePath,
          output_url: videoUrl,
          provider_response: kieData
        })
        .eq('id', generation_id);

      if (updateError) {
        logger.error('Failed to update generation', updateError instanceof Error ? updateError : new Error(String(updateError) || 'Database error'));
        throw updateError;
      }

      logger.info('Video generation recovered successfully');
      logger.logDuration('Video generation recovery', startTime);

      return new Response(
        JSON.stringify({ 
          status: 'completed',
          storage_path: storagePath,
          message: 'Video generation completed and recovered'
        }),
        { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (
      successFlag === 'CREATE_TASK_FAILED' || 
      successFlag === 'GENERATE_MP4_FAILED' ||
      kieData.data?.errorCode !== 0
    ) {
      logger.error('Task failed on Kie.ai side', new Error('Generation failed'));


      // Mark as failed and refund
      const { error: updateError } = await supabase
        .from('generations')
        .update({
          status: 'failed',
          provider_response: kieData
        })
        .eq('id', generation_id);

      if (updateError) {
        logger.error('Failed to update generation', updateError instanceof Error ? updateError : new Error(String(updateError) || 'Database error'));
      }

      // Refund credits
      await supabase.rpc('increment_tokens', {
        user_id_param: user.id,
        amount: generation.tokens_used
      });

      return new Response(
        JSON.stringify({ 
          status: 'failed',
          message: 'Video generation failed on provider side. Credits refunded.'
        }),
        { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      // Still processing
      logger.debug('Task still processing');
      return new Response(
        JSON.stringify({ 
          status: 'processing',
          message: 'Video generation is still in progress'
        }),
        { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    logger.error('Error checking video status', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
