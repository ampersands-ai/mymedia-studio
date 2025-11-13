import "https://deno.land/x/xhr@0.1.0/mod.ts";

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { prompt, category } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: prompt' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check user credits
    const ENHANCEMENT_COST = 0.1;
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('tokens_remaining')
      .eq('user_id', user.id)
      .single();

    if (subError) {
      console.error('Error fetching subscription:', subError);
      throw new Error('Failed to check credits');
    }

    if (!subscription || subscription.tokens_remaining < ENHANCEMENT_COST) {
      return new Response(
        JSON.stringify({ error: 'Insufficient credits. You need 0.1 credits to enhance prompts.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
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

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        max_completion_tokens: 600,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Enhance this prompt to produce the best possible AI generation.' }
        ],
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`AI enhancement failed: ${response.status}`);
    }

    const data = await response.json();
    const enhancedPrompt = data.choices?.[0]?.message?.content;

    if (!enhancedPrompt) {
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
      console.error('Error deducting credits:', deductError);
      throw new Error('Failed to deduct credits');
    }

    console.log(`Prompt enhanced successfully. ${ENHANCEMENT_COST} credits deducted from user ${user.id}`);

    return new Response(
      JSON.stringify({
        enhanced_prompt: enhancedPrompt.trim()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in enhance-prompt function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to enhance prompt';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
