/**
 * Payment Provider Configuration
 * 
 * Centralized configuration for Dodo Payments (primary) and Stripe (backup)
 * All plans are now monthly-only with limited time 20% discount pricing
 */

// Stripe price IDs for subscription plans (monthly only)
export const STRIPE_PLAN_PRICES = {
  explorer: {
    monthly: 'price_1SgW4XPoOsAS6r2g0o1PwDKO',
  },
  professional: {
    monthly: 'price_1SgW53PoOsAS6r2guIoU83bt',
  },
  ultimate: {
    monthly: 'price_1SgW5WPoOsAS6r2gcuNO6kuU',
  },
  studio: {
    monthly: 'price_1SgW6HPoOsAS6r2gaW9gV4so',
  },
  // Keep veo_connoisseur as alias for backward compatibility
  veo_connoisseur: {
    monthly: 'price_1SgW6HPoOsAS6r2gaW9gV4so',
  },
} as const;

// Stripe price IDs for one-time credit boost purchases (monthly rates with LTO discount)
export const STRIPE_BOOST_PRICES = {
  explorer: {
    monthly: 'price_1SgfO5PoOsAS6r2gxPML0cfE',  // $7.99 one-time (LTO)
  },
  professional: {
    monthly: 'price_1SgfQ7PoOsAS6r2gOaeUL5iZ',  // $19.99 one-time (LTO)
  },
  ultimate: {
    monthly: 'price_1SgfTcPoOsAS6r2g4jKdNBul',  // $44.99 one-time (LTO) - updated
  },
  studio: {
    monthly: 'price_1SgfXhPoOsAS6r2gO8VQvbDA',  // $74.99 one-time (LTO)
  },
  // Alias for backward compatibility
  veo_connoisseur: {
    monthly: 'price_1SgfXhPoOsAS6r2gO8VQvbDA',
  },
} as const;

// Credit boost amounts per plan
export const BOOST_CREDITS = {
  explorer: 375,
  professional: 1_000,
  ultimate: 2_500,
  studio: 5_000,
  veo_connoisseur: 5_000, // Alias
} as const;

// Credit boost pricing display (LTO pricing - was annual, now monthly)
export const BOOST_PRICING = {
  explorer: { monthly: 7.99 },
  professional: { monthly: 19.99 },
  ultimate: { monthly: 44.99 },
  studio: { monthly: 74.99 },
  veo_connoisseur: { monthly: 74.99 }, // Alias
} as const;

// Dodo Payments product IDs (monthly only)
export const DODO_PLAN_PRODUCTS = {
  explorer: {
    monthly: 'pdt_sWvSDyXU1PVSQRmLMS73c',
  },
  professional: {
    monthly: 'pdt_SdYFUQLtaFIXIYLZONFDy',
  },
  ultimate: {
    monthly: 'pdt_9Yeryv7tq4tXneVFJt5my',
  },
  studio: {
    monthly: 'pdt_Hxf2vEkGfRUAL0irgjsDV',
  },
  // Keep veo_connoisseur as alias for backward compatibility
  veo_connoisseur: {
    monthly: 'pdt_Hxf2vEkGfRUAL0irgjsDV',
  },
} as const;

// Token allocations by plan
export const PLAN_TOKENS = {
  freemium: 5,
  explorer: 375,
  professional: 1_000,
  ultimate: 2_500,
  studio: 5_000,
  veo_connoisseur: 5_000, // Alias for backward compatibility
} as const;

export type PlanKey = keyof typeof STRIPE_PLAN_PRICES;
export type BoostPlanKey = keyof typeof STRIPE_BOOST_PRICES;
export type BillingPeriod = 'monthly';
export type PaymentProvider = 'dodo' | 'stripe';

/**
 * Normalize plan name for backward compatibility
 * Maps veo_connoisseur to studio for display purposes
 */
export function normalizePlanName(plan: string): string {
  return plan === 'veo_connoisseur' ? 'studio' : plan;
}

/**
 * Get display name for a plan
 */
export function getPlanDisplayName(plan: string): string {
  const displayNames: Record<string, string> = {
    freemium: 'Free',
    explorer: 'Explorer',
    professional: 'Professional',
    ultimate: 'Ultimate',
    studio: 'Studio',
    veo_connoisseur: 'Studio',
  };
  return displayNames[plan] || plan;
}

/**
 * Calculate per-credit cost for display
 */
export function getPerCreditCost(plan: string): string {
  const normalizedPlan = normalizePlanName(plan) as BoostPlanKey;
  const pricing = BOOST_PRICING[normalizedPlan];
  const credits = BOOST_CREDITS[normalizedPlan];
  
  if (!pricing || !credits) return '—';
  
  const price = pricing.monthly;
  const perCredit = price / credits;
  
  return `$${perCredit.toFixed(3)}`;
}
