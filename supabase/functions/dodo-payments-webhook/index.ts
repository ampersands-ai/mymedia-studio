/**
 * Dodo Payments Webhook Handler - v2.1 - Grace Period Support
 * 
 * PRICING POLICY COMPLIANCE:
 * - Cancellation: 30-day grace period with frozen credits
 * - Upgrade: Immediate with full tier credits added
 * - Downgrade: Applied at end of billing period
 * - Resubscription during grace: Restores frozen credits
 */
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Webhook } from "https://esm.sh/svix@1";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { createSafeErrorResponse } from "../_shared/error-handler.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { GENERATION_STATUS } from "../_shared/constants.ts";

const WEBHOOK_VERSION = "2.1-grace-period";
const GRACE_PERIOD_DAYS = 30;

// Type definitions
interface WebhookEvent {
  type?: string;
  event_type?: string;
  data?: WebhookEventData;
  [key: string]: unknown;
}

interface WebhookEventData {
  payment_id?: string;
  subscription_id?: string;
  customer_id?: string;
  metadata?: {
    user_id?: string;
    plan?: string;
    billing_period?: string;
    new_plan?: string;
    [key: string]: unknown;
  };
  customer?: {
    email?: string;
  };
  amount?: number;
  currency?: string;
  current_period_start?: string;
  current_period_end?: string;
  [key: string]: unknown;
}

const PLAN_TOKENS = {
  'freemium': 5,
  'explorer': 375,
  'professional': 1000,
  'ultimate': 2500,
  'studio': 5000,
  'veo_connoisseur': 5000,
};

// Helper to determine plan ranking for upgrade/downgrade detection
function getPlanRank(plan: string): number {
  const normalizedPlan = plan === 'veo_connoisseur' ? 'studio' : plan;
  const ranks: Record<string, number> = {
    freemium: 0,
    explorer: 1,
    professional: 2,
    ultimate: 3,
    studio: 4,
  };
  return ranks[normalizedPlan] ?? 0;
}

Deno.serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);
  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('dodo-payments-webhook', requestId);
  
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  try {
    logger.info('Webhook deployed', { 
      metadata: { version: WEBHOOK_VERSION, features: ['grace-period', 'deferred-downgrade'] }
    });
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const webhookSecret = Deno.env.get('DODO_WEBHOOK_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // SECURITY: Webhook secret is required
    if (!webhookSecret) {
      logger.critical('DODO_WEBHOOK_KEY not configured', new Error('Missing webhook secret'));
      return new Response(
        JSON.stringify({ error: 'Webhook secret not configured' }),
        { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Read the body once
    const bodyText = await req.text();
    
    // Normalize headers: support both svix-* and webhook-* prefixes
    const svixId = req.headers.get('svix-id') || req.headers.get('webhook-id');
    const svixTimestamp = req.headers.get('svix-timestamp') || req.headers.get('webhook-timestamp');
    const svixSignature = req.headers.get('svix-signature') || req.headers.get('webhook-signature');
    
    const headerSet = req.headers.get('svix-id') ? 'svix-*' : 'webhook-*';
    
    logger.info('Webhook received', {
      metadata: {
        version: WEBHOOK_VERSION,
        headerSet,
        svixId: svixId || 'unknown',
        headers: {
          id: svixId ? 'present' : 'missing',
          timestamp: svixTimestamp ? 'present' : 'missing',
          signature: svixSignature ? 'present' : 'missing'
        }
      }
    });
    
    if (!svixSignature || !svixId || !svixTimestamp) {
      logger.warn('Missing webhook signature headers', {
        metadata: { headerSet, svixId, svixTimestamp, svixSignature: svixSignature ? 'present' : 'missing' }
      });
      return new Response(
        JSON.stringify({ error: 'Missing webhook signature headers' }),
        { status: 401, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // SECURITY: Verify webhook using Svix library
    try {
      // Step 1: Validate timestamp freshness (prevent replay attacks)
      const timestamp = parseInt(svixTimestamp);
      const now = Math.floor(Date.now() / 1000);
      const MAX_TIMESTAMP_AGE = 5 * 60; // 5 minutes
      
      if (isNaN(timestamp) || Math.abs(now - timestamp) > MAX_TIMESTAMP_AGE) {
        logger.warn('Timestamp validation failed', {
          metadata: {
            timestamp, 
            now, 
            diff: now - timestamp,
            reason: isNaN(timestamp) ? 'invalid_timestamp' : 'timestamp_expired'
          }
        });
        return new Response(
          JSON.stringify({ error: 'Webhook timestamp expired or invalid' }),
          { status: 401, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const wh = new Webhook(webhookSecret);
      
      // Prepare normalized headers for Svix verification
      const headersNormalized = {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      };
      
      // Step 2: Verify the webhook payload using Svix library
      const event = wh.verify(bodyText, headersNormalized) as WebhookEvent;
      const eventType = event.type || event.event_type;
      
      logger.info('Svix signature verified', {
        metadata: { headerSet, eventType }
      });

      // Step 3: Check for duplicate webhook using idempotency
      const eventData = event.data || event;
      const idempotencyKey = eventData.payment_id || eventData.subscription_id || svixId;
      
      const { data: existingEvent } = await supabase
        .from('webhook_events')
        .select('id')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();
      
      if (existingEvent) {
        logger.info('Duplicate webhook detected', { 
          metadata: { idempotencyKey, isDuplicate: true }
        });
        return new Response(JSON.stringify({ received: true, duplicate: true }), {
          status: 200,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      logger.info('Processing new webhook', { 
        metadata: { idempotencyKey, isDuplicate: false }
      });

      // Step 4: Process the event
      logger.info('Processing webhook event', { metadata: { idempotencyKey, eventType } });
      await handleWebhookEvent(supabase, event, logger);
      
      // Step 5: Record webhook event for idempotency
      await supabase.from('webhook_events').insert({
        idempotency_key: idempotencyKey,
        event_type: eventType,
        processed_at: new Date().toISOString()
      });

      logger.info('Webhook processed successfully', { metadata: { idempotencyKey, eventType } });
      
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      });
    } catch (verifyError) {
      logger.error('Svix verification failed', verifyError instanceof Error ? verifyError : new Error(String(verifyError)), {
        metadata: {
          headerSet,
          bodyLength: bodyText.length,
          timestamp: svixTimestamp
        }
      });
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    logger.error('Webhook processing failed', error instanceof Error ? error : new Error(String(error)));
    return createSafeErrorResponse(error, 'dodo-payments-webhook', responseHeaders);
  }
});

async function handleWebhookEvent(supabase: SupabaseClient, event: WebhookEvent, logger: EdgeLogger) {
  const eventType = event.type || event.event_type;
  const eventData = event.data || (event as unknown as WebhookEventData);

  // Extract metadata (user_id, plan, etc.)
  const metadata = eventData.metadata || {};
  let userId = metadata.user_id;

  // Fallback: If user_id is missing from metadata, try to find user by email
  if (!userId && eventData.customer?.email) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', eventData.customer.email)
      .single();
    
    if (profile && !profileError) {
      userId = profile.id;
    } else {
      throw new Error(`User not found for email: ${eventData.customer.email}`);
    }
  }

  if (!userId) {
    throw new Error('No user_id in metadata and no customer email to lookup');
  }

  // Update last webhook event
  if (userId) {
    await supabase
      .from('user_subscriptions')
      .update({
        last_webhook_event: eventType,
        last_webhook_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
  }

  switch (eventType) {
    case 'payment.succeeded':
      await handlePaymentSucceeded(supabase, eventData, metadata, logger);
      break;

    case 'payment.failed':
      await handlePaymentFailed(supabase, eventData, metadata, logger);
      break;

    case 'subscription.active':
      await handleSubscriptionActive(supabase, eventData, metadata, logger);
      break;

    case 'subscription.cancelled':
      await handleSubscriptionCancelled(supabase, eventData, metadata, logger);
      break;

    case 'subscription.expired':
      await handleSubscriptionExpired(supabase, eventData, metadata, logger);
      break;

    case 'subscription.renewed':
      await handleSubscriptionRenewed(supabase, eventData, metadata, logger);
      break;

    case 'subscription.plan_changed':
      await handleSubscriptionPlanChanged(supabase, eventData, metadata, logger);
      break;

    case 'subscription.on_hold':
      await handleSubscriptionOnHold(supabase, eventData, metadata, logger);
      break;

    case 'refund.succeeded':
      await handleRefundSucceeded(supabase, eventData, metadata, logger);
      break;

    default:
      logger.info('Unhandled event type', { metadata: { eventType } });
  }

  // Log to audit trail
  if (userId) {
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action: `webhook.dodo.${eventType}`,
      resource_type: 'subscription',
      resource_id: eventData.subscription_id || eventData.payment_id,
      metadata: { event_type: eventType, timestamp: new Date().toISOString() },
    });
  }
}

async function handlePaymentSucceeded(
  supabase: SupabaseClient, 
  data: WebhookEventData, 
  metadata: WebhookEventData['metadata'],
  logger: EdgeLogger
) {
  if (!metadata) {
    throw new Error('Missing metadata in payment succeeded event');
  }
  
  const userId = metadata.user_id;
  if (!userId) {
    throw new Error('Missing user_id in metadata');
  }
  
  const planName = metadata.plan || 'freemium';
  const planKey = planName.toLowerCase().replace(' ', '_') as keyof typeof PLAN_TOKENS;
  const tokens = PLAN_TOKENS[planKey] || 500;

  logger.info('Payment succeeded', { metadata: { userId, planName, tokens } });

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
    // Normal subscription - add tokens to existing balance
    newTokensRemaining = (currentSub?.tokens_remaining || 0) + tokens;
    newTokensTotal = (currentSub?.tokens_total || 0) + tokens;
  }

  // Calculate next billing date
  const nextBillingDate = data.current_period_end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // Update subscription with added tokens, clear grace period
  const { error } = await supabase
    .from('user_subscriptions')
    .update({
      plan: planKey,
      tokens_remaining: newTokensRemaining,
      tokens_total: newTokensTotal,
      status: 'active',
      dodo_subscription_id: data.subscription_id,
      dodo_customer_id: data.customer_id,
      current_period_start: data.current_period_start || new Date().toISOString(),
      current_period_end: nextBillingDate,
      // Clear grace period fields
      grace_period_end: null,
      frozen_credits: null,
      pending_downgrade_plan: null,
      pending_downgrade_at: null,
    })
    .eq('user_id', userId);

  if (error) {
    logger.error('Error updating subscription', error as Error);
    throw error;
  }

  // Get user email for notification
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .maybeSingle();

  // Send appropriate email with receipt info
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
          amount_paid: data.amount,
          currency: data.currency?.toUpperCase() || 'USD',
          invoice_id: data.payment_id,
          next_billing_date: nextBillingDate,
        }, logger);
      } else {
        // New subscription email with receipt
        await sendSubscriptionEmail(supabase, {
          user_id: userId,
          email: profile.email,
          event_type: 'activated',
          plan_name: planKey,
          tokens_added: tokens,
          amount_paid: data.amount,
          currency: data.currency?.toUpperCase() || 'USD',
          invoice_id: data.payment_id,
          next_billing_date: nextBillingDate,
        }, logger);
      }
    } catch (emailError) {
      logger.warn('Failed to send subscription email', { metadata: { errorMessage: (emailError as Error).message } });
    }
  }

  if (restoredCredits > 0) {
    logger.info('Resubscription complete - credits restored', {
      metadata: { userId, restoredCredits, totalBalance: newTokensRemaining }
    });
  }
}

async function handlePaymentFailed(
  supabase: SupabaseClient, 
  data: WebhookEventData, 
  metadata: WebhookEventData['metadata'],
  logger: EdgeLogger
) {
  const userId = metadata?.user_id;
  logger.warn('Payment failed', { metadata: { userId } });

  await supabase
    .from('user_subscriptions')
    .update({ status: 'payment_failed' })
    .eq('user_id', userId);
}

async function handleSubscriptionActive(
  supabase: SupabaseClient, 
  data: WebhookEventData, 
  metadata: WebhookEventData['metadata'],
  logger: EdgeLogger
) {
  const userId = metadata?.user_id;
  logger.info('Subscription activated', { metadata: { userId } });

  await supabase
    .from('user_subscriptions')
    .update({
      status: 'active',
      dodo_subscription_id: data.subscription_id,
      current_period_start: data.current_period_start || new Date().toISOString(),
      current_period_end: data.current_period_end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .eq('user_id', userId);
}

/**
 * CANCELLATION HANDLER - 30-DAY GRACE PERIOD
 */
async function handleSubscriptionCancelled(
  supabase: SupabaseClient, 
  data: WebhookEventData, 
  metadata: WebhookEventData['metadata'],
  logger: EdgeLogger
) {
  const userId = metadata?.user_id;
  logger.info('Subscription cancelled - starting 30-day grace period', { metadata: { userId } });

  // Get current credit balance to freeze
  const { data: currentSub } = await supabase
    .from('user_subscriptions')
    .select('tokens_remaining, plan')
    .eq('user_id', userId)
    .single();

  // Calculate grace period end (30 days from now)
  const gracePeriodEnd = new Date();
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + GRACE_PERIOD_DAYS);

  // Set grace period status - freeze credits
  await supabase
    .from('user_subscriptions')
    .update({ 
      status: 'grace_period',
      grace_period_end: gracePeriodEnd.toISOString(),
      frozen_credits: currentSub?.tokens_remaining || 0,
      dodo_subscription_id: null,
    })
    .eq('user_id', userId);

  logger.info('Grace period started', {
    metadata: { 
      userId, 
      frozenCredits: currentSub?.tokens_remaining,
      gracePeriodEnd: gracePeriodEnd.toISOString() 
    }
  });
}

async function handleSubscriptionExpired(
  supabase: SupabaseClient, 
  data: WebhookEventData, 
  metadata: WebhookEventData['metadata'],
  logger: EdgeLogger
) {
  const userId = metadata?.user_id;
  logger.info('Subscription expired - downgrading to freemium', { metadata: { userId } });

  // Downgrade to freemium - this happens after grace period via cron job typically
  await supabase
    .from('user_subscriptions')
    .update({
      plan: 'freemium',
      tokens_remaining: PLAN_TOKENS.freemium,
      tokens_total: PLAN_TOKENS.freemium,
      status: 'expired',
      grace_period_end: null,
      frozen_credits: null,
      dodo_subscription_id: null,
      dodo_customer_id: null,
    })
    .eq('user_id', userId);
}

// Helper to send subscription emails
async function sendSubscriptionEmail(
  supabase: SupabaseClient,
  payload: {
    user_id: string;
    email: string;
    event_type: string;
    plan_name: string;
    tokens_added?: number;
    amount_paid?: number;
    currency?: string;
    invoice_id?: string;
    next_billing_date?: string;
  },
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

async function handleSubscriptionRenewed(
  supabase: SupabaseClient, 
  data: WebhookEventData, 
  metadata: WebhookEventData['metadata'],
  logger: EdgeLogger
) {
  const userId = metadata?.user_id;
  const planName = metadata?.plan || 'freemium';
  const planKey = planName.toLowerCase().replace(' ', '_') as keyof typeof PLAN_TOKENS;
  const tokens = PLAN_TOKENS[planKey] || 500;

  logger.info('Subscription renewed', { metadata: { userId, tokens } });

  // Get current subscription
  const { data: currentSub } = await supabase
    .from('user_subscriptions')
    .select('tokens_remaining, tokens_total')
    .eq('user_id', userId)
    .single();

  if (!currentSub) {
    throw new Error('Subscription not found');
  }

  // Calculate next billing date
  const nextBillingDate = data.current_period_end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // Add new tokens
  await supabase
    .from('user_subscriptions')
    .update({
      tokens_remaining: currentSub.tokens_remaining + tokens,
      tokens_total: (currentSub.tokens_total || 0) + tokens,
      status: 'active',
      current_period_end: nextBillingDate,
    })
    .eq('user_id', userId);

  // Get user email for notification
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .maybeSingle();

  // Send renewal email with receipt
  if (profile?.email && userId) {
    try {
      await sendSubscriptionEmail(supabase, {
        user_id: userId,
        email: profile.email,
        event_type: 'renewed',
        plan_name: planKey,
        tokens_added: tokens,
        amount_paid: data.amount,
        currency: data.currency?.toUpperCase() || 'USD',
        invoice_id: data.payment_id,
        next_billing_date: nextBillingDate,
      }, logger);
    } catch (emailError) {
      logger.warn('Failed to send renewal email', { metadata: { errorMessage: (emailError as Error).message } });
    }
  }
}

/**
 * PLAN CHANGE HANDLER - UPGRADE/DOWNGRADE LOGIC
 */
async function handleSubscriptionPlanChanged(
  supabase: SupabaseClient, 
  data: WebhookEventData, 
  metadata: WebhookEventData['metadata'],
  logger: EdgeLogger
) {
  if (!metadata) {
    throw new Error('Missing metadata in plan changed event');
  }
  
  const userId = metadata?.user_id;
  if (!userId) {
    throw new Error('Missing user_id in metadata');
  }
  
  const newPlan = metadata?.new_plan || metadata?.plan;
  if (!newPlan) {
    throw new Error('Missing plan information in metadata');
  }
  
  const planKey = newPlan.toLowerCase().replace(' ', '_') as keyof typeof PLAN_TOKENS;
  const newTokens = PLAN_TOKENS[planKey] || 500;

  // Get current subscription to determine upgrade vs downgrade
  const { data: currentSub } = await supabase
    .from('user_subscriptions')
    .select('plan, tokens_remaining, tokens_total')
    .eq('user_id', userId)
    .single();

  const currentPlan = currentSub?.plan || 'freemium';
  const isUpgrade = getPlanRank(planKey) > getPlanRank(currentPlan);
  const isDowngrade = getPlanRank(planKey) < getPlanRank(currentPlan);

  logger.info('Plan change detected', { 
    metadata: { userId, currentPlan, newPlan: planKey, isUpgrade, isDowngrade } 
  });

  if (isUpgrade) {
    // UPGRADE: Immediate - add full new tier credits
    const newTokensRemaining = (currentSub?.tokens_remaining || 0) + newTokens;
    const newTokensTotal = (currentSub?.tokens_total || 0) + newTokens;

    await supabase
      .from('user_subscriptions')
      .update({
        plan: planKey,
        tokens_remaining: newTokensRemaining,
        tokens_total: newTokensTotal,
        status: 'active',
        pending_downgrade_plan: null,
        pending_downgrade_at: null,
      })
      .eq('user_id', userId);

    logger.info('Upgrade applied immediately', {
      metadata: { userId, tokensAdded: newTokens, newBalance: newTokensRemaining }
    });

  } else if (isDowngrade) {
    // DOWNGRADE: Schedule for end of billing period
    const downgradeAt = data.current_period_end 
      ? new Date(data.current_period_end)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await supabase
      .from('user_subscriptions')
      .update({
        pending_downgrade_plan: planKey,
        pending_downgrade_at: downgradeAt.toISOString(),
        // Keep current plan active
      })
      .eq('user_id', userId);

    logger.info('Downgrade scheduled for end of billing period', {
      metadata: { userId, pendingPlan: planKey, downgradeAt: downgradeAt.toISOString() }
    });

  } else {
    // Same tier change (maybe billing period)
    await supabase
      .from('user_subscriptions')
      .update({
        plan: planKey,
        status: 'active',
      })
      .eq('user_id', userId);
  }
}

async function handleSubscriptionOnHold(
  supabase: SupabaseClient, 
  data: WebhookEventData, 
  metadata: WebhookEventData['metadata'],
  logger: EdgeLogger
) {
  const userId = metadata?.user_id;
  logger.warn('Subscription on hold', { metadata: { userId } });

  await supabase
    .from('user_subscriptions')
    .update({ status: 'on_hold' })
    .eq('user_id', userId);
}

async function handleRefundSucceeded(
  supabase: SupabaseClient, 
  data: WebhookEventData, 
  metadata: WebhookEventData['metadata'],
  logger: EdgeLogger
) {
  const userId = metadata?.user_id;
  const refundAmount = data.amount || 0;

  logger.info('Refund processed', { metadata: { userId, refundAmount } });

  // You may want to adjust credits here based on refund
  // For now just log it
}
