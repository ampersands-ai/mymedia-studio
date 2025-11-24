/**
 * API Endpoints Configuration
 *
 * Centralized configuration for all external API endpoints.
 * Replaces 30+ hardcoded URLs across the codebase.
 *
 * Benefits:
 * - Single source of truth for API URLs
 * - Easy to switch between environments
 * - Can override with environment variables
 * - Type-safe endpoint access
 */

/**
 * Get environment variable or use default
 */
function getEnvOrDefault(key: string, defaultValue: string): string {
  return Deno.env.get(key) || defaultValue;
}

/**
 * Kie.ai API endpoints
 */
export const KIE_AI_ENDPOINTS = {
  BASE: getEnvOrDefault('KIE_AI_BASE_URL', 'https://api.kie.ai'),
  QUERY_TASK: '/api/v1/jobs/queryTask',
  CREATE_TASK: '/api/v1/jobs/createTask',
  MP4_GENERATE: '/api/v1/mp4/generate',
  MP4_RECORD_INFO: '/api/v1/mp4/record-info',

  // Helper to build full URLs
  getFullUrl(path: string): string {
    return `${this.BASE}${path}`;
  },

  // Common endpoints
  get queryTaskUrl(): string {
    return this.getFullUrl(this.QUERY_TASK);
  },
  get createTaskUrl(): string {
    return this.getFullUrl(this.CREATE_TASK);
  },
  get mp4GenerateUrl(): string {
    return this.getFullUrl(this.MP4_GENERATE);
  },
} as const;

/**
 * Runware API endpoints
 */
export const RUNWARE_ENDPOINTS = {
  BASE: getEnvOrDefault('RUNWARE_BASE_URL', 'https://api.runware.ai'),
  VERSION: '/v1',

  get fullUrl(): string {
    return `${this.BASE}${this.VERSION}`;
  },
} as const;

/**
 * Shotstack API endpoints
 */
export const SHOTSTACK_ENDPOINTS = {
  BASE: getEnvOrDefault('SHOTSTACK_BASE_URL', 'https://api.shotstack.io'),
  VERSION: '/v1',
  RENDER: '/render',

  get renderUrl(): string {
    return `${this.BASE}${this.VERSION}${this.RENDER}`;
  },

  getRenderStatusUrl(renderId: string): string {
    return `${this.renderUrl}/${renderId}`;
  },
} as const;

/**
 * Json2Video API endpoints
 */
export const JSON2VIDEO_ENDPOINTS = {
  BASE: getEnvOrDefault('JSON2VIDEO_BASE_URL', 'https://api.json2video.com'),
  VERSION: '/v2',
  MOVIES: '/movies',

  get moviesUrl(): string {
    return `${this.BASE}${this.VERSION}${this.MOVIES}`;
  },

  getMovieStatusUrl(projectId: string): string {
    return `${this.moviesUrl}?project=${projectId}`;
  },
} as const;

/**
 * ElevenLabs API endpoints
 */
export const ELEVENLABS_ENDPOINTS = {
  BASE: getEnvOrDefault('ELEVENLABS_BASE_URL', 'https://api.elevenlabs.io'),
  VERSION: '/v1',

  get fullUrl(): string {
    return `${this.BASE}${this.VERSION}`;
  },
} as const;

/**
 * OpenAI API endpoints
 */
export const OPENAI_ENDPOINTS = {
  BASE: getEnvOrDefault('OPENAI_BASE_URL', 'https://api.openai.com'),
  VERSION: '/v1',

  get fullUrl(): string {
    return `${this.BASE}${this.VERSION}`;
  },
} as const;

/**
 * Anthropic API endpoints
 */
export const ANTHROPIC_ENDPOINTS = {
  BASE: getEnvOrDefault('ANTHROPIC_BASE_URL', 'https://api.anthropic.com'),
  VERSION: '/v1',

  get fullUrl(): string {
    return `${this.BASE}${this.VERSION}`;
  },
} as const;

/**
 * Google AI endpoints
 */
export const GOOGLE_AI_ENDPOINTS = {
  BASE: getEnvOrDefault('GOOGLE_AI_BASE_URL', 'https://generativelanguage.googleapis.com'),
  VERSION: '/v1beta',

  get fullUrl(): string {
    return `${this.BASE}${this.VERSION}`;
  },
} as const;

/**
 * Pixabay API endpoints
 */
export const PIXABAY_ENDPOINTS = {
  BASE: getEnvOrDefault('PIXABAY_BASE_URL', 'https://pixabay.com'),
  API: '/api',

  get apiUrl(): string {
    return `${this.BASE}${this.API}`;
  },
} as const;

/**
 * Pexels API endpoints
 */
export const PEXELS_ENDPOINTS = {
  BASE: getEnvOrDefault('PEXELS_BASE_URL', 'https://api.pexels.com'),
  VERSION: '/v1',

  get fullUrl(): string {
    return `${this.BASE}${this.VERSION}`;
  },
} as const;

/**
 * All API endpoints
 */
export const API_ENDPOINTS = {
  KIE_AI: KIE_AI_ENDPOINTS,
  RUNWARE: RUNWARE_ENDPOINTS,
  SHOTSTACK: SHOTSTACK_ENDPOINTS,
  JSON2VIDEO: JSON2VIDEO_ENDPOINTS,
  ELEVENLABS: ELEVENLABS_ENDPOINTS,
  OPENAI: OPENAI_ENDPOINTS,
  ANTHROPIC: ANTHROPIC_ENDPOINTS,
  GOOGLE_AI: GOOGLE_AI_ENDPOINTS,
  PIXABAY: PIXABAY_ENDPOINTS,
  PEXELS: PEXELS_ENDPOINTS,
} as const;

/**
 * Environment-based configuration
 */
export const IS_PRODUCTION = Deno.env.get('ENVIRONMENT') === 'production';
export const IS_STAGING = Deno.env.get('ENVIRONMENT') === 'staging';
export const IS_DEVELOPMENT = !IS_PRODUCTION && !IS_STAGING;

/**
 * Logging helper for API calls
 */
export function logApiCall(
  provider: string,
  endpoint: string,
  context?: Record<string, unknown>
) {
  if (IS_DEVELOPMENT) {
    console.log(`[API] ${provider} - ${endpoint}`, context);
  }
}
