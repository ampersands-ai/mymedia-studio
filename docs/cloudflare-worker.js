/**
 * Cloudflare Worker for Pre-rendering
 * 
 * This worker intercepts all requests and routes bots to pre-rendered HTML
 * while serving the React SPA to human users.
 * 
 * Deploy this to Cloudflare Workers and add a route for your domain.
 */

// =============================================================================
// BOT DETECTION PATTERNS
// =============================================================================

const BOT_PATTERNS = [
  // Search Engine Crawlers
  'googlebot',
  'bingbot',
  'yandexbot',
  'baiduspider',
  'duckduckbot',
  'sogou',
  'exabot',
  'ia_archiver',
  'mj12bot',
  'ahrefsbot',
  'semrushbot',

  // AI Crawlers - Critical for ChatGPT, Claude, Perplexity
  'gptbot',
  'chatgpt-user',
  'oai-searchbot',
  'openai',
  'claudebot',
  'anthropic-ai',
  'claude-web',
  'anthropic',
  'perplexitybot',
  'google-extended',
  'meta-externalagent',
  'facebookbot',
  'bytespider',
  'cohere-ai',
  'ccbot',
  'diffbot',
  'omgilibot',
  'youbot',

  // Social Media Crawlers
  'twitterbot',
  'linkedinbot',
  'facebookexternalhit',
  'slackbot',
  'slackbot-linkexpanding',
  'whatsapp',
  'telegrambot',
  'discordbot',
  'pinterest',
  'vkshare',
  'embedly',

  // Other Crawlers
  'applebot',
  'screaming frog',
  'rogerbot',
  'dotbot',
  'petalbot',
  'seznambot',
  'blexbot',
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if user agent belongs to a bot
 */
function isBot(userAgent) {
  if (!userAgent) return false;
  const lowerUA = userAgent.toLowerCase();
  return BOT_PATTERNS.some(pattern => lowerUA.includes(pattern));
}

/**
 * Get bot category for logging
 */
function getBotType(userAgent) {
  if (!userAgent) return 'unknown';
  const lowerUA = userAgent.toLowerCase();
  
  if (lowerUA.includes('gptbot') || lowerUA.includes('chatgpt') || lowerUA.includes('openai')) {
    return 'openai';
  }
  if (lowerUA.includes('claude') || lowerUA.includes('anthropic')) {
    return 'anthropic';
  }
  if (lowerUA.includes('perplexity')) {
    return 'perplexity';
  }
  if (lowerUA.includes('googlebot') || lowerUA.includes('google-extended')) {
    return 'google';
  }
  if (lowerUA.includes('bingbot')) {
    return 'bing';
  }
  if (lowerUA.includes('twitter') || lowerUA.includes('facebook') || lowerUA.includes('linkedin')) {
    return 'social';
  }
  return 'other';
}

/**
 * Should this path be pre-rendered?
 */
function shouldPrerender(pathname) {
  // Skip static assets
  if (pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|json|xml|txt|webp|mp4|webm)$/)) {
    return false;
  }
  
  // Skip API endpoints
  if (pathname.startsWith('/api/') || pathname.startsWith('/rest/') || pathname.startsWith('/functions/')) {
    return false;
  }
  
  // Skip dashboard and authenticated routes
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/auth') || pathname.startsWith('/admin')) {
    return false;
  }
  
  return true;
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const userAgent = request.headers.get('User-Agent') || '';
    const pathname = url.pathname;

    // Check if this is a bot request for a pre-renderable page
    if (isBot(userAgent) && shouldPrerender(pathname)) {
      const botType = getBotType(userAgent);
      console.log(`[Prerender] Bot detected: ${botType}, path: ${pathname}`);

      try {
        // Call Supabase prerender edge function
        const prerenderUrl = `${env.SUPABASE_URL}/functions/v1/prerender`;
        
        const prerenderResponse = await fetch(prerenderUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            url_path: pathname,
            force_refresh: false,
          }),
        });

        if (!prerenderResponse.ok) {
          console.error(`[Prerender] Edge function error: ${prerenderResponse.status}`);
          // Fall back to origin
          return fetch(request);
        }

        const result = await prerenderResponse.json();

        if (result.success && result.html) {
          console.log(`[Prerender] Serving pre-rendered HTML (cached: ${result.cached})`);
          
          // Return pre-rendered HTML with appropriate headers
          return new Response(result.html, {
            status: 200,
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'public, max-age=3600', // Cache for 1 hour at edge
              'X-Prerendered': 'true',
              'X-Bot-Type': botType,
              'X-Render-Time': result.render_time_ms?.toString() || '0',
            },
          });
        }

        console.error(`[Prerender] Failed to get HTML: ${result.error}`);
        // Fall back to origin
        return fetch(request);

      } catch (error) {
        console.error(`[Prerender] Error: ${error.message}`);
        // Fall back to origin on any error
        return fetch(request);
      }
    }

    // For human users, pass through to origin (React SPA)
    return fetch(request);
  },
};

// =============================================================================
// CONFIGURATION NOTES
// =============================================================================
/*
Environment Variables Required:
- SUPABASE_URL: https://gzlwkvmivbfcvczoqphq.supabase.co
- SUPABASE_ANON_KEY: Your Supabase anon key

Route Configuration:
- Add route: artifio.ai/* 
- Zone: Select your domain zone

Testing:
curl -H "User-Agent: Googlebot/2.1" https://artifio.ai/models/kling-2-6
curl -H "User-Agent: GPTBot/1.0" https://artifio.ai/models/kling-2-6
curl -H "User-Agent: ClaudeBot/1.0" https://artifio.ai/models/kling-2-6
*/
