import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { EdgeLogger } from "../_shared/edge-logger.ts";

interface TopicRequest {
  industry?: string;
  keywords?: string[];
  tone?: 'professional' | 'casual' | 'technical' | 'conversational';
  targetAudience?: string;
  aiModel?: string;
}

Deno.serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  const requestId = crypto.randomUUID();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  const logger = new EdgeLogger('generate-blog-topics', requestId, supabase);

  try {
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { industry, keywords, tone, targetAudience, aiModel }: TopicRequest = await req.json();

    // Default to Claude 3.5 Sonnet if no model specified
    const selectedModel = aiModel || 'claude-3-5-sonnet-20241022';

    logger.info('Generating blog topics', {
      userId: user.id,
      metadata: { industry, keywords, tone, targetAudience, model: selectedModel }
    });

    // Build AI prompt for topic generation
    const prompt = `Generate 5 SEO-optimized blog topic ideas for ${industry || 'technology industry'} targeting ${targetAudience || 'general audience'}.

Requirements:
- Tone: ${tone || 'professional'}
- Include these keywords: ${keywords?.join(', ') || 'AI, technology, innovation'}
- Each topic should be trending, engaging, and SEO-friendly
- Focus on high search volume and low competition
- Include a brief description explaining why it's good for SEO

Format your response as a JSON array with this structure:
[
  {
    "title": "Catchy, SEO-optimized title (50-60 chars)",
    "description": "Brief description of the topic and its SEO value",
    "keywords": ["keyword1", "keyword2", "keyword3"],
    "seoScore": 85 (estimated SEO potential 0-100)
  }
]`;

    // Call Lovable AI with selected model
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      throw new Error(`AI API error: ${aiResponse.status} - ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';

    // Extract JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Failed to extract topics from AI response');
    }

    const topics = JSON.parse(jsonMatch[0]);

    logger.info('Generated topics successfully', {
      userId: user.id,
      metadata: { topicCount: topics.length }
    });

    return new Response(
      JSON.stringify({ topics }),
      {
        status: 200,
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    logger.error('Error generating topics', error instanceof Error ? error : undefined);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      {
        status: 500,
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
