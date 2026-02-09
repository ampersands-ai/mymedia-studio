/**
 * Create One-Time Payment Edge Function
 * 
 * Creates a checkout session for credit boost purchases.
 * Primary: Dodo Payments
 * Failover: Stripe (automatic when Dodo fails)
 * Only available to paid subscribers at their current plan rate.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { edgeBrand } from "../_shared/brand.ts";

// Dodo Payments product IDs for one-time credit boosts
const DODO_BOOST_PRODUCTS: Record<string, string> = {
  explorer: 'pdt_LTO_EXPLORER_BOOST',      // Replace with actual Dodo product ID
  professional: 'pdt_LTO_PROFESSIONAL_BOOST',
  ultimate: 'pdt_LTO_ULTIMATE_BOOST',
  studio: 'pdt_LTO_STUDIO_BOOST',
  veo_connoisseur: 'pdt_LTO_STUDIO_BOOST', // alias
};

// Stripe price IDs for one-time credit boosts (backup)
const STRIPE_BOOST_PRICES: Record<string, string> = {
  explorer: 'price_1SgfO5PoOsAS6r2gxPML0cfE',      // $7.99
  professional: 'price_1SgfQ7PoOsAS6r2gOaeUL5iZ',  // $19.99
  ultimate: 'price_1SgfTcPoOsAS6r2g4jKdNBul',      // $44.99
  studio: 'price_1SgfXhPoOsAS6r2gO8VQvbDA',        // $74.99
  veo_connoisseur: 'price_1SgfXhPoOsAS6r2gO8VQvbDA', // alias
};

// Credit amounts per plan
const BOOST_CREDITS: Record<string, number> = {
  explorer: 375,
  professional: 1000,
  ultimate: 2500,
  studio: 5000,
  veo_connoisseur: 5000,
};

// Normalize plan name for backward compatibility
function normalizePlanName(plan: string): string {
  return plan === 'veo_connoisseur' ? 'studio' : plan;
}

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
      
      if ((errorMessage.includes('dns error') || errorMessage.includes('lookup address')) && isLastAttempt) {
        try {
          const dnsResponse = await fetch(
            `https://cloudflare-dns.com/dns-query?name=${hostname}&type=A`,
            { headers: { 'Accept': 'application/dns-json' } }
          );
          const dnsData = await dnsResponse.json();
          
          if (dnsData.Answer && dnsData.Answer.length > 0) {
            const ipAddress = dnsData.Answer[0].data;
            const ipUrl = url.replace(hostname, ipAddress);
            const ipOptions = {
              ...options,
              headers: { ...options.headers, 'Host': hostname }
            };
            return await fetch(ipUrl, ipOptions);
          }
          throw new Error('DNS_ERROR');
        } catch {
          throw new Error('DNS_ERROR');
        }
      }
      
      if (isLastAttempt) throw error;
      await new Promise(resolve => setTimeout(resolve, delays[attempt]));
    }
  }
  throw new Error('Max retry attempts reached');
}

// Try Dodo Payments for one-time purchase
async function tryDodoPayment(
  logger: EdgeLogger,
  dodoApiKey: string,
  plan: string,
  userId: string,
  email: string,
  profileName: string,
  creditsToAdd: number,
  successUrl: string,
  cancelUrl: string
): Promise<{ checkout_url: string; session_id: string }> {
  const productId = DODO_BOOST_PRODUCTS[plan];
  
  if (!productId || productId.includes('LTO_')) {
    throw new Error('Dodo boost products not configured');
  }
  
  const isTestMode = dodoApiKey.startsWith('test_');
  const dodoBaseUrl = isTestMode ? 'https://test.dodopayments.com' : 'https://live.dodopayments.com';

  logger.info('Attempting Dodo Payments for boost', { 
    metadata: { plan, credits: creditsToAdd, environment: isTestMode ? 'test' : 'live' } 
  });

  const response = await fetchWithRetry(`${dodoBaseUrl}/checkouts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${dodoApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      product_cart: [{ product_id: productId, quantity: 1 }],
      payment_link_settings: {
        success_url: successUrl,
        cancel_url: cancelUrl,
      },
      // Only send email - don't send name to avoid mismatch with existing Dodo customer
      customer: {
        email: email,
      },
      metadata: {
        user_id: userId,
        boost_type: plan,
        credits_to_add: creditsToAdd.toString(),
        plan: plan,
        purchase_type: 'one_time_boost',
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Dodo API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return {
    checkout_url: data.checkout_url,
    session_id: data.session_id,
  };
}

// Fallback to Stripe
async function tryStripePayment(
  logger: EdgeLogger,
  stripeKey: string,
  plan: string,
  userId: string,
  email: string | undefined,
  customerId: string | undefined,
  creditsToAdd: number,
  successUrl: string,
  cancelUrl: string
): Promise<{ checkout_url: string; session_id: string }> {
  const priceId = STRIPE_BOOST_PRICES[plan];
  
  if (!priceId) {
    throw new Error(`No Stripe boost pricing found for plan: ${plan}`);
  }

  logger.info('Attempting Stripe fallback for boost', { metadata: { plan, credits: creditsToAdd } });

  const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });

  const checkoutParams: Stripe.Checkout.SessionCreateParams = {
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      user_id: userId,
      boost_type: plan,
      credits_to_add: creditsToAdd.toString(),
      plan: plan,
      failover_from: 'dodo',
    },
  };

  if (customerId) {
    checkoutParams.customer = customerId;
  } else if (email) {
    checkoutParams.customer_email = email;
    checkoutParams.customer_creation = 'always';
  }

  const session = await stripe.checkout.sessions.create(checkoutParams);
  
  return {
    checkout_url: session.url!,
    session_id: session.id,
  };
}

Deno.serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);
  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('create-one-time-payment', requestId);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  try {
    logger.info('One-time payment request received');

    const dodoApiKey = Deno.env.get('DODO_PAYMENTS_API_KEY');
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!dodoApiKey && !stripeKey) {
      throw new Error('No payment provider configured');
    }

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header provided');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      throw new Error('User not authenticated');
    }

    const userId = userData.user.id;
    const userEmail = userData.user.email;
    logger.info('User authenticated', { metadata: { userId } });

    // Get user's current subscription
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('plan, stripe_customer_id, dodo_customer_id, status, payment_provider')
      .eq('user_id', userId)
      .maybeSingle();

    if (subError) {
      throw new Error(`Failed to fetch subscription: ${subError.message}`);
    }

    if (!subscription) {
      throw new Error('No subscription found');
    }

    const plan = subscription.plan?.toLowerCase();
    const status = subscription.status?.toLowerCase();

    // Check if user is on freemium (not allowed to buy boosts)
    if (plan === 'freemium' || !plan) {
      throw new Error('Credit boosts are only available to paid subscribers. Please upgrade to a paid plan first.');
    }

    // Check if subscription is active
    if (status !== 'active') {
      throw new Error('Credit boosts are only available to active subscribers. Please renew your subscription first.');
    }

    const normalizedPlan = normalizePlanName(plan);
    const creditsToAdd = BOOST_CREDITS[normalizedPlan] || BOOST_CREDITS[plan];
    
    if (!creditsToAdd) {
      throw new Error(`No credit amount found for plan: ${plan}`);
    }

    logger.info('Creating boost checkout session', { 
      metadata: { plan: normalizedPlan, credits: creditsToAdd } 
    });

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, profile_name')
      .eq('id', userId)
      .single();

    // Parse request body for optional settings
    const body = await req.json().catch(() => ({}));
    const appOrigin = body.appOrigin || req.headers.get('origin') || edgeBrand.appUrl;
    const successUrl = `${appOrigin}/dashboard/settings?tab=billing&boost=success`;
    const cancelUrl = `${appOrigin}/dashboard/settings?tab=billing&boost=cancelled`;

    let result: { checkout_url: string; session_id: string; provider: 'dodo' | 'stripe' };
    let usedProvider: 'dodo' | 'stripe' = 'dodo';

    // Primary: Try Dodo Payments
    if (dodoApiKey) {
      try {
        const dodoResult = await tryDodoPayment(
          logger,
          dodoApiKey,
          normalizedPlan,
          userId,
          profile?.email || userEmail || '',
          profile?.profile_name || '',
          creditsToAdd,
          successUrl,
          cancelUrl
        );
        result = { ...dodoResult, provider: 'dodo' };
        logger.info('Dodo boost session created', { metadata: { sessionId: result.session_id } });
      } catch (dodoError) {
        const errorMessage = dodoError instanceof Error ? dodoError.message : 'Unknown Dodo error';
        logger.warn('Dodo payment failed, attempting Stripe failover', { metadata: { error: errorMessage } });

        // Failover: Try Stripe
        if (stripeKey) {
          usedProvider = 'stripe';
          
          // Get or find Stripe customer ID
          let stripeCustomerId = subscription.stripe_customer_id;
          if (!stripeCustomerId && userEmail) {
            const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });
            const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
            if (customers.data.length > 0) {
              stripeCustomerId = customers.data[0].id;
              await supabase
                .from('user_subscriptions')
                .update({ stripe_customer_id: stripeCustomerId })
                .eq('user_id', userId);
            }
          }
          
          const stripeResult = await tryStripePayment(
            logger,
            stripeKey,
            normalizedPlan,
            userId,
            userEmail,
            stripeCustomerId,
            creditsToAdd,
            successUrl,
            cancelUrl
          );
          result = { ...stripeResult, provider: 'stripe' };
          logger.info('Stripe boost session created (failover)', { metadata: { sessionId: result.session_id } });
        } else {
          throw dodoError;
        }
      }
    } else if (stripeKey) {
      // No Dodo key, use Stripe directly
      usedProvider = 'stripe';
      let stripeCustomerId = subscription.stripe_customer_id;
      
      if (!stripeCustomerId && userEmail) {
        const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });
        const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
        if (customers.data.length > 0) {
          stripeCustomerId = customers.data[0].id;
        }
      }
      
      const stripeResult = await tryStripePayment(
        logger,
        stripeKey,
        normalizedPlan,
        userId,
        userEmail,
        stripeCustomerId,
        creditsToAdd,
        successUrl,
        cancelUrl
      );
      result = { ...stripeResult, provider: 'stripe' };
    } else {
      throw new Error('No payment provider available');
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action: 'boost.checkout.created',
      resource_type: 'payment',
      resource_id: result.session_id,
      metadata: { 
        plan: normalizedPlan, 
        credits: creditsToAdd,
        provider: usedProvider,
      },
    });

    return new Response(JSON.stringify({ 
      checkout_url: result.checkout_url,
      session_id: result.session_id,
      credits: creditsToAdd,
      plan: normalizedPlan,
      provider: usedProvider,
    }), {
      headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('One-time payment creation failed', error as Error);
    
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
