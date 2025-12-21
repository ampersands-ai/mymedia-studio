/**
 * Pricing Configuration
 *
 * Centralized pricing for all features, plans, and models.
 * Replaces 68+ files with hardcoded pricing values.
 *
 * Benefits:
 * - Single source of truth for pricing
 * - Easy to update pricing across entire app
 * - Consistent pricing display
 * - Can be loaded from database in future for dynamic pricing
 */

/**
 * Subscription Plan Token Allocations
 *
 * NOTE: This is duplicated in backend webhook handlers.
 * Future: Move to database table for true single source of truth.
 */
export const PLAN_TOKENS = {
  freemium: 5,
  explorer: 375,
  professional: 1_000,
  ultimate: 2_500,
  studio: 5_000,
  veo_connoisseur: 5_000, // Alias for backward compatibility
} as const;

export type PlanName = keyof typeof PLAN_TOKENS;

/**
 * Feature Costs
 *
 * Credit costs for individual features/actions
 */
export const FEATURE_COSTS = {
  /** Cost to enhance a prompt using AI */
  PROMPT_ENHANCEMENT: 0.1,

  /** Cost to generate a caption */
  CAPTION_GENERATION: 0.1,

  /** Cost to upscale an image */
  IMAGE_UPSCALE: 0.2,

  /** Cost to remove background from image */
  BACKGROUND_REMOVAL: 0.06,

  /** Cost per video job (base) */
  VIDEO_JOB_BASE: 1.0,

  /** Cost per second of video generation */
  VIDEO_PER_SECOND: 0.5,

  /** Cost to generate audio/voiceover */
  AUDIO_GENERATION: 0.5,
} as const;

/**
 * Model Base Costs
 *
 * Base credit costs for different model types.
 * Actual model costs may vary and should be stored in database.
 *
 * This provides defaults for when database values aren't available.
 */
export const MODEL_BASE_COSTS = {
  // Text-to-Image Models
  IMAGE_GENERATION_FAST: 0.1, // Schnell, Turbo variants
  IMAGE_GENERATION_STANDARD: 0.15, // Standard quality
  IMAGE_GENERATION_PRO: 0.25, // Pro/Dev variants
  IMAGE_GENERATION_ULTRA: 1.0, // Ultra quality

  // Image-to-Video Models
  VIDEO_GENERATION_BASIC: 8.0, // Basic video generation
  VIDEO_GENERATION_STANDARD: 15.0, // Standard video
  VIDEO_GENERATION_PRO: 40.0, // Pro video generation
  VIDEO_GENERATION_ULTRA: 75.0, // Ultra/Sora quality

  // Audio Generation
  AUDIO_GENERATION_BASIC: 0.5,
  AUDIO_GENERATION_PRO: 1.0,

  // Text Generation
  TEXT_GENERATION_BASIC: 0.05,
  TEXT_GENERATION_PRO: 0.1,
} as const;

/**
 * Pricing Display Helpers
 */
export function getPlanTokens(plan: string): number {
  const normalizedPlan = plan.toLowerCase() as PlanName;
  return PLAN_TOKENS[normalizedPlan] || 0;
}

export function getFeatureCost(feature: keyof typeof FEATURE_COSTS): number {
  return FEATURE_COSTS[feature];
}

/**
 * Format credits for display
 */
export function formatCredits(credits: number): string {
  if (credits >= 1_000_000) {
    return `${(credits / 1_000_000).toFixed(1)}M`;
  }
  if (credits >= 1_000) {
    return `${(credits / 1_000).toFixed(1)}K`;
  }
  return credits.toFixed(2);
}

/**
 * Check if user has enough credits
 */
export function hasEnoughCredits(userCredits: number, required: number): boolean {
  return userCredits >= required;
}

/**
 * Calculate cost with potential discounts
 */
export function calculateCostWithDiscount(
  baseCost: number,
  discountPercent: number = 0
): number {
  if (discountPercent <= 0) return baseCost;
  return baseCost * (1 - discountPercent / 100);
}

/**
 * Get insufficient credits message
 */
export function getInsufficientCreditsMessage(
  required: number,
  current: number
): string {
  const deficit = required - current;
  return `Insufficient credits. You need ${formatCredits(deficit)} more credits.`;
}

/**
 * Competitor pricing for comparison (marketing)
 */
export const COMPETITOR_PRICING = {
  midjourney: { name: 'Midjourney', price: 30 },
  runway: { name: 'Runway', price: 35 },
  elevenlabs: { name: 'ElevenLabs', price: 22 },
  chatgpt: { name: 'ChatGPT Plus', price: 20 },
  pika: { name: 'Pika', price: 28 },
} as const;

/**
 * Free tier limits
 */
export const FREE_TIER_LIMITS = {
  MAX_GENERATIONS_PER_DAY: 10,
  MAX_CONCURRENT_GENERATIONS: 2,
  MAX_VIDEO_DURATION_SECONDS: 5,
  MAX_IMAGE_RESOLUTION: 1024,
} as const;

/**
 * Premium tier benefits
 */
export const PREMIUM_BENEFITS = {
  explorer: [
    '10,000 credits per month',
    'Priority queue',
    'HD outputs',
    'Commercial license',
  ],
  professional: [
    '32,500 credits per month',
    'Highest priority',
    '4K outputs',
    'Extended commercial license',
    'API access',
  ],
  ultimate: [
    '75,000 credits per month',
    'Maximum priority',
    '8K outputs',
    'Full commercial license',
    'Advanced API access',
    'Dedicated support',
  ],
  studio: [
    '200,000 credits per month',
    'Instant processing',
    'Unlimited resolution',
    'Enterprise license',
    'Full API suite',
    '24/7 priority support',
    'Custom integrations',
  ],
  veo_connoisseur: [
    '200,000 credits per month',
    'Instant processing',
    'Unlimited resolution',
    'Enterprise license',
    'Full API suite',
    '24/7 priority support',
    'Custom integrations',
  ],
} as const;
