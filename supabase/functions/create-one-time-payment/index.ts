/**
 * Create One-Time Payment Edge Function
 * 
 * Creates a Stripe checkout session for credit boost purchases.
 * Only available to paid subscribers at their current plan rate.
 * All pricing now uses limited time offer rates (formerly annual pricing).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";

// Stripe price IDs for one-time credit boosts (LTO pricing)
const STRIPE_BOOST_PRICES: Record<string, string> = {
  explorer: 'price_1SgfO5PoOsAS6r2gxPML0cfE',      // $7.99
  professional: 'price_1SgfQ7PoOsAS6r2gOaeUL5iZ',  // $19.99
  ultimate: 'price_1SgfTcPoOsAS6r2g4jKdNBul',      // $44.99 (updated)
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

Deno.serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);
  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('create-one-time-payment', requestId);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  try {
    logger.info('One-time payment request received');

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY not configured');
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
      .select('plan, stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (subError) {
      throw new Error(`Failed to fetch subscription: ${subError.message}`);
    }

    if (!subscription) {
      throw new Error('No subscription found');
    }

    const plan = subscription.plan?.toLowerCase();

    // Check if user is on freemium (not allowed to buy boosts)
    if (plan === 'freemium' || !plan) {
      throw new Error('Credit boosts are only available to paid subscribers. Please upgrade to a paid plan first.');
    }

    // Get the correct price ID for user's plan
    const normalizedPlan = normalizePlanName(plan);
    const priceId = STRIPE_BOOST_PRICES[normalizedPlan];
    
    if (!priceId) {
      throw new Error(`No boost pricing found for plan: ${plan}`);
    }

    const creditsToAdd = BOOST_CREDITS[normalizedPlan] || BOOST_CREDITS[plan];
    if (!creditsToAdd) {
      throw new Error(`No credit amount found for plan: ${plan}`);
    }

    logger.info('Creating boost checkout session', { 
      metadata: { plan: normalizedPlan, credits: creditsToAdd, priceId } 
    });

    // Parse request body for optional settings
    const body = await req.json().catch(() => ({}));
    const appOrigin = body.appOrigin || req.headers.get('origin') || 'https://artifio.ai';

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });

    // Use existing Stripe customer if available
    let customerId = subscription.stripe_customer_id;
    
    // If no customer ID, try to find by email
    if (!customerId && userEmail) {
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      }
    }

    // Create checkout session for one-time payment
    const session = await stripe.checkout.sessions.create({
      customer: customerId || undefined,
      customer_email: customerId ? undefined : userEmail,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${appOrigin}/dashboard/settings?tab=billing&boost=success`,
      cancel_url: `${appOrigin}/dashboard/settings?tab=billing&boost=cancelled`,
      metadata: {
        user_id: userId,
        boost_type: normalizedPlan,
        credits_to_add: creditsToAdd.toString(),
        plan: normalizedPlan,
      },
    });

    logger.info('Boost checkout session created', { 
      metadata: { sessionId: session.id, plan: normalizedPlan, credits: creditsToAdd } 
    });

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action: 'boost.checkout.created',
      resource_type: 'payment',
      resource_id: session.id,
      metadata: { plan: normalizedPlan, credits: creditsToAdd },
    });

    return new Response(JSON.stringify({ 
      checkout_url: session.url,
      session_id: session.id,
      credits: creditsToAdd,
      plan: normalizedPlan,
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
