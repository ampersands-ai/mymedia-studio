import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ModerationResult {
  flagged: boolean;
  categories: {
    sexual: boolean;
    'sexual/minors': boolean;
    harassment: boolean;
    'harassment/threatening': boolean;
    hate: boolean;
    'hate/threatening': boolean;
    illicit: boolean;
    'illicit/violent': boolean;
    'self-harm': boolean;
    'self-harm/intent': boolean;
    'self-harm/instructions': boolean;
    violence: boolean;
    'violence/graphic': boolean;
  };
  category_scores: Record<string, number>;
}

interface ModeratePromptRequest {
  prompt: string;
  userId?: string;
}

// Helper to log moderation attempt to database
async function logModerationAttempt(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: any,
  userId: string | undefined,
  prompt: string,
  flagged: boolean,
  flaggedCategories: string[],
  categoryScores: Record<string, number>,
  exempt: boolean
): Promise<void> {
  if (!userId) return; // Only log for authenticated users
  
  try {
    const { error } = await supabaseAdmin
      .from('moderation_logs')
      .insert({
        user_id: userId,
        prompt: prompt.substring(0, 5000), // Limit prompt length
        flagged,
        flagged_categories: flaggedCategories,
        category_scores: categoryScores,
        exempt,
      });
    
    if (error) {
      console.error('Failed to log moderation attempt:', error);
    }
  } catch (e) {
    console.error('Error logging moderation attempt:', e);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { prompt, userId } = await req.json() as ModeratePromptRequest;

    if (!prompt || typeof prompt !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is exempt from moderation
    if (userId) {
      const { data: isExempt, error: exemptError } = await supabaseAdmin
        .rpc('is_moderation_exempt', { _user_id: userId });

      if (exemptError) {
        console.error('Error checking moderation exemption:', exemptError);
      } else if (isExempt === true) {
        console.log('User is exempt from moderation:', userId);
        
        // Log exemption to database
        await logModerationAttempt(
          supabaseAdmin,
          userId,
          prompt,
          false,
          [],
          {},
          true
        );
        
        return new Response(
          JSON.stringify({
            flagged: false,
            exempt: true,
            flaggedCategories: [],
            categories: {},
            categoryScores: {},
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OPENAI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Moderation service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call OpenAI's free Moderation API
    const response = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'omni-moderation-latest',
        input: prompt,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI Moderation API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Moderation check failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const result: ModerationResult = data.results[0];

    // Get list of flagged categories for user-friendly message
    const flaggedCategories: string[] = [];
    if (result.flagged) {
      for (const [category, isFlagged] of Object.entries(result.categories)) {
        if (isFlagged) {
          flaggedCategories.push(category.replace('/', ' / ').replace(/-/g, ' '));
        }
      }
    }

    console.log('Moderation result:', {
      prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
      flagged: result.flagged,
      flaggedCategories,
      userId: userId || 'anonymous',
    });

    // Log ALL moderation attempts to database (not just flagged ones)
    await logModerationAttempt(
      supabaseAdmin,
      userId,
      prompt,
      result.flagged,
      flaggedCategories,
      result.category_scores,
      false
    );

    return new Response(
      JSON.stringify({
        flagged: result.flagged,
        exempt: false,
        flaggedCategories,
        categories: result.categories,
        categoryScores: result.category_scores,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in moderate-prompt:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
