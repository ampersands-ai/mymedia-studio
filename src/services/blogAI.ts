import { GenerateTopicRequest, GenerateTopicResponse, GenerateBlogRequest, GenerateBlogResponse } from "@/types/blog";

/**
 * AI-powered blog topic generation service
 * Generates SEO-optimized blog topics based on user input
 */
export async function generateBlogTopics(
  request: GenerateTopicRequest
): Promise<GenerateTopicResponse> {
  const { industry, keywords, tone = 'professional', targetAudience } = request;

  const prompt = `Generate 5 SEO-optimized blog post topics for the following criteria:
${industry ? `Industry: ${industry}` : ''}
${keywords && keywords.length > 0 ? `Keywords: ${keywords.join(', ')}` : ''}
Tone: ${tone}
${targetAudience ? `Target Audience: ${targetAudience}` : ''}

For each topic, provide:
1. An engaging, SEO-friendly title
2. A brief description of what the post would cover
3. Relevant keywords to target
4. An estimated SEO score (0-100) based on keyword relevance and search intent

Return the response as a JSON object with this structure:
{
  "topics": [
    {
      "title": "string",
      "description": "string",
      "keywords": ["string"],
      "seoScore": number
    }
  ]
}`;

  try {
    // Call your AI service (Claude, OpenAI, or internal model)
    const response = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        model: 'claude-3-sonnet',
        maxTokens: 2000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate topics');
    }

    const data = await response.json();

    // Parse the AI response
    const aiResponse = JSON.parse(data.content);
    return aiResponse as GenerateTopicResponse;
  } catch (error) {
    console.error('Error generating topics:', error);

    // Fallback to default topics
    return {
      topics: [
        {
          title: `The Ultimate Guide to ${industry || 'Your Industry'}`,
          description: 'A comprehensive guide covering best practices and strategies',
          keywords: keywords || ['guide', 'best practices', 'tutorial'],
          seoScore: 75
        },
        {
          title: `10 ${tone === 'professional' ? 'Professional' : 'Essential'} Tips for ${targetAudience || 'Success'}`,
          description: 'Practical tips and actionable advice',
          keywords: keywords || ['tips', 'advice', 'how-to'],
          seoScore: 80
        },
        {
          title: `What You Need to Know About ${keywords?.[0] || 'This Topic'} in 2025`,
          description: 'Latest trends and insights',
          keywords: keywords || ['trends', '2025', 'insights'],
          seoScore: 70
        }
      ]
    };
  }
}

/**
 * AI-powered blog post generation service
 * Generates complete SEO-optimized blog posts with metadata
 */
export async function generateBlogPost(
  request: GenerateBlogRequest
): Promise<GenerateBlogResponse> {
  const {
    topic,
    keywords = [],
    tone = 'professional',
    length = 'medium',
    includeImages = true,
    numImages = 3,
    targetAudience,
    internalLinks = [],
    externalLinks = []
  } = request;

  const wordCount = length === 'short' ? 800 : length === 'medium' ? 1500 : 2500;

  const prompt = `Generate a complete, SEO-optimized blog post with the following specifications:

Topic: ${topic}
Target Word Count: ${wordCount} words
Tone: ${tone}
${targetAudience ? `Target Audience: ${targetAudience}` : ''}
${keywords.length > 0 ? `Primary Keywords: ${keywords.join(', ')}` : ''}

Requirements:
1. Write an engaging, well-structured blog post in HTML format
2. Use proper HTML tags: <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, etc.
3. Include an attention-grabbing introduction
4. Break content into clear sections with subheadings
5. Include a strong conclusion with call-to-action
6. Naturally incorporate the primary keywords throughout (aim for 1-2% keyword density)
7. Use semantic HTML and proper heading hierarchy for SEO
8. Make the content scannable with short paragraphs and bullet points

${includeImages ? `9. Suggest ${numImages} image placements with AI generation prompts and alt text` : ''}
${internalLinks.length > 0 ? `10. Include these internal links naturally: ${JSON.stringify(internalLinks)}` : ''}
${externalLinks.length > 0 ? `11. Include these external links naturally: ${JSON.stringify(externalLinks)}` : ''}

Also provide comprehensive SEO metadata:
- Meta title (50-60 characters, include primary keyword)
- Meta description (150-160 characters, compelling with CTA)
- Meta keywords (5-10 relevant keywords)
- Open Graph title and description
- Twitter card title and description
- Schema.org structured data (BlogPosting type)
- Suggested tags for categorization
- Recommended backlinks with anchor text

Return the response as a JSON object with this exact structure:
{
  "title": "string (60 chars max)",
  "content": "string (full HTML content)",
  "excerpt": "string (160 chars max summary)",
  "meta_title": "string (50-60 chars)",
  "meta_description": "string (150-160 chars)",
  "meta_keywords": ["string"],
  "og_title": "string",
  "og_description": "string",
  "twitter_title": "string",
  "twitter_description": "string",
  "schema_data": {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": "string",
    "description": "string",
    "author": {
      "@type": "Person",
      "name": "Artifio"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Artifio"
    }
  },
  "suggested_images": [
    {
      "prompt": "string (detailed image generation prompt)",
      "alt_text": "string (SEO-optimized alt text)",
      "position": number (character position in content)
    }
  ],
  "backlinks": [
    {
      "url": "string",
      "anchor_text": "string",
      "is_internal": boolean,
      "position": number
    }
  ],
  "tags": ["string"],
  "reading_time": number (estimated minutes)
}`;

  try {
    // Call your AI service
    const response = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        model: 'claude-3-opus', // Use the best model for content generation
        maxTokens: 8000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate blog post');
    }

    const data = await response.json();

    // Parse the AI response
    const aiResponse = JSON.parse(data.content);
    return aiResponse as GenerateBlogResponse;
  } catch (error) {
    console.error('Error generating blog post:', error);

    // Fallback to template
    const fallbackTitle = `Understanding ${topic}`;
    const fallbackContent = `
      <h2>Introduction</h2>
      <p>Welcome to our comprehensive guide on ${topic}. In this article, we'll explore everything you need to know about this important subject.</p>

      <h2>What is ${topic}?</h2>
      <p>Let's start by understanding the fundamentals of ${topic} and why it matters in today's landscape.</p>

      <h2>Key Benefits</h2>
      <ul>
        <li>Improved efficiency and productivity</li>
        <li>Better outcomes and results</li>
        <li>Enhanced understanding and expertise</li>
      </ul>

      <h2>Best Practices</h2>
      <p>Here are some proven strategies for success with ${topic}:</p>
      <ol>
        <li>Start with a clear understanding of your goals</li>
        <li>Implement proven methodologies</li>
        <li>Continuously measure and optimize</li>
      </ol>

      <h2>Conclusion</h2>
      <p>Understanding ${topic} is crucial for success. Start implementing these strategies today to see real results.</p>
    `;

    return {
      title: fallbackTitle,
      content: fallbackContent,
      excerpt: `A comprehensive guide to understanding ${topic} with practical tips and strategies.`,
      meta_title: fallbackTitle,
      meta_description: `Learn everything about ${topic} in this comprehensive guide. Discover best practices, tips, and strategies.`,
      meta_keywords: keywords.length > 0 ? keywords : ['guide', 'tutorial', 'tips'],
      og_title: fallbackTitle,
      og_description: `A complete guide to ${topic}`,
      twitter_title: fallbackTitle,
      twitter_description: `Everything you need to know about ${topic}`,
      schema_data: {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": fallbackTitle,
        "description": `A comprehensive guide to ${topic}`,
        "author": {
          "@type": "Person",
          "name": "Artifio"
        },
        "publisher": {
          "@type": "Organization",
          "name": "Artifio"
        }
      },
      suggested_images: includeImages ? [
        {
          prompt: `Professional illustration of ${topic}, modern design, high quality`,
          alt_text: `${topic} illustration`,
          position: 0
        }
      ] : [],
      backlinks: [],
      tags: keywords.slice(0, 5),
      reading_time: Math.ceil(wordCount / 200)
    };
  }
}

/**
 * Generate SEO-optimized backlinks for a blog post
 */
export function generateBacklinks(
  content: string,
  internalLinks: { text: string; url: string }[],
  externalLinks: { text: string; url: string }[]
): { url: string; anchor_text: string; is_internal: boolean; position: number }[] {
  const backlinks: { url: string; anchor_text: string; is_internal: boolean; position: number }[] = [];

  // Add internal links
  internalLinks.forEach(link => {
    const position = content.indexOf(link.text);
    if (position !== -1) {
      backlinks.push({
        url: link.url,
        anchor_text: link.text,
        is_internal: true,
        position
      });
    }
  });

  // Add external links
  externalLinks.forEach(link => {
    const position = content.indexOf(link.text);
    if (position !== -1) {
      backlinks.push({
        url: link.url,
        anchor_text: link.text,
        is_internal: false,
        position
      });
    }
  });

  return backlinks;
}

/**
 * Validate and optimize SEO metadata
 */
export function validateSEOMetadata(metadata: Partial<GenerateBlogResponse>): {
  valid: boolean;
  warnings: string[];
  suggestions: string[];
} {
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Check meta title length
  if (metadata.meta_title) {
    if (metadata.meta_title.length < 30) {
      warnings.push('Meta title is too short (recommended: 50-60 characters)');
    } else if (metadata.meta_title.length > 60) {
      warnings.push('Meta title is too long (recommended: 50-60 characters)');
    }
  } else {
    warnings.push('Meta title is missing');
  }

  // Check meta description length
  if (metadata.meta_description) {
    if (metadata.meta_description.length < 120) {
      warnings.push('Meta description is too short (recommended: 150-160 characters)');
    } else if (metadata.meta_description.length > 160) {
      warnings.push('Meta description is too long (recommended: 150-160 characters)');
    }
  } else {
    warnings.push('Meta description is missing');
  }

  // Check keywords
  if (!metadata.meta_keywords || metadata.meta_keywords.length < 3) {
    warnings.push('Add at least 3-5 meta keywords');
  }

  // Check for images
  if (!metadata.suggested_images || metadata.suggested_images.length === 0) {
    suggestions.push('Consider adding images to improve engagement');
  }

  // Check for structured data
  if (!metadata.schema_data) {
    suggestions.push('Add schema.org structured data for better SEO');
  }

  return {
    valid: warnings.length === 0,
    warnings,
    suggestions
  };
}
