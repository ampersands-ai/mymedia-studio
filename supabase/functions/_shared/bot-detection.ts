/**
 * Bot Detection Utility
 * Comprehensive user-agent detection for search engines, AI crawlers, and social media bots
 */

// Search engine crawlers
const SEARCH_ENGINE_BOTS = [
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
];

// AI crawlers - Critical for ChatGPT, Claude, Perplexity visibility
const AI_CRAWLERS = [
  // OpenAI / ChatGPT
  'gptbot',
  'chatgpt-user',
  'oai-searchbot',
  'openai',
  
  // Anthropic / Claude
  'claudebot',
  'anthropic-ai',
  'claude-web',
  'anthropic',
  
  // Perplexity
  'perplexitybot',
  
  // Google AI
  'google-extended',
  
  // Meta AI
  'meta-externalagent',
  'facebookbot',
  
  // ByteDance AI
  'bytespider',
  
  // Cohere AI
  'cohere-ai',
  
  // Other AI
  'ccbot',
  'diffbot',
  'omgilibot',
  'youbot',
];

// Social media crawlers
const SOCIAL_MEDIA_BOTS = [
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
  'w3c_validator',
  'embedly',
];

// Other important crawlers
const OTHER_BOTS = [
  'applebot',
  'screaming frog',
  'rogerbot',
  'dotbot',
  'petalbot',
  'seznambot',
  'blexbot',
];

// Combine all bot patterns
export const ALL_BOT_PATTERNS = [
  ...SEARCH_ENGINE_BOTS,
  ...AI_CRAWLERS,
  ...SOCIAL_MEDIA_BOTS,
  ...OTHER_BOTS,
];

/**
 * Check if a user agent string belongs to a bot
 * @param userAgent - The User-Agent header value
 * @returns true if the user agent is identified as a bot
 */
export function isBot(userAgent: string | null): boolean {
  if (!userAgent) return false;
  
  const lowerUA = userAgent.toLowerCase();
  return ALL_BOT_PATTERNS.some(pattern => lowerUA.includes(pattern));
}

/**
 * Categorize the type of bot
 * @param userAgent - The User-Agent header value
 * @returns Bot category or null if not a bot
 */
export function getBotCategory(userAgent: string | null): 'search_engine' | 'ai_crawler' | 'social_media' | 'other' | null {
  if (!userAgent) return null;
  
  const lowerUA = userAgent.toLowerCase();
  
  if (SEARCH_ENGINE_BOTS.some(pattern => lowerUA.includes(pattern))) {
    return 'search_engine';
  }
  
  if (AI_CRAWLERS.some(pattern => lowerUA.includes(pattern))) {
    return 'ai_crawler';
  }
  
  if (SOCIAL_MEDIA_BOTS.some(pattern => lowerUA.includes(pattern))) {
    return 'social_media';
  }
  
  if (OTHER_BOTS.some(pattern => lowerUA.includes(pattern))) {
    return 'other';
  }
  
  return null;
}

/**
 * Get the specific bot name if identified
 * @param userAgent - The User-Agent header value
 * @returns The matched bot pattern or null
 */
export function getBotName(userAgent: string | null): string | null {
  if (!userAgent) return null;
  
  const lowerUA = userAgent.toLowerCase();
  
  for (const pattern of ALL_BOT_PATTERNS) {
    if (lowerUA.includes(pattern)) {
      return pattern;
    }
  }
  
  return null;
}

/**
 * Check if this is specifically an AI crawler
 * @param userAgent - The User-Agent header value
 * @returns true if this is an AI crawler (ChatGPT, Claude, Perplexity, etc.)
 */
export function isAICrawler(userAgent: string | null): boolean {
  if (!userAgent) return false;
  
  const lowerUA = userAgent.toLowerCase();
  return AI_CRAWLERS.some(pattern => lowerUA.includes(pattern));
}

/**
 * Check if this is a search engine crawler
 * @param userAgent - The User-Agent header value
 * @returns true if this is a search engine crawler
 */
export function isSearchEngineCrawler(userAgent: string | null): boolean {
  if (!userAgent) return false;
  
  const lowerUA = userAgent.toLowerCase();
  return SEARCH_ENGINE_BOTS.some(pattern => lowerUA.includes(pattern));
}

/**
 * Check if this is a social media crawler
 * @param userAgent - The User-Agent header value
 * @returns true if this is a social media crawler
 */
export function isSocialMediaCrawler(userAgent: string | null): boolean {
  if (!userAgent) return false;
  
  const lowerUA = userAgent.toLowerCase();
  return SOCIAL_MEDIA_BOTS.some(pattern => lowerUA.includes(pattern));
}
