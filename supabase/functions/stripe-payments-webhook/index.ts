/**
 * Stripe Payments Webhook Handler
 * 
 * Handles Stripe webhook events for subscription payments (backup gateway)
 * 
 * PRICING POLICY COMPLIANCE:
 * - Cancellation: 30-day grace period with frozen credits
 * - Downgrade: Applied at end of billing period
 * - Upgrade: Immediate with full tier credits added
 * - Resubscription during grace: Restores frozen credits
 */
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";

const WEBHOOK_VERSION = "2.0-grace-period";

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

// Grace period duration in days
const GRACE_PERIOD_DAYS = 30;

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
  event_type: 'activated' | 'upgraded' | 'downgraded' | 'cancelled' | 'renewed' | 'boost_purchased' | 'resubscribed';
  plan_name: string;
  previous_plan?: string;
  tokens_added?: number;
  grace_period_end?: string;
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

  // Check if user is in grace period (resubscription)
  const { data: currentSub } = await supabase
    .from('user_subscriptions')
    .select('tokens_remaining, tokens_total, frozen_credits, grace_period_end')
    .eq('user_id', userId)
    .maybeSingle();

  let newTokensRemaining = tokens;
  let newTokensTotal = tokens;
  let restoredCredits = 0;

  // RESUBSCRIPTION: Restore frozen credits if within grace period
  if (currentSub?.grace_period_end && currentSub?.frozen_credits) {
    const gracePeriodEnd = new Date(currentSub.grace_period_end);
    if (gracePeriodEnd > new Date()) {
      restoredCredits = currentSub.frozen_credits;
      newTokensRemaining = restoredCredits + tokens;
      newTokensTotal = restoredCredits + tokens;
      logger.info('Grace period resubscription - restoring frozen credits', {
        metadata: { restoredCredits, newBalance: newTokensRemaining }
      });
    }
  } else {
    // Normal new subscription - add tokens to any existing balance
    newTokensRemaining = (currentSub?.tokens_remaining || 0) + tokens;
    newTokensTotal = (currentSub?.tokens_total || 0) + tokens;
  }

  // Update subscription with payment IDs, clear grace period fields
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
      // Clear grace period and pending downgrade fields
      grace_period_end: null,
      frozen_credits: null,
      pending_downgrade_plan: null,
      pending_downgrade_at: null,
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

  // Send appropriate email
  if (profile?.email) {
    try {
      if (restoredCredits > 0) {
        // Resubscription email
        await sendSubscriptionEmail(supabase, {
          user_id: userId,
          email: profile.email,
          event_type: 'resubscribed',
          plan_name: planKey,
          tokens_added: restoredCredits,
        }, logger);
      } else {
        // New subscription email
        await sendSubscriptionEmail(supabase, {
          user_id: userId,
          email: profile.email,
          event_type: 'activated',
          plan_name: planKey,
          tokens_added: tokens,
        }, logger);
      }
    } catch (emailError) {
      logger.warn('Failed to send subscription email', { metadata: { errorMessage: (emailError as Error).message } });
    }
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    user_id: userId,
    action: restoredCredits > 0 ? 'webhook.stripe.resubscribed' : 'webhook.stripe.checkout_completed',
    resource_type: 'subscription',
    resource_id: subscription.id,
    metadata: { plan: planKey, tokens, restoredCredits, provider: 'stripe', billingPeriod },
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

/**
 * CANCELLATION HANDLER - 30-DAY GRACE PERIOD
 * 
 * Per pricing policy:
 * - Credits frozen for 30 days after billing cycle ends
 * - Resubscribing within grace period restores full credit balance
 * - After grace period, credits removed permanently
 */
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

  logger.info('Subscription cancelled - starting 30-day grace period', { 
    metadata: { userId: userSub.user_id } 
  });

  const previousPlan = normalizePlanName(userSub.plan);

  // Get current credit balance to freeze
  const { data: currentSub } = await supabase
    .from('user_subscriptions')
    .select('tokens_remaining')
    .eq('user_id', userSub.user_id)
    .single();

  // Calculate grace period end (30 days from now)
  const gracePeriodEnd = new Date();
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + GRACE_PERIOD_DAYS);

  // Set grace period status - freeze credits instead of wiping them
  await supabase
    .from('user_subscriptions')
    .update({
      status: 'grace_period',
      grace_period_end: gracePeriodEnd.toISOString(),
      frozen_credits: currentSub?.tokens_remaining || 0,
      // Keep credits available during grace period
      // They will be wiped by the cron job after grace period expires
      stripe_subscription_id: null,
      last_webhook_event: 'customer.subscription.deleted',
      last_webhook_at: new Date().toISOString(),
    })
    .eq('user_id', userSub.user_id);

  // Get user email and send cancellation notification with grace period info
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
        grace_period_end: gracePeriodEnd.toISOString(),
      }, logger);
    } catch (emailError) {
      logger.warn('Failed to send cancellation email', { metadata: { errorMessage: (emailError as Error).message } });
    }
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    user_id: userSub.user_id,
    action: 'webhook.stripe.cancelled_grace_period',
    resource_type: 'subscription',
    resource_id: subscription.id,
    metadata: { 
      previousPlan, 
      frozenCredits: currentSub?.tokens_remaining || 0,
      gracePeriodEnd: gracePeriodEnd.toISOString(),
    },
  });
}

/**
 * SUBSCRIPTION UPDATE HANDLER - UPGRADE/DOWNGRADE LOGIC
 * 
 * Per pricing policy:
 * - Upgrade: Immediate, prorated charge, add full new tier credits immediately
 * - Downgrade: Applied at end of billing cycle, keep existing credits
 */
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
  const isDowngrade = getPlanRank(newPlanKey) < getPlanRank(previousPlan);
  
  logger.info('Subscription updated', { 
    metadata: { 
      userId: userSub.user_id, 
      newPlan: newPlanKey, 
      previousPlan, 
      isUpgrade,
      isDowngrade,
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

  if (isUpgrade && planChanged) {
    // UPGRADE: Immediate - add full new tier credits
    const tokensToAdd = PLAN_TOKENS[newPlanKey] || 0;
    logger.info('Upgrade detected - adding full tier credits immediately', { 
      metadata: { tokensToAdd, existingBalance: currentSub?.tokens_remaining } 
    });

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
        // Clear any pending downgrade
        pending_downgrade_plan: null,
        pending_downgrade_at: null,
        last_webhook_event: 'customer.subscription.updated',
        last_webhook_at: new Date().toISOString(),
      })
      .eq('user_id', userSub.user_id);

    // Send upgrade email
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
          event_type: 'upgraded',
          plan_name: newPlanKey,
          previous_plan: previousPlan,
          tokens_added: tokensToAdd,
        }, logger);
      } catch (emailError) {
        logger.warn('Failed to send upgrade email', { metadata: { errorMessage: (emailError as Error).message } });
      }
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: userSub.user_id,
      action: 'webhook.stripe.upgraded',
      resource_type: 'subscription',
      resource_id: subscription.id,
      metadata: { 
        newPlan: newPlanKey, 
        previousPlan, 
        tokensAdded: tokensToAdd,
        newBillingPeriod,
      },
    });

  } else if (isDowngrade && planChanged) {
    // DOWNGRADE: Deferred to end of billing period
    // Per spec: "Your current plan stays active until the end of your billing cycle"
    const downgradeAt = subscription.current_period_end 
      ? new Date(subscription.current_period_end * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    logger.info('Downgrade detected - scheduling for end of billing period', { 
      metadata: { 
        pendingPlan: newPlanKey, 
        downgradeAt: downgradeAt.toISOString() 
      } 
    });

    // Note: Stripe already handles the actual plan change at period end
    // We just track it for UI display and the cron job handles credit adjustment
    await supabase
      .from('user_subscriptions')
      .update({
        pending_downgrade_plan: newPlanKey,
        pending_downgrade_at: downgradeAt.toISOString(),
        billing_period: newBillingPeriod,
        current_period_end: downgradeAt.toISOString(),
        last_webhook_event: 'customer.subscription.updated',
        last_webhook_at: new Date().toISOString(),
      })
      .eq('user_id', userSub.user_id);

    // Send downgrade scheduled email
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
          event_type: 'downgraded',
          plan_name: newPlanKey,
          previous_plan: previousPlan,
        }, logger);
      } catch (emailError) {
        logger.warn('Failed to send downgrade email', { metadata: { errorMessage: (emailError as Error).message } });
      }
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: userSub.user_id,
      action: 'webhook.stripe.downgrade_scheduled',
      resource_type: 'subscription',
      resource_id: subscription.id,
      metadata: { 
        currentPlan: previousPlan,
        pendingPlan: newPlanKey, 
        downgradeAt: downgradeAt.toISOString(),
        newBillingPeriod,
      },
    });

  } else {
    // Billing period change only (or same-tier change)
    await supabase
      .from('user_subscriptions')
      .update({
        plan: newPlanKey,
        billing_period: newBillingPeriod,
        current_period_end: subscription.current_period_end 
          ? new Date(subscription.current_period_end * 1000).toISOString() 
          : null,
        last_webhook_event: 'customer.subscription.updated',
        last_webhook_at: new Date().toISOString(),
      })
      .eq('user_id', userSub.user_id);

    // Audit log for billing period change
    if (billingPeriodChanged) {
      await supabase.from('audit_logs').insert({
        user_id: userSub.user_id,
        action: 'webhook.stripe.billing_period_changed',
        resource_type: 'subscription',
        resource_id: subscription.id,
        metadata: { 
          plan: newPlanKey,
          previousBillingPeriod,
          newBillingPeriod,
        },
      });
    }
  }
}
