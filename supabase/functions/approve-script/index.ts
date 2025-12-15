import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from '../_shared/edge-logger.ts';
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  let job_id: string | undefined;

  try {
    const { job_id: jobIdParam, edited_script, voiceover_tier } = await req.json();
    job_id = jobIdParam;

    if (!job_id) {
      throw new Error('job_id is required');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    const logger = new EdgeLogger('approve-script', requestId, supabaseClient, true);

    // Authenticate user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      logger.error('Authentication failed', authError || undefined);
      throw new Error('Unauthorized');
    }

    // Fetch job and verify ownership
    const { data: job, error: fetchError } = await supabaseClient
      .from('video_jobs')
      .select('*')
      .eq('id', job_id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !job) {
      throw new Error('Job not found or access denied');
    }

    // Allow retry if job is stuck in generating_voice (e.g., previous timeout)
    const allowedStatuses = ['awaiting_script_approval', 'awaiting_voice_approval', 'generating_voice'];
    if (!allowedStatuses.includes(job.status)) {
      throw new Error(
        `Job is in ${job.status} status, expected one of: ${allowedStatuses.join(', ')}`
      );
    }

    const finalScript = edited_script || job.script;
    if (!finalScript) {
      throw new Error('No script available');
    }

    logger.info('Processing approve-script request', {
      userId: user.id,
      metadata: { jobId: job_id, status: job.status, hasEditedScript: !!edited_script }
    });

    // If regenerating voiceover (edited_script provided), calculate and deduct tokens
    if (edited_script && edited_script !== job.script) {
      const voiceoverCost = Math.ceil((edited_script.length / 1000) * 144);
      logger.info('Regenerating voiceover', {
        userId: user.id,
        metadata: { jobId: job_id, cost: voiceoverCost, scriptLength: edited_script.length }
      });

      // Check token balance
      const { data: subscription, error: subError } = await supabaseClient
        .from('user_subscriptions')
        .select('tokens_remaining')
        .eq('user_id', user.id)
        .single();

      if (subError || !subscription) {
        throw new Error('Could not fetch subscription data');
      }

      if (subscription.tokens_remaining < voiceoverCost) {
        throw new Error(`Insufficient credits. ${voiceoverCost} credits required to regenerate voiceover.`);
      }

      // Deduct tokens using atomic RPC function (avoids floating-point precision issues)
      const { data: rpcResult, error: rpcError } = await supabaseClient
        .rpc('deduct_user_tokens', { 
          p_user_id: user.id, 
          p_cost: voiceoverCost 
        });

      if (rpcError) {
        logger.error('Token deduction RPC failed', rpcError instanceof Error ? rpcError : undefined, {
          userId: user.id,
          metadata: { jobId: job_id, cost: voiceoverCost }
        });
        throw new Error('Failed to deduct tokens - please try again');
      }

      const deductResult = rpcResult?.[0];
      if (!deductResult?.success) {
        logger.error('Token deduction failed', undefined, {
          userId: user.id,
          metadata: { jobId: job_id, cost: voiceoverCost, reason: deductResult?.error_message }
        });
        throw new Error(deductResult?.error_message || 'Failed to deduct tokens');
      }

      const newBalance = deductResult.tokens_remaining;

      logger.info('Tokens deducted successfully for voiceover regeneration', {
        userId: user.id,
        metadata: { 
          jobId: job_id, 
          tokensDeducted: voiceoverCost,
          new_balance: newBalance 
        }
      });

      // Log to audit_logs
      await supabaseClient.from('audit_logs').insert({
        user_id: user.id,
        action: 'tokens_deducted',
        metadata: {
          tokens_deducted: voiceoverCost,
          tokens_remaining: newBalance,
          video_job_id: job_id,
          operation: 'voiceover_regeneration'
        }
      });
    }

    logger.info('Generating voiceover', {
      userId: user.id,
      metadata: { jobId: job_id, scriptLength: finalScript.length }
    });

    // Update status to generating_voice
    await supabaseClient
      .from('video_jobs')
      .update({ 
        status: 'generating_voice',
        script: finalScript,
        updated_at: new Date().toISOString()
      })
      .eq('id', job_id);

    // ========================================================================
    // VOICEOVER GENERATION VIA KIE.AI (NOT DIRECT ELEVENLABS)
    // Routes through generate-content edge function like Audio Studio models
    // ========================================================================
    
    // Determine model based on voiceover tier
    // Standard: ElevenLabs Turbo V2.5 (fast) with English language
    // Pro: ElevenLabs Multilingual V2 (higher quality, no language_code param)
    const tier = voiceover_tier || 'standard';
    
    // Model configs matching ElevenLabs_Fast.ts and ElevenLabs_TTS.ts
    const MODEL_CONFIGS = {
      standard: {
        modelId: "elevenlabs/text-to-speech-turbo-2-5",
        recordId: "379f8945-bd7f-48f3-a1bb-9d2e2413234c",
        modelName: "ElevenLabs Turbo V2.5",
        provider: "kie_ai",
        contentType: "prompt_to_audio",
        use_api_key: "KIE_AI_API_KEY_PROMPT_TO_AUDIO",
        apiEndpoint: "/api/v1/jobs/createTask",
        payloadStructure: "wrapper",
        baseCreditCost: 0, // Cost already handled by video job, not double-charged
        estimatedTimeSeconds: 15,
      },
      pro: {
        modelId: "elevenlabs/text-to-speech-multilingual-v2",
        recordId: "45fc7e71-0174-48eb-998d-547e8d2476db",
        modelName: "ElevenLabs Multilingual V2",
        provider: "kie_ai",
        contentType: "prompt_to_audio",
        use_api_key: "KIE_AI_API_KEY_PROMPT_TO_AUDIO",
        apiEndpoint: "/api/v1/jobs/createTask",
        payloadStructure: "wrapper",
        baseCreditCost: 0, // Cost already handled by video job, not double-charged
        estimatedTimeSeconds: 30,
      }
    };

    const modelConfig = tier === 'pro' ? MODEL_CONFIGS.pro : MODEL_CONFIGS.standard;

    logger.info('Voiceover configuration via Kie.ai', {
      userId: user.id,
      metadata: { jobId: job_id, tier, modelId: modelConfig.modelId, voiceName: job.voice_name }
    });

    // Prepare payload matching ElevenLabs model files (preparePayload format)
    const inputPayload: Record<string, unknown> = {
      text: finalScript,
      voice: job.voice_name || 'Brian', // Voice NAME not ID
      stability: 0.5,
      similarity_boost: 0.75,
    };

    // Only add language_code for Turbo V2.5 (standard tier)
    // Multilingual V2 (pro) does NOT support language_code parameter
    if (tier === 'standard') {
      inputPayload.language_code = 'en';
    }

    const customParameters = {
      model: modelConfig.modelId,
      input: inputPayload,
    };

    // Create a generation record to track the voiceover
    // Store video_job_id in settings so webhook can link them
    const { data: generation, error: genInsertError } = await supabaseClient
      .from('generations')
      .insert({
        user_id: user.id,
        prompt: finalScript,
        model_id: modelConfig.modelId,
        model_record_id: modelConfig.recordId,
        type: 'audio',
        status: 'processing',
        tokens_used: 0, // Voiceover cost already handled above if regenerating
        settings: {
          video_job_id: job_id, // Link back to video job for webhook
          voice_name: job.voice_name,
          tier: tier,
        },
      })
      .select('id')
      .single();

    if (genInsertError || !generation) {
      logger.error('Failed to create generation record', genInsertError instanceof Error ? genInsertError : undefined, {
        userId: user.id,
        metadata: { jobId: job_id }
      });
      throw new Error(`Failed to create generation record: ${genInsertError?.message}`);
    }

    logger.info('Generation record created for voiceover', {
      userId: user.id,
      metadata: { jobId: job_id, generationId: generation.id }
    });

    // Call generate-content edge function (routes through Kie.ai)
    const { error: functionError } = await supabaseClient.functions.invoke('generate-content', {
      body: {
        generationId: generation.id,
        prompt: finalScript,
        custom_parameters: customParameters,
        model_config: modelConfig,
        model_schema: {
          type: "object",
          properties: {
            text: { type: "string" },
            voice: { type: "string" },
            stability: { type: "number" },
            similarity_boost: { type: "number" },
            language_code: { type: "string" },
          }
        },
      },
    });

    if (functionError) {
      logger.error('generate-content failed', functionError instanceof Error ? functionError : undefined, {
        userId: user.id,
        metadata: { jobId: job_id, generationId: generation.id }
      });
      
      // Mark generation as failed
      await supabaseClient
        .from('generations')
        .update({ status: 'failed' })
        .eq('id', generation.id);
      
      // Update job back to awaiting_script_approval so user can retry
      await supabaseClient
        .from('video_jobs')
        .update({ 
          status: 'awaiting_script_approval',
          error_message: `Voiceover generation failed: ${functionError.message}. Please try again.`,
          updated_at: new Date().toISOString()
        })
        .eq('id', job_id);
      
      throw new Error(`Voiceover generation failed: ${functionError.message}`);
    }

    logger.logDuration('approve-script submitted to Kie.ai', startTime, {
      userId: user.id,
      metadata: { jobId: job_id, generationId: generation.id, status: 'generating_voice' }
    });

    // Return immediately - webhook will handle completion and update video_jobs
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Voiceover generation started',
        status: 'generating_voice',
        generationId: generation.id
      }),
      { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const logger = new EdgeLogger('approve-script', requestId, supabaseClient, true);

    logger.error('approve-script failed', errorObj, { metadata: { jobId: job_id, errorMessage: errorObj.message } });

    return new Response(
      JSON.stringify({ error: errorObj.message || 'Unknown error' }),
      { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  }
});