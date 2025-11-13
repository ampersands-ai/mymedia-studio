import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { EdgeLogger } from '../_shared/edge-logger.ts';
import { HttpClients } from '../_shared/http-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  const logger = new EdgeLogger('enhance-prompt', requestId, supabase, true);

  try {
    const { prompt, category } = await req.json();

    if (!prompt) {
      logger.warn('Missing prompt in request');
      return new Response(
        JSON.stringify({ error: 'Missing required field: prompt' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      logger.warn('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      logger.error('Authentication failed', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('Prompt enhancement request', { userId: user.id, metadata: { category } });

    // Check user credits
    const ENHANCEMENT_COST = 0.1;
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('tokens_remaining')
      .eq('user_id', user.id)
      .single();

    if (subError) {
      logger.error('Error fetching subscription', subError, { userId: user.id });
      throw new Error('Failed to check credits');
    }

    if (!subscription || subscription.tokens_remaining < ENHANCEMENT_COST) {
      logger.warn('Insufficient credits', { 
        userId: user.id, 
        metadata: { 
          required: ENHANCEMENT_COST, 
          available: subscription?.tokens_remaining 
        } 
      });
      return new Response(
        JSON.stringify({ error: 'Insufficient credits. You need 0.1 credits to enhance prompts.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are an expert AI prompt engineer. Your task is to enhance and improve prompts for AI content generation.

When enhancing prompts:
- Add specific visual details, lighting, and composition
- Include style references and artistic techniques
- Add quality markers (ultra detailed, professional, high resolution)
- Maintain the core intent of the original prompt
- Keep it under 500 words
- Make it more descriptive and visually rich
${category ? `- Consider this is for: ${category}` : ''}

Original prompt: "${prompt}"

Provide an enhanced version that will produce better AI-generated content.`;

    // Use centralized HTTP client with retry and circuit breaker
    const httpClient = HttpClients.createLovableAIClient(logger);
    
    const data = await httpClient.post<any>(
      'https://ai.gateway.lovable.dev/v1/chat/completions',
      {
        model: 'google/gemini-2.5-flash',
        max_completion_tokens: 600,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Enhance this prompt to produce the best possible AI generation.' }
        ],
      },
      {
        context: { userId: user.id, category, originalPromptLength: prompt.length }
      }
    );

    const enhancedPrompt = data.choices?.[0]?.message?.content;

    if (!enhancedPrompt) {
      logger.error('No enhanced prompt returned', undefined, { userId: user.id });
      throw new Error('No enhanced prompt returned from AI');
    }

    // Deduct credits
    const { error: deductError } = await supabase
      .from('user_subscriptions')
      .update({ 
        tokens_remaining: subscription.tokens_remaining - ENHANCEMENT_COST,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (deductError) {
      logger.error('Failed to deduct credits', deductError, { userId: user.id });
      throw new Error('Failed to deduct credits');
    }

    logger.info('Prompt enhanced successfully', { 
      userId: user.id, 
      metadata: { 
        creditsDeducted: ENHANCEMENT_COST,
        originalLength: prompt.length,
        enhancedLength: enhancedPrompt.length
      } 
    });

    return new Response(
      JSON.stringify({
        enhanced_prompt: enhancedPrompt.trim()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    logger.error('Prompt enhancement failed', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to enhance prompt';
    const status = errorMessage.includes('Insufficient') ? 402 
      : errorMessage.includes('Unauthorized') ? 401 
      : 500;
      
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
