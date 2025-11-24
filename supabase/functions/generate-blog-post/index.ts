import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { EdgeLogger } from "../_shared/edge-logger.ts";

interface BlogRequest {
  topic: string;
  keywords?: string[];
  tone?: 'professional' | 'casual' | 'technical' | 'conversational';
  length?: 'short' | 'medium' | 'long';
  includeImages?: boolean;
  numImages?: number;
  targetAudience?: string;
  internalLinks?: Array<{ text: string; url: string }>;
  externalLinks?: Array<{ text: string; url: string }>;
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
  const logger = new EdgeLogger('generate-blog-post', requestId, supabase);

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

    const {
      topic,
      keywords = [],
      tone = 'professional',
      length = 'medium',
      includeImages = true,
      numImages = 3,
      targetAudience = 'general audience',
      internalLinks = [],
      externalLinks = [],
      aiModel
    }: BlogRequest = await req.json();

    // Default to Claude 3.5 Sonnet if no model specified
    const selectedModel = aiModel || 'claude-3-5-sonnet-20241022';

    logger.info('Generating blog post', {
      userId: user.id,
      metadata: { topic, keywords, tone, length, model: selectedModel }
    });

    // Calculate word count target
    const wordCounts = { short: 500, medium: 1000, long: 2000 };
    const targetWords = wordCounts[length];

    // Build comprehensive AI prompt
    const prompt = `Write a complete, SEO-optimized blog post about: "${topic}"

Requirements:
- Target audience: ${targetAudience}
- Tone: ${tone}
- Word count: ~${targetWords} words
- Primary keywords: ${keywords.join(', ')}
- Include H2 and H3 headings for structure
- Use semantic HTML (bold, italic, lists, blockquotes)
- Natural keyword density (1-2%)
- Include internal links: ${internalLinks.map(l => `${l.text} (${l.url})`).join(', ') || 'none'}
- Include external authority links: ${externalLinks.map(l => `${l.text} (${l.url})`).join(', ') || 'none'}

${includeImages ? `Suggest ${numImages} images with:
- Detailed image generation prompts
- SEO-optimized alt text
- Position in content (paragraph number)` : ''}

Format your response as JSON:
{
  "title": "SEO-optimized title (50-60 chars, includes main keyword)",
  "content": "Full HTML content with <h2>, <h3>, <p>, <strong>, <em>, <ul>, <ol>, <blockquote>, <a> tags",
  "excerpt": "Compelling summary (150-160 chars)",
  "meta_title": "Meta title (50-60 chars)",
  "meta_description": "Meta description (150-160 chars)",
  "meta_keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "og_title": "Open Graph title",
  "og_description": "Open Graph description",
  "twitter_title": "Twitter card title",
  "twitter_description": "Twitter card description",
  "schema_data": {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": "title",
    "description": "excerpt",
    "keywords": "comma,separated,keywords",
    "datePublished": "YYYY-MM-DD",
    "author": {
      "@type": "Person",
      "name": "Artifio AI"
    }
  },
  "suggested_images": [
    {
      "prompt": "Detailed image generation prompt",
      "alt_text": "SEO-optimized alt text with keywords",
      "position": 2
    }
  ],
  "backlinks": [
    {
      "url": "https://example.com",
      "anchor_text": "natural anchor text",
      "is_internal": false,
      "position": 5
    }
  ],
  "tags": ["tag1", "tag2", "tag3"],
  "reading_time": 5
}`;

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
            role: 'system',
            content: 'You are an expert SEO content writer and blogger. Generate comprehensive, engaging, and perfectly optimized blog content.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      throw new Error(`AI API error: ${aiResponse.status} - ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract blog data from AI response');
    }

    const blogData = JSON.parse(jsonMatch[0]);

    // Calculate reading time if not provided
    if (!blogData.reading_time) {
      const wordCount = blogData.content.replace(/<[^>]*>/g, '').split(/\s+/).length;
      blogData.reading_time = Math.ceil(wordCount / 200); // Average reading speed: 200 words/min
    }

    // Add current date to schema if missing
    if (blogData.schema_data && !blogData.schema_data.datePublished) {
      blogData.schema_data.datePublished = new Date().toISOString().split('T')[0];
    }

    logger.info('Blog post generated successfully', { userId: user.id });

    return new Response(
      JSON.stringify(blogData),
      {
        status: 200,
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    logger.error('Error generating blog post', error instanceof Error ? error : undefined);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      {
        status: 500,
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
