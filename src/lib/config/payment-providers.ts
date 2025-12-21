/**
 * Payment Provider Configuration
 * 
 * Centralized configuration for Dodo Payments (primary) and Stripe (backup)
 */

// Stripe price IDs for subscription plans
export const STRIPE_PLAN_PRICES = {
  explorer: {
    monthly: 'price_1SgW4XPoOsAS6r2g0o1PwDKO',
    annual: 'price_1SgW4oPoOsAS6r2gbgWJb1tf',
  },
  professional: {
    monthly: 'price_1SgW53PoOsAS6r2guIoU83bt',
    annual: 'price_1SgW5GPoOsAS6r2gjxjE5ppb',
  },
  ultimate: {
    monthly: 'price_1SgW5WPoOsAS6r2gcuNO6kuU',
    annual: 'price_1SgW5mPoOsAS6r2gRYDBWtMf',
  },
  studio: {
    monthly: 'price_1SgW6HPoOsAS6r2gaW9gV4so',
    annual: 'price_1SgW6WPoOsAS6r2gtXoPfLJi',
  },
  // Keep veo_connoisseur as alias for backward compatibility
  veo_connoisseur: {
    monthly: 'price_1SgW6HPoOsAS6r2gaW9gV4so',
    annual: 'price_1SgW6WPoOsAS6r2gtXoPfLJi',
  },
} as const;

// Stripe price IDs for one-time credit boost purchases
export const STRIPE_BOOST_PRICES = {
  explorer: {
    monthly: 'price_1SgfHHPoOsAS6r2g1322tXh2', // $9.99 one-time
    annual: 'price_1SgfO5PoOsAS6r2gxPML0cfE',  // $7.99 one-time
  },
  professional: {
    monthly: 'price_1SgfOIPoOsAS6r2g49SPcB8m', // $24.99 one-time
    annual: 'price_1SgfQ7PoOsAS6r2gOaeUL5iZ',  // $19.99 one-time
  },
  ultimate: {
    monthly: 'price_1SgfT8PoOsAS6r2gJaOCa1Y0', // $49.99 one-time
    annual: 'price_1SgfTcPoOsAS6r2g4jKdNBul',  // $39.99 one-time
  },
  studio: {
    monthly: 'price_1SgfTxPoOsAS6r2gk7ZI4tFC', // $94.99 one-time
    annual: 'price_1SgfXhPoOsAS6r2gO8VQvbDA',  // $74.99 one-time
  },
  // Alias for backward compatibility
  veo_connoisseur: {
    monthly: 'price_1SgfTxPoOsAS6r2gk7ZI4tFC',
    annual: 'price_1SgfXhPoOsAS6r2gO8VQvbDA',
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

// Credit boost pricing display
export const BOOST_PRICING = {
  explorer: { monthly: 9.99, annual: 7.99 },
  professional: { monthly: 24.99, annual: 19.99 },
  ultimate: { monthly: 49.99, annual: 39.99 },
  studio: { monthly: 94.99, annual: 74.99 },
  veo_connoisseur: { monthly: 94.99, annual: 74.99 }, // Alias
} as const;

// Dodo Payments product IDs
export const DODO_PLAN_PRODUCTS = {
  explorer: {
    monthly: 'pdt_sWvSDyXU1PVSQRmLMS73c',
    annual: 'pdt_puVmR1qtPto0GFsEg37X6',
  },
  professional: {
    monthly: 'pdt_SdYFUQLtaFIXIYLZONFDy',
    annual: 'pdt_37iTzseOiYUKtj01FIk3L',
  },
  ultimate: {
    monthly: 'pdt_9Yeryv7tq4tXneVFJt5my',
    annual: 'pdt_dgOCQNEbwmqnCcRVCWFms',
  },
  studio: {
    monthly: 'pdt_Hxf2vEkGfRUAL0irgjsDV',
    annual: 'pdt_6DvfNg7cAMlACiyJ01dFk',
  },
  // Keep veo_connoisseur as alias for backward compatibility
  veo_connoisseur: {
    monthly: 'pdt_Hxf2vEkGfRUAL0irgjsDV',
    annual: 'pdt_6DvfNg7cAMlACiyJ01dFk',
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
export type BillingPeriod = 'monthly' | 'annual';
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
export function getPerCreditCost(plan: string, billingPeriod: BillingPeriod): string {
  const normalizedPlan = normalizePlanName(plan) as BoostPlanKey;
  const pricing = BOOST_PRICING[normalizedPlan];
  const credits = BOOST_CREDITS[normalizedPlan];
  
  if (!pricing || !credits) return '—';
  
  const price = billingPeriod === 'annual' ? pricing.annual : pricing.monthly;
  const perCredit = price / credits;
  
  return `$${perCredit.toFixed(3)}`;
}
