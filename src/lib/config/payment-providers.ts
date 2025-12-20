/**
 * Payment Provider Configuration
 * 
 * Centralized configuration for Dodo Payments (primary) and Stripe (backup)
 */

// Stripe price IDs for all plans
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
  veo_connoisseur: {
    monthly: 'price_1SgW6HPoOsAS6r2gaW9gV4so',
    annual: 'price_1SgW6WPoOsAS6r2gtXoPfLJi',
  },
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
  veo_connoisseur: 5_000,
} as const;

export type PlanKey = keyof typeof STRIPE_PLAN_PRICES;
export type BillingPeriod = 'monthly' | 'annual';
export type PaymentProvider = 'dodo' | 'stripe';
