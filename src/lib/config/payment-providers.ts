/**
 * Payment Provider Configuration
 * 
 * Centralized configuration for Dodo Payments (primary) and Stripe (backup)
 */

// Stripe price IDs for all plans
export const STRIPE_PLAN_PRICES = {
  explorer: {
    monthly: 'price_1SgVT7KukgJ0qrjRav72Oyh8',
    annual: 'price_1SgVTqKukgJ0qrjRfiT4vD9d',
  },
  professional: {
    monthly: 'price_1SgVUGKukgJ0qrjR4M4c51u8',
    annual: 'price_1SgVUvKukgJ0qrjRHsjfniMo',
  },
  ultimate: {
    monthly: 'price_1SgVWvKukgJ0qrjRAdy7UZ0i',
    annual: 'price_1SgVXcKukgJ0qrjRvJMdTPYP',
  },
  veo_connoisseur: {
    monthly: 'price_1SgVXvKukgJ0qrjRgjFMjstO',
    annual: 'price_1SgVYGKukgJ0qrjRdLWq6dsh',
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
  freemium: 500,
  explorer: 10_000,
  professional: 32_500,
  ultimate: 75_000,
  veo_connoisseur: 200_000,
} as const;

export type PlanKey = keyof typeof STRIPE_PLAN_PRICES;
export type BillingPeriod = 'monthly' | 'annual';
export type PaymentProvider = 'dodo' | 'stripe';
