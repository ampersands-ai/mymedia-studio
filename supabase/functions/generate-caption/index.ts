import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { createSafeErrorResponse } from "../_shared/error-handler.ts";
import {
  GenerateCaptionRequestSchema,
  CaptionResponseSchema,
  AIToolCallSchema,
  type GenerateCaptionRequest,
  type CaptionResponse
} from "../_shared/schemas.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CAPTION_COST = 0.1; // 0.1 credits per caption generation

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const logger = new EdgeLogger('generate-caption', requestId, supabase, true);

    // Validate request body with Zod
    const requestBody = await req.json();
    const validatedRequest: GenerateCaptionRequest = GenerateCaptionRequestSchema.parse(requestBody);
    const { generation_id, video_job_id, prompt, content_type, model_name } = validatedRequest;

    logger.info('Caption generation started', {
      metadata: { 
        generation_id, 
        video_job_id, 
        content_type,
        prompt_length: prompt.length 
      }
    });

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check and deduct credits
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('tokens_remaining')
      .eq('user_id', user.id)
      .single();

    if (subError || !subscription) {
      throw new Error('Failed to fetch user subscription');
    }

    if (subscription.tokens_remaining < CAPTION_COST) {
      throw new Error(`Insufficient credits. ${CAPTION_COST} credits required for caption generation.`);
    }

    // Deduct credits atomically with row count verification
    const { data: updateResult, error: deductError } = await supabase
      .from('user_subscriptions')
      .update({ tokens_remaining: subscription.tokens_remaining - CAPTION_COST })
      .eq('user_id', user.id)
      .eq('tokens_remaining', subscription.tokens_remaining)
      .select('tokens_remaining');

    if (deductError) {
      logger.error('Credit deduction failed', deductError, { userId: user.id });
      throw new Error('Failed to deduct credits - database error');
    }

    if (!updateResult || updateResult.length === 0) {
      logger.error('Optimistic lock failed - concurrent update', undefined, {
        userId: user.id,
        metadata: { expected_tokens: subscription.tokens_remaining, cost: CAPTION_COST }
      });
      throw new Error('Failed to deduct credits - concurrent update detected. Please retry.');
    }

    logger.info('Credits deducted for caption', {
      userId: user.id,
      metadata: { 
        tokens_deducted: CAPTION_COST,
        new_balance: updateResult[0]?.tokens_remaining 
      }
    });

    // Log to audit_logs
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'tokens_deducted',
      metadata: {
        tokens_deducted: CAPTION_COST,
        tokens_remaining: updateResult[0]?.tokens_remaining,
        generation_id,
        video_job_id,
        operation: 'caption_generation'
      }
    });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `You are a social media expert. Generate a captivating caption and 15 popular hashtags that describe the ${content_type === 'video' ? 'video' : 'image'} content.

Content Type: ${content_type}
What the ${content_type === 'video' ? 'video' : 'image'} shows: ${prompt}

Create a caption (150-280 characters, 2-3 complete sentences) that:
- CRITICAL: Caption MUST end with proper punctuation (. ! or ?)
- NO incomplete thoughts or cut-off sentences
- Describes what's actually IN the ${content_type === 'video' ? 'video' : 'image'}
- Is engaging and works well on Instagram, Twitter, TikTok, or other social media
- Does NOT mention AI, models, or the generation process
- Focuses on the visual content and subject matter

Make the hashtags relevant to:
- The actual subject matter in the ${content_type === 'video' ? 'video' : 'image'}
- Popular related topics
- Niche-specific content categories
- Current trends related to the content

IMPORTANT: Each hashtag MUST include the # symbol (e.g., #Fashion, #Style).`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        max_completion_tokens: 250,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Generate a captivating caption and exactly 15 popular hashtags for this content.' }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_caption_hashtags",
              description: "Generate a social media caption and hashtags",
              parameters: {
                type: "object",
                properties: {
                  caption: { 
                    type: "string",
                    description: "2-3 sentence engaging caption"
                  },
                  hashtags: {
                    type: "array",
                    items: { type: "string" },
                    minItems: 15,
                    maxItems: 15,
                    description: "Exactly 15 hashtags WITH # symbol (e.g., #Fashion)"
                  }
                },
                required: ["caption", "hashtags"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_caption_hashtags" } }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Lovable AI request failed', undefined, {
        metadata: { status: response.status, error: errorText }
      });
      throw new Error(`AI generation failed: ${response.status}`);
    }

    const data = await response.json();
    logger.debug('AI response received', { metadata: { has_tool_calls: Boolean(data.choices?.[0]?.message?.tool_calls) } });

    // Validate tool call structure
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      logger.error('No tool call in AI response', undefined, { metadata: { response: JSON.stringify(data) } });
      throw new Error('AI did not return expected tool call format');
    }

    const validatedToolCall = AIToolCallSchema.parse(toolCall);
    const result = JSON.parse(validatedToolCall.function.arguments);

    // Validate caption and hashtags with Zod
    const validatedResult: CaptionResponse = CaptionResponseSchema.parse(result);
    const { caption, hashtags } = validatedResult;

    logger.info('Caption validation passed', {
      metadata: { 
        caption_length: caption.length,
        hashtags_count: hashtags.length 
      }
    });

    // Ensure all hashtags have # symbol (Zod validates they start with #)
    const formattedHashtags = hashtags.map(tag => 
      tag.startsWith('#') ? tag : `#${tag}`
    );

    // Update the generation or video_job record

    const now = new Date().toISOString();
    const updateData = {
      ai_caption: caption,
      ai_hashtags: formattedHashtags,
      caption_generated_at: now
    };

    let updateError;
    if (video_job_id) {
      const result = await supabase
        .from('video_jobs')
        .update(updateData)
        .eq('id', video_job_id);
      updateError = result.error;
      logger.info('Caption saved to video job', { metadata: { video_job_id } });
    } else {
      const result = await supabase
        .from('generations')
        .update(updateData)
        .eq('id', generation_id);
      updateError = result.error;
      logger.info('Caption saved to generation', { metadata: { generation_id } });
    }

    if (updateError) {
      logger.error('Database update failed', updateError);
      throw new Error('Failed to save caption to database');
    }

    logger.logDuration('Caption generation completed', startTime, {
      metadata: { 
        generation_id,
        video_job_id,
        caption_length: caption.length
      }
    });

    return new Response(
      JSON.stringify({
        caption,
        hashtags: formattedHashtags,
        generated_at: now
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return createSafeErrorResponse(error, 'generate-caption', corsHeaders);
  }
});
