/**
 * Stripe Payments Webhook Handler
 * 
 * Handles Stripe webhook events for subscription payments (backup gateway)
 */
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";

const WEBHOOK_VERSION = "1.0-stripe-backup";

// Token allocations by plan
const PLAN_TOKENS: Record<string, number> = {
  freemium: 5,
  explorer: 375,
  professional: 1000,
  ultimate: 2500,
  veo_connoisseur: 5000,
};

// Map Stripe product IDs to plan names
const STRIPE_PRODUCT_TO_PLAN: Record<string, string> = {
  // Monthly products
  'prod_TdnfGrQLjOQ1XD': 'explorer',       // Explorer Monthly
  'prod_TdngwzaCGA5DOf': 'professional',   // Professional Monthly  
  'prod_TdngdRtIfuiw2c': 'ultimate',       // Ultimate Monthly
  'prod_TdnhHwKM0c3Den': 'veo_connoisseur', // Veo Connoisseur Monthly
  // Annual products
  'prod_TdngHGT1JsWDnL': 'explorer',       // Explorer Annual
  'prod_TdngF1VzGiEfBO': 'professional',   // Professional Annual
  'prod_TdnhfLnZrsQ5Bf': 'ultimate',       // Ultimate Annual
  'prod_TdnhievqGBX9KC': 'veo_connoisseur', // Veo Connoisseur Annual
};

Deno.serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);
  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('stripe-payments-webhook', requestId);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  try {
    logger.info('Webhook received', { metadata: { version: WEBHOOK_VERSION } });

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY not configured');
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    let event: Stripe.Event;

    // Verify webhook signature if secret is configured
    if (webhookSecret && signature) {
      try {
        event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
        logger.info('Webhook signature verified', { metadata: { eventType: event.type } });
      } catch (err) {
        logger.error('Webhook signature verification failed', err as Error);
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 401,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      // Parse without verification (not recommended for production)
      event = JSON.parse(body);
      logger.warn('Webhook received without signature verification');
    }

    // Idempotency check
    const { data: existingEvent } = await supabase
      .from('webhook_events')
      .select('id')
      .eq('idempotency_key', event.id)
      .maybeSingle();

    if (existingEvent) {
      logger.info('Duplicate webhook detected', { metadata: { eventId: event.id } });
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process event
    await handleStripeEvent(supabase, stripe, event, logger);

    // Record webhook event
    await supabase.from('webhook_events').insert({
      idempotency_key: event.id,
      event_type: event.type,
      processed_at: new Date().toISOString(),
    });

    logger.info('Webhook processed successfully', { metadata: { eventType: event.type } });

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...responseHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('Webhook processing failed', error as Error);
    return new Response(JSON.stringify({ error: 'Webhook processing failed' }), {
      status: 500,
      headers: { ...responseHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleStripeEvent(
  supabase: SupabaseClient,
  stripe: Stripe,
  event: Stripe.Event,
  logger: EdgeLogger
) {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(supabase, stripe, event.data.object as Stripe.Checkout.Session, logger);
      break;

    case 'invoice.payment_succeeded':
      await handleInvoicePaymentSucceeded(supabase, event.data.object as Stripe.Invoice, logger);
      break;

    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(supabase, event.data.object as Stripe.Invoice, logger);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(supabase, event.data.object as Stripe.Subscription, logger);
      break;

    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(supabase, event.data.object as Stripe.Subscription, logger);
      break;

    default:
      logger.info('Unhandled event type', { metadata: { eventType: event.type } });
  }
}

async function handleCheckoutCompleted(
  supabase: SupabaseClient,
  stripe: Stripe,
  session: Stripe.Checkout.Session,
  logger: EdgeLogger
) {
  const userId = session.metadata?.user_id;
  if (!userId) {
    logger.error('No user_id in session metadata');
    return;
  }

  // Get subscription details
  if (!session.subscription) {
    logger.warn('No subscription in checkout session');
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
  const productId = subscription.items.data[0]?.price?.product as string;
  const planKey = STRIPE_PRODUCT_TO_PLAN[productId] || 'explorer';
  const tokens = PLAN_TOKENS[planKey] || 500;

  logger.info('Checkout completed', { metadata: { userId, planKey, tokens, productId } });

  // Get current tokens
  const { data: currentSub } = await supabase
    .from('user_subscriptions')
    .select('tokens_remaining, tokens_total')
    .eq('user_id', userId)
    .maybeSingle();

  const newTokensRemaining = (currentSub?.tokens_remaining || 0) + tokens;
  const newTokensTotal = (currentSub?.tokens_total || 0) + tokens;

  // Update subscription with payment IDs (encryption happens via trigger)
  const { error } = await supabase
    .from('user_subscriptions')
    .update({
      plan: planKey,
      tokens_remaining: newTokensRemaining,
      tokens_total: newTokensTotal,
      status: 'active',
      stripe_subscription_id: subscription.id,
      stripe_customer_id: session.customer as string,
      payment_provider: 'stripe',
      current_period_start: subscription.current_period_start 
        ? new Date(subscription.current_period_start * 1000).toISOString() 
        : null,
      current_period_end: subscription.current_period_end 
        ? new Date(subscription.current_period_end * 1000).toISOString() 
        : null,
      last_webhook_event: 'checkout.session.completed',
      last_webhook_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    logger.error('Error updating subscription', error as unknown as Error);
    throw error;
  }

  // Audit log - sanitized (no raw payment IDs)
  await supabase.from('audit_logs').insert({
    user_id: userId,
    action: 'webhook.stripe.checkout_completed',
    resource_type: 'subscription',
    resource_id: subscription.id,
    metadata: { plan: planKey, tokens, provider: 'stripe' },
  });
}

async function handleInvoicePaymentSucceeded(
  supabase: SupabaseClient,
  invoice: Stripe.Invoice,
  logger: EdgeLogger
) {
  // Only handle subscription renewals (not initial payments)
  if (invoice.billing_reason !== 'subscription_cycle') {
    return;
  }

  const customerId = invoice.customer as string;
  
  // Find user by Stripe customer ID using secure lookup (supports encrypted IDs)
  const { data: lookupResult, error: lookupError } = await supabase
    .rpc('find_user_by_stripe_customer', { p_customer_id: customerId });

  const subscription = lookupResult?.[0];
  if (lookupError || !subscription) {
    logger.warn('No subscription found for customer', { metadata: { customerId: '[REDACTED]' } });
    return;
  }

  const tokens = PLAN_TOKENS[subscription.plan] || 500;

  logger.info('Subscription renewed', { metadata: { userId: subscription.user_id, tokens } });

  // Get current tokens and add new allocation
  const { data: currentSub } = await supabase
    .from('user_subscriptions')
    .select('tokens_remaining, tokens_total')
    .eq('user_id', subscription.user_id)
    .single();

  if (currentSub) {
    await supabase
      .from('user_subscriptions')
      .update({
        tokens_remaining: currentSub.tokens_remaining + tokens,
        tokens_total: (currentSub.tokens_total || 0) + tokens,
        status: 'active',
        last_webhook_event: 'invoice.payment_succeeded',
        last_webhook_at: new Date().toISOString(),
      })
      .eq('user_id', subscription.user_id);
  }
}

async function handleInvoicePaymentFailed(
  supabase: SupabaseClient,
  invoice: Stripe.Invoice,
  logger: EdgeLogger
) {
  const customerId = invoice.customer as string;

  // Find user by Stripe customer ID using secure lookup
  const { data: lookupResult } = await supabase
    .rpc('find_user_by_stripe_customer', { p_customer_id: customerId });

  const subscription = lookupResult?.[0];
  if (!subscription) {
    return;
  }

  logger.warn('Payment failed', { metadata: { userId: subscription.user_id } });

  await supabase
    .from('user_subscriptions')
    .update({
      status: 'payment_failed',
      last_webhook_event: 'invoice.payment_failed',
      last_webhook_at: new Date().toISOString(),
    })
    .eq('user_id', subscription.user_id);
}

async function handleSubscriptionDeleted(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription,
  logger: EdgeLogger
) {
  const customerId = subscription.customer as string;

  // Find user by Stripe customer ID using secure lookup
  const { data: lookupResult } = await supabase
    .rpc('find_user_by_stripe_customer', { p_customer_id: customerId });

  const userSub = lookupResult?.[0];
  if (!userSub) {
    return;
  }

  logger.info('Subscription cancelled', { metadata: { userId: userSub.user_id } });

  // Downgrade to freemium
  await supabase
    .from('user_subscriptions')
    .update({
      plan: 'freemium',
      tokens_remaining: 5,
      tokens_total: 5,
      status: 'cancelled',
      stripe_subscription_id: null,
      last_webhook_event: 'customer.subscription.deleted',
      last_webhook_at: new Date().toISOString(),
    })
    .eq('user_id', userSub.user_id);
}

async function handleSubscriptionUpdated(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription,
  logger: EdgeLogger
) {
  const customerId = subscription.customer as string;

  // Find user by Stripe customer ID using secure lookup
  const { data: lookupResult } = await supabase
    .rpc('find_user_by_stripe_customer', { p_customer_id: customerId });

  const userSub = lookupResult?.[0];
  if (!userSub) {
    return;
  }

  // Get new plan from subscription
  const productId = subscription.items.data[0]?.price?.product as string;
  const planKey = STRIPE_PRODUCT_TO_PLAN[productId];

  if (planKey) {
    logger.info('Subscription updated', { metadata: { userId: userSub.user_id, newPlan: planKey } });

    await supabase
      .from('user_subscriptions')
      .update({
        plan: planKey,
        current_period_end: subscription.current_period_end 
          ? new Date(subscription.current_period_end * 1000).toISOString() 
          : null,
        last_webhook_event: 'customer.subscription.updated',
        last_webhook_at: new Date().toISOString(),
      })
      .eq('user_id', userSub.user_id);
  }
}
