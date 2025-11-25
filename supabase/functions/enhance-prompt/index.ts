import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { EdgeLogger } from '../_shared/edge-logger.ts';
import { HttpClients } from '../_shared/http-client.ts';
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
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
        { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      logger.warn('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      logger.error('Authentication failed', authError || undefined);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
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
        { status: 402, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are an expert AI prompt engineer. Enhance the following prompt for AI image generation.

CRITICAL INSTRUCTIONS:
- Return ONLY the enhanced prompt text itself
- DO NOT include ANY labels like "Enhanced Prompt:", "Here's", etc.
- DO NOT use markdown formatting (**bold**, *italic*)
- DO NOT wrap the prompt in quotes
- DO NOT add any preamble, explanation, or meta-commentary
- Start directly with the enhanced prompt content

Enhancement rules:
- Add specific visual details, lighting, and composition
- Include style references and artistic techniques
- Add quality markers (ultra detailed, professional, high resolution)
- Maintain the core intent of the original prompt
- Keep the enhanced prompt under 500 words
- Make it more descriptive and visually rich
${category ? `- Consider this is for: ${category}` : ''}

Original prompt: "${prompt}"`;

    // Use centralized HTTP client with retry and circuit breaker
    const httpClient = HttpClients.createLovableAIClient(logger);
    
    const data = await httpClient.post<any>(
      'https://ai.gateway.lovable.dev/v1/chat/completions',
      {
        model: 'google/gemini-2.5-flash',
        max_completion_tokens: 600,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Provide the enhanced prompt now. Remember: output only the enhanced prompt text, nothing else.' }
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

    // Clean up the AI response - strip common formatting artifacts
    const cleanEnhancedPrompt = (text: string): string => {
      let cleaned = text.trim();
      
      // Remove common label patterns at the start (case insensitive)
      const labelPatterns = [
        /^\*\*Enhanced Prompt:\*\*\s*/i,
        /^\*Enhanced Prompt:\*\s*/i,
        /^Enhanced Prompt:\s*/i,
        /^Here's an enhanced version.*?:\s*/i,
        /^Here is an enhanced.*?:\s*/i,
        /^Here's the enhanced.*?:\s*/i,
      ];
      
      for (const pattern of labelPatterns) {
        cleaned = cleaned.replace(pattern, '');
      }
      
      // Remove leading/trailing quotes (both single and double)
      cleaned = cleaned.replace(/^["']|["']$/g, '');
      
      // Remove markdown bold markers
      cleaned = cleaned.replace(/\*\*/g, '');
      
      // Final trim
      return cleaned.trim();
    };

    const cleanedPrompt = cleanEnhancedPrompt(enhancedPrompt);

    // Deduct credits
    const { error: deductError } = await supabase
      .from('user_subscriptions')
      .update({ 
        tokens_remaining: subscription.tokens_remaining - ENHANCEMENT_COST,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (deductError) {
      logger.error('Failed to deduct credits', deductError instanceof Error ? deductError : new Error(String(deductError) || 'Database error'), { userId: user.id });
      throw new Error('Failed to deduct credits');
    }

    logger.info('Prompt enhanced successfully', { 
      userId: user.id, 
      metadata: { 
        creditsDeducted: ENHANCEMENT_COST,
        originalLength: prompt.length,
        enhancedLength: cleanedPrompt.length
      } 
    });

    return new Response(
      JSON.stringify({
        enhanced_prompt: cleanedPrompt
      }),
      { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error('Prompt enhancement failed', error as Error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to enhance prompt';
    const status = errorMessage.includes('Insufficient') ? 402 
      : errorMessage.includes('Unauthorized') ? 401 
      : 500;
      
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
