/**
 * Unified Payment Edge Function
 * 
 * Primary: Dodo Payments
 * Failover: Stripe (automatic when Dodo fails)
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";

// Dodo Payments product IDs
const DODO_PLAN_PRODUCTS = {
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

// Stripe price IDs (backup)
const STRIPE_PLAN_PRICES = {
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

type PlanKey = keyof typeof DODO_PLAN_PRODUCTS;
type BillingPeriod = 'monthly' | 'annual';

// Retry helper with exponential backoff
async function fetchWithRetry(url: string, options: RequestInit, maxAttempts = 3): Promise<Response> {
  const delays = [400, 800, 1600];
  const urlObj = new URL(url);
  const hostname = urlObj.hostname;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      const isLastAttempt = attempt === maxAttempts - 1;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // DNS fallback on last attempt
      if ((errorMessage.includes('dns error') || errorMessage.includes('lookup address')) && isLastAttempt) {
        try {
          const dnsResponse = await fetch(
            `https://cloudflare-dns.com/dns-query?name=${hostname}&type=A`,
            { headers: { Accept: 'application/dns-json' } }
          );
          const dnsData = await dnsResponse.json();
          if (dnsData.Answer?.length > 0) {
            const ipAddress = dnsData.Answer[0].data;
            const ipUrl = url.replace(hostname, ipAddress);
            const ipOptions = { ...options, headers: { ...options.headers, Host: hostname } };
            return await fetch(ipUrl, ipOptions);
          }
        } catch {
          throw new Error('DNS_ERROR');
        }
        throw new Error('DNS_ERROR');
      }

      if (isLastAttempt) throw error;
      await new Promise(resolve => setTimeout(resolve, delays[attempt]));
    }
  }
  throw new Error('Max retry attempts reached');
}

// Try Dodo Payments
async function tryDodoPayment(
  logger: EdgeLogger,
  dodoApiKey: string,
  planKey: PlanKey,
  billingPeriod: BillingPeriod,
  userId: string,
  email: string,
  fullName: string,
  successUrl: string,
  cancelUrl: string
): Promise<{ checkout_url: string; session_id: string }> {
  const productId = DODO_PLAN_PRODUCTS[planKey][billingPeriod];
  const isTestMode = dodoApiKey.startsWith('test_');
  const dodoBaseUrl = isTestMode ? 'https://test.dodopayments.com' : 'https://live.dodopayments.com';

  logger.info('Attempting Dodo Payments', { metadata: { planKey, billingPeriod, environment: isTestMode ? 'test' : 'live' } });

  const response = await fetchWithRetry(`${dodoBaseUrl}/checkouts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${dodoApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      product_cart: [{ product_id: productId, quantity: 1 }],
      payment_link_settings: { success_url: successUrl, cancel_url: cancelUrl },
      customer: { email, name: fullName },
      metadata: { user_id: userId, plan: planKey, billing_period: billingPeriod },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Dodo API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return { checkout_url: data.checkout_url, session_id: data.session_id };
}

// Try Stripe (backup)
async function tryStripePayment(
  logger: EdgeLogger,
  stripeKey: string,
  planKey: PlanKey,
  billingPeriod: BillingPeriod,
  userId: string,
  email: string,
  successUrl: string,
  cancelUrl: string
): Promise<{ checkout_url: string; session_id: string }> {
  const priceId = STRIPE_PLAN_PRICES[planKey][billingPeriod];

  logger.info('Attempting Stripe failover', { metadata: { planKey, billingPeriod, priceId } });

  const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });

  // Check for existing customer
  const customers = await stripe.customers.list({ email, limit: 1 });
  const customerId = customers.data.length > 0 ? customers.data[0].id : undefined;

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    customer_email: customerId ? undefined : email,
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      user_id: userId,
      plan: planKey,
      billing_period: billingPeriod,
      failover_from: 'dodo',
    },
  });

  return { checkout_url: session.url!, session_id: session.id };
}

Deno.serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);
  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('create-payment', requestId);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const dodoApiKey = Deno.env.get('DODO_PAYMENTS_API_KEY');
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');

    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { plan, isAnnual, appOrigin } = await req.json();

    // Validate plan
    const planKey = plan.toLowerCase().replace(' ', '_') as PlanKey;
    if (!DODO_PLAN_PRODUCTS[planKey]) {
      throw new Error('Invalid plan selected');
    }

    const billingPeriod: BillingPeriod = isAnnual ? 'annual' : 'monthly';

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', user.id)
      .single();

    const email = profile?.email || user.email || '';
    const fullName = profile?.full_name || '';
    const baseUrl = appOrigin || req.headers.get('origin') || 'https://artifio-create-flow.lovable.app';
    const successUrl = `${baseUrl}/dashboard/create?payment=success`;
    const cancelUrl = `${baseUrl}/pricing?payment=cancelled`;

    let result: { checkout_url: string; session_id: string; provider: 'dodo' | 'stripe' };
    let usedProvider: 'dodo' | 'stripe' = 'dodo';

    // Primary: Try Dodo Payments
    if (dodoApiKey) {
      try {
        const dodoResult = await tryDodoPayment(
          logger, dodoApiKey, planKey, billingPeriod,
          user.id, email, fullName, successUrl, cancelUrl
        );
        result = { ...dodoResult, provider: 'dodo' };
        logger.info('Dodo payment session created', { metadata: { sessionId: result.session_id } });
      } catch (dodoError) {
        const errorMessage = dodoError instanceof Error ? dodoError.message : 'Unknown Dodo error';
        logger.warn('Dodo payment failed, attempting Stripe failover', { metadata: { error: errorMessage } });

        // Failover: Try Stripe
        if (stripeKey) {
          const stripeResult = await tryStripePayment(
            logger, stripeKey, planKey, billingPeriod,
            user.id, email, successUrl, cancelUrl
          );
          result = { ...stripeResult, provider: 'stripe' };
          usedProvider = 'stripe';
          logger.info('Stripe failover successful', { metadata: { sessionId: result.session_id } });
        } else {
          // No Stripe key, return DNS error
          if (errorMessage === 'DNS_ERROR') {
            return new Response(
              JSON.stringify({
                error: 'Payment service temporarily unavailable. Please retry in a few seconds.',
                code: 'SERVICE_UNAVAILABLE',
              }),
              { status: 503, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
            );
          }
          throw dodoError;
        }
      }
    } else if (stripeKey) {
      // No Dodo key, use Stripe directly
      const stripeResult = await tryStripePayment(
        logger, stripeKey, planKey, billingPeriod,
        user.id, email, successUrl, cancelUrl
      );
      result = { ...stripeResult, provider: 'stripe' };
      usedProvider = 'stripe';
    } else {
      throw new Error('No payment provider configured');
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'payment.session_created',
      resource_type: 'subscription',
      metadata: {
        plan: planKey,
        billing_period: billingPeriod,
        provider: usedProvider,
        session_id: result.session_id,
      },
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...responseHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('Error creating payment session', error as Error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...responseHeaders, 'Content-Type': 'application/json' },
    });
  }
});
