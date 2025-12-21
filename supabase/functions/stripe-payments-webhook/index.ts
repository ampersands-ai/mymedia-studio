/**
 * Stripe Payments Webhook Handler
 * 
 * Handles Stripe webhook events for subscription payments (backup gateway)
 */
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";

const WEBHOOK_VERSION = "1.1-stripe-boost";

// Token allocations by plan
const PLAN_TOKENS: Record<string, number> = {
  freemium: 5,
  explorer: 375,
  professional: 1000,
  ultimate: 2500,
  studio: 5000,
  veo_connoisseur: 5000, // Alias for backward compatibility
};

// Map Stripe product IDs to plan names
const STRIPE_PRODUCT_TO_PLAN: Record<string, string> = {
  // Monthly subscription products
  'prod_TdnfGrQLjOQ1XD': 'explorer',       // Explorer Monthly
  'prod_TdngwzaCGA5DOf': 'professional',   // Professional Monthly  
  'prod_TdngdRtIfuiw2c': 'ultimate',       // Ultimate Monthly
  'prod_TdnhHwKM0c3Den': 'studio',         // Studio Monthly (was veo_connoisseur)
  // Annual subscription products
  'prod_TdngHGT1JsWDnL': 'explorer',       // Explorer Annual
  'prod_TdngF1VzGiEfBO': 'professional',   // Professional Annual
  'prod_TdnhfLnZrsQ5Bf': 'ultimate',       // Ultimate Annual
  'prod_TdnhievqGBX9KC': 'studio',         // Studio Annual (was veo_connoisseur)
};

// Normalize plan name for backward compatibility
function normalizePlanName(plan: string): string {
  return plan === 'veo_connoisseur' ? 'studio' : plan;
}

// Get billing period from Stripe subscription
function getBillingPeriod(subscription: Stripe.Subscription): 'monthly' | 'annual' {
  const interval = subscription.items.data[0]?.price?.recurring?.interval;
  return interval === 'year' ? 'annual' : 'monthly';
}

// Helper to determine plan ranking for upgrade/downgrade detection
function getPlanRank(plan: string): number {
  const normalizedPlan = normalizePlanName(plan);
  const ranks: Record<string, number> = {
    freemium: 0,
    explorer: 1,
    professional: 2,
    ultimate: 3,
    studio: 4,
    veo_connoisseur: 4, // Same rank as studio
  };
  return ranks[normalizedPlan] ?? 0;
}

// Helper to send subscription emails
interface SubscriptionEmailPayload {
  user_id: string;
  email: string;
  event_type: 'activated' | 'upgraded' | 'downgraded' | 'cancelled' | 'renewed' | 'boost_purchased';
  plan_name: string;
  previous_plan?: string;
  tokens_added?: number;
}

async function sendSubscriptionEmail(
  supabase: SupabaseClient,
  payload: SubscriptionEmailPayload,
  logger: EdgeLogger
): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  const response = await fetch(`${supabaseUrl}/functions/v1/send-subscription-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseServiceKey}`,
    },
    body: JSON.stringify(payload),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Email send failed: ${errorText}`);
  }
  
  logger.info('Subscription email sent', { metadata: { event_type: payload.event_type, plan: payload.plan_name } });
}

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
      await handleSubscriptionUpdated(supabase, stripe, event.data.object as Stripe.Subscription, logger);
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

  // Check if this is a one-time boost purchase
  const boostType = session.metadata?.boost_type;
  if (boostType && session.mode === 'payment') {
    await handleBoostPurchase(supabase, session, logger);
    return;
  }

  // Handle subscription checkout
  if (!session.subscription) {
    logger.warn('No subscription in checkout session');
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
  const productId = subscription.items.data[0]?.price?.product as string;
  const planKey = normalizePlanName(STRIPE_PRODUCT_TO_PLAN[productId] || 'explorer');
  const tokens = PLAN_TOKENS[planKey] || 500;
  const billingPeriod = getBillingPeriod(subscription);

  logger.info('Checkout completed', { metadata: { userId, planKey, tokens, productId, billingPeriod } });

  // Get current tokens
  const { data: currentSub } = await supabase
    .from('user_subscriptions')
    .select('tokens_remaining, tokens_total')
    .eq('user_id', userId)
    .maybeSingle();

  const newTokensRemaining = (currentSub?.tokens_remaining || 0) + tokens;
  const newTokensTotal = (currentSub?.tokens_total || 0) + tokens;

  // Update subscription with payment IDs and billing period
  const { error } = await supabase
    .from('user_subscriptions')
    .update({
      plan: planKey,
      billing_period: billingPeriod,
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

  // Get user email for notification
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .maybeSingle();

  // Send subscription activated email
  if (profile?.email) {
    try {
      await sendSubscriptionEmail(supabase, {
        user_id: userId,
        email: profile.email,
        event_type: 'activated',
        plan_name: planKey,
        tokens_added: tokens,
      }, logger);
    } catch (emailError) {
      logger.warn('Failed to send subscription email', { metadata: { errorMessage: (emailError as Error).message } });
    }
  }

  // Audit log - sanitized (no raw payment IDs)
  await supabase.from('audit_logs').insert({
    user_id: userId,
    action: 'webhook.stripe.checkout_completed',
    resource_type: 'subscription',
    resource_id: subscription.id,
    metadata: { plan: planKey, tokens, provider: 'stripe', billingPeriod },
  });
}

async function handleBoostPurchase(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
  logger: EdgeLogger
) {
  const userId = session.metadata?.user_id;
  const boostType = session.metadata?.boost_type;
  const creditsToAdd = parseInt(session.metadata?.credits_to_add || '0');

  if (!userId || !boostType || creditsToAdd <= 0) {
    logger.error('Invalid boost purchase metadata');
    return;
  }

  logger.info('Processing boost purchase', { 
    metadata: { userId, boostType, creditsToAdd } 
  });

  // Get current subscription
  const { data: currentSub, error: subError } = await supabase
    .from('user_subscriptions')
    .select('tokens_remaining, tokens_total')
    .eq('user_id', userId)
    .single();

  if (subError || !currentSub) {
    logger.error('Failed to fetch current subscription for boost', subError as unknown as Error);
    return;
  }

  // Add credits to existing balance
  const { error: updateError } = await supabase
    .from('user_subscriptions')
    .update({
      tokens_remaining: currentSub.tokens_remaining + creditsToAdd,
      tokens_total: currentSub.tokens_total + creditsToAdd,
      last_webhook_event: 'boost.payment.completed',
      last_webhook_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (updateError) {
    logger.error('Failed to add boost credits', updateError as unknown as Error);
    return;
  }

  logger.info('Boost credits added successfully', { 
    metadata: { 
      userId, 
      creditsAdded: creditsToAdd,
      newBalance: currentSub.tokens_remaining + creditsToAdd 
    } 
  });

  // Get user email for notification
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .maybeSingle();

  // Send boost purchase confirmation email
  if (profile?.email) {
    try {
      await sendSubscriptionEmail(supabase, {
        user_id: userId,
        email: profile.email,
        event_type: 'boost_purchased',
        plan_name: boostType,
        tokens_added: creditsToAdd,
      }, logger);
    } catch (emailError) {
      logger.warn('Failed to send boost confirmation email', { 
        metadata: { errorMessage: (emailError as Error).message } 
      });
    }
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    user_id: userId,
    action: 'webhook.stripe.boost_completed',
    resource_type: 'boost',
    resource_id: session.id,
    metadata: { 
      boostType, 
      creditsAdded: creditsToAdd, 
      provider: 'stripe',
      sessionId: session.id,
    },
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

  const normalizedPlan = normalizePlanName(subscription.plan);
  const tokens = PLAN_TOKENS[normalizedPlan] || 500;

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

    // Get user email and send renewal notification
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', subscription.user_id)
      .maybeSingle();

    if (profile?.email) {
      try {
        await sendSubscriptionEmail(supabase, {
          user_id: subscription.user_id,
          email: profile.email,
          event_type: 'renewed',
          plan_name: normalizedPlan,
          tokens_added: tokens,
        }, logger);
      } catch (emailError) {
        logger.warn('Failed to send renewal email', { metadata: { errorMessage: (emailError as Error).message } });
      }
    }
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

  const previousPlan = normalizePlanName(userSub.plan);

  // Downgrade to freemium
  await supabase
    .from('user_subscriptions')
    .update({
      plan: 'freemium',
      billing_period: 'monthly',
      tokens_remaining: 5,
      tokens_total: 5,
      status: 'cancelled',
      stripe_subscription_id: null,
      last_webhook_event: 'customer.subscription.deleted',
      last_webhook_at: new Date().toISOString(),
    })
    .eq('user_id', userSub.user_id);

  // Get user email and send cancellation notification
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userSub.user_id)
    .maybeSingle();

  if (profile?.email) {
    try {
      await sendSubscriptionEmail(supabase, {
        user_id: userSub.user_id,
        email: profile.email,
        event_type: 'cancelled',
        plan_name: previousPlan,
      }, logger);
    } catch (emailError) {
      logger.warn('Failed to send cancellation email', { metadata: { errorMessage: (emailError as Error).message } });
    }
  }
}

async function handleSubscriptionUpdated(
  supabase: SupabaseClient,
  stripe: Stripe,
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

  // Get new plan and billing period from subscription
  const productId = subscription.items.data[0]?.price?.product as string;
  const newPlanKey = normalizePlanName(STRIPE_PRODUCT_TO_PLAN[productId] || userSub.plan);
  const newBillingPeriod = getBillingPeriod(subscription);
  const previousPlan = normalizePlanName(userSub.plan);
  const previousBillingPeriod = userSub.billing_period || 'monthly';

  // Check if plan or billing period changed
  const planChanged = newPlanKey !== previousPlan;
  const billingPeriodChanged = newBillingPeriod !== previousBillingPeriod;

  if (!planChanged && !billingPeriodChanged) {
    // No significant changes, just update period end
    await supabase
      .from('user_subscriptions')
      .update({
        current_period_end: subscription.current_period_end 
          ? new Date(subscription.current_period_end * 1000).toISOString() 
          : null,
        last_webhook_event: 'customer.subscription.updated',
        last_webhook_at: new Date().toISOString(),
      })
      .eq('user_id', userSub.user_id);
    return;
  }

  const isUpgrade = getPlanRank(newPlanKey) > getPlanRank(previousPlan);
  
  logger.info('Subscription updated', { 
    metadata: { 
      userId: userSub.user_id, 
      newPlan: newPlanKey, 
      previousPlan, 
      isUpgrade,
      newBillingPeriod,
      previousBillingPeriod,
      planChanged,
      billingPeriodChanged,
    } 
  });

  // Get current tokens
  const { data: currentSub } = await supabase
    .from('user_subscriptions')
    .select('tokens_remaining, tokens_total')
    .eq('user_id', userSub.user_id)
    .single();

  // REVISED UPGRADE LOGIC: On upgrade, add FULL new tier credits
  // Existing credits stay in account, new tier credits added on top
  let tokensToAdd = 0;
  if (isUpgrade && planChanged) {
    tokensToAdd = PLAN_TOKENS[newPlanKey] || 0;
    logger.info('Upgrade detected - adding full tier credits', { 
      metadata: { tokensToAdd, existingBalance: currentSub?.tokens_remaining } 
    });
  }

  // Update subscription
  await supabase
    .from('user_subscriptions')
    .update({
      plan: newPlanKey,
      billing_period: newBillingPeriod,
      tokens_remaining: (currentSub?.tokens_remaining || 0) + tokensToAdd,
      tokens_total: (currentSub?.tokens_total || 0) + tokensToAdd,
      current_period_end: subscription.current_period_end 
        ? new Date(subscription.current_period_end * 1000).toISOString() 
        : null,
      last_webhook_event: 'customer.subscription.updated',
      last_webhook_at: new Date().toISOString(),
    })
    .eq('user_id', userSub.user_id);

  // Get user email and send plan change notification (only if plan changed, not just billing period)
  if (planChanged) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userSub.user_id)
      .maybeSingle();

    if (profile?.email) {
      try {
        await sendSubscriptionEmail(supabase, {
          user_id: userSub.user_id,
          email: profile.email,
          event_type: isUpgrade ? 'upgraded' : 'downgraded',
          plan_name: newPlanKey,
          previous_plan: previousPlan,
          tokens_added: isUpgrade ? tokensToAdd : undefined,
        }, logger);
      } catch (emailError) {
        logger.warn('Failed to send plan change email', { metadata: { errorMessage: (emailError as Error).message } });
      }
    }
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    user_id: userSub.user_id,
    action: planChanged 
      ? (isUpgrade ? 'webhook.stripe.upgraded' : 'webhook.stripe.downgraded')
      : 'webhook.stripe.billing_period_changed',
    resource_type: 'subscription',
    resource_id: subscription.id,
    metadata: { 
      newPlan: newPlanKey, 
      previousPlan, 
      isUpgrade,
      tokensAdded: tokensToAdd,
      newBillingPeriod,
      previousBillingPeriod,
    },
  });
}
