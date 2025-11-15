// Dodo Payments Webhook Handler - v2.0 - Fresh Deployment
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Webhook } from "https://esm.sh/svix@1";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { webhookLogger } from "../_shared/logger.ts";

const WEBHOOK_VERSION = "2.0-fresh-deployment";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PLAN_TOKENS = {
  'freemium': 500,
  'explorer': 10000,
  'professional': 32500,
  'ultimate': 75000,
  'veo_connoisseur': 200000,
};

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('dodo-webhook-v2', requestId);
  const webhookStartTime = Date.now();
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logger.info('Webhook deployed', { 
      metadata: { version: WEBHOOK_VERSION, features: ['svix-* headers', 'webhook-* headers'] }
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
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        headers: {
          svixId: svixId ? 'present' : 'missing',
          svixTimestamp: svixTimestamp ? 'present' : 'missing',
          svixSignature: svixSignature ? 'present' : 'missing'
        }
      }
    });
    
    if (!svixSignature || !svixId || !svixTimestamp) {
      logger.warn('Missing Svix webhook headers', {
        metadata: { svixId, svixTimestamp, svixSignature: svixSignature ? 'present' : 'missing' }
      });
      return new Response(
        JSON.stringify({ error: 'Missing webhook signature headers' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // SECURITY: Verify webhook using Svix library
    try {
      // Step 1: Validate timestamp freshness (prevent replay attacks)
      const timestamp = parseInt(svixTimestamp);
      const now = Math.floor(Date.now() / 1000);
      const MAX_TIMESTAMP_AGE = 5 * 60; // 5 minutes
      
      if (isNaN(timestamp) || Math.abs(now - timestamp) > MAX_TIMESTAMP_AGE) {
        logger.warn('Webhook timestamp validation failed', { 
          metadata: {
            timestamp, 
            now, 
            diff: now - timestamp,
            reason: isNaN(timestamp) ? 'invalid_timestamp' : 'timestamp_expired'
          }
        });
        return new Response(
          JSON.stringify({ error: 'Webhook timestamp expired or invalid' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
      const event = wh.verify(bodyText, headersNormalized) as any;
      logger.info('Security: Valid webhook verified via Svix', { metadata: { headerSet, eventType: event.type || event.event_type } });

      // Step 3: Check for duplicate webhook using idempotency
      const eventData = event.data || event;
      const idempotencyKey = eventData.payment_id || eventData.subscription_id || svixId;
      
      const { data: existingEvent } = await supabase
        .from('webhook_events')
        .select('id')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();
      
      if (existingEvent) {
        logger.warn('Duplicate webhook detected, ignoring', { metadata: { idempotencyKey } });
        return new Response(JSON.stringify({ received: true, duplicate: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Step 4: Process the event
      await handleWebhookEvent(supabase, event, webhookStartTime);
      
      // Step 5: Record webhook event for idempotency
      await supabase.from('webhook_events').insert({
        idempotency_key: idempotencyKey,
        event_type: event.type || event.event_type,
        processed_at: new Date().toISOString()
      });

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (verifyError) {
      logger.error(`Svix verification failed (using ${headerSet} headers)`, verifyError as Error, {
        metadata: {
          bodyLength: bodyText.length,
          timestamp: svixTimestamp
        }
      });
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    logger.error('Error processing webhook', error as Error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Track webhook analytics for failure
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    await supabase.from('webhook_analytics').insert({
      provider: 'dodo-payments',
      event_type: 'payment_event',
      status: 'failure',
      duration_ms: Date.now() - webhookStartTime,
      error_code: 'WEBHOOK_ERROR',
      metadata: { error: errorMessage }
    }).then(({ error: analyticsError }: { error: any }) => {
      if (analyticsError) logger.error('Failed to track analytics', analyticsError as Error);
    });
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleWebhookEvent(supabase: any, event: any, webhookStartTime: number) {
  const logger = new EdgeLogger('dodo-webhook-handler', crypto.randomUUID());
  const eventType = event.type || event.event_type;
  const eventData = event.data || event;

  logger.info('Processing webhook event', { metadata: { eventType } });

  // Extract metadata (user_id, plan, etc.)
  const metadata = eventData.metadata || {};
  let userId = metadata.user_id;
  const planName = metadata.plan || 'freemium';

  // Fallback: If user_id is missing from metadata, try to find user by email
  if (!userId && eventData.customer?.email) {
    logger.info('Finding user by email', { metadata: { email: eventData.customer.email } });
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', eventData.customer.email)
      .single();
    
    if (profile && !profileError) {
      webhookLogger.info('Found user by email fallback', { userId });
    } else {
      webhookLogger.error('Could not find user by email', profileError);
      throw new Error(`User not found for email: ${eventData.customer.email}`);
    }
  }

  if (!userId) {
    webhookLogger.error('No user_id in metadata and no customer email to lookup', new Error('Missing user identification'));
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
      await handlePaymentSucceeded(supabase, eventData, metadata);
      break;

    case 'payment.failed':
      await handlePaymentFailed(supabase, eventData, metadata);
      break;

    case 'subscription.active':
      await handleSubscriptionActive(supabase, eventData, metadata);
      break;

    case 'subscription.cancelled':
      await handleSubscriptionCancelled(supabase, eventData, metadata);
      break;

    case 'subscription.expired':
      await handleSubscriptionExpired(supabase, eventData, metadata);
      break;

    case 'subscription.renewed':
      await handleSubscriptionRenewed(supabase, eventData, metadata);
      break;

    case 'subscription.plan_changed':
      await handleSubscriptionPlanChanged(supabase, eventData, metadata);
      break;

    case 'subscription.on_hold':
      await handleSubscriptionOnHold(supabase, eventData, metadata);
      break;

    case 'refund.succeeded':
      await handleRefundSucceeded(supabase, eventData, metadata);
      break;

    default:
      webhookLogger.info(`Unhandled event type: ${eventType}`);
  }

  // Log to audit trail
  if (userId) {
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action: `webhook.${eventType}`,
      resource_type: 'subscription',
      resource_id: eventData.subscription_id || eventData.payment_id,
      metadata: { event: eventData },
    });
  }
  
  // Track webhook analytics
  await supabase.from('webhook_analytics').insert({
    provider: 'dodo-payments',
    event_type: eventType,
    status: 'success',
    duration_ms: Date.now() - webhookStartTime,
    metadata: { event_type: eventType, user_id: userId }
  }).then(({ error }: { error: any }) => {
    if (error) webhookLogger.error('Failed to track analytics', error as Error);
  });
}

async function handlePaymentSucceeded(supabase: any, data: any, metadata: any) {
  const userId = metadata.user_id;
  const planName = metadata.plan || 'freemium';
  const planKey = planName.toLowerCase().replace(' ', '_') as keyof typeof PLAN_TOKENS;
  const tokens = PLAN_TOKENS[planKey] || 500;

  webhookLogger.info(`Payment succeeded for user ${userId}, plan ${planName}`);

  // Track payment completed in PostHog
  try {
    const POSTHOG_KEY = Deno.env.get("VITE_POSTHOG_KEY");
    if (POSTHOG_KEY) {
      await fetch("https://app.posthog.com/capture/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: POSTHOG_KEY,
          event: "payment_completed",
          distinct_id: userId,
          properties: {
            plan_name: planName,
            amount: data.amount,
            currency: data.currency,
            billing_period: metadata.billing_period || "monthly",
          },
        }),
      });
    }
  } catch (error) {
    webhookLogger.error("PostHog tracking failed", error);
  }

  // Get current tokens
  const { data: currentSub } = await supabase
    .from('user_subscriptions')
    .select('tokens_remaining, tokens_total')
    .eq('user_id', userId)
    .maybeSingle();

  // Add new tokens to existing balance
  const newTokensRemaining = (currentSub?.tokens_remaining || 0) + tokens;
  const newTokensTotal = (currentSub?.tokens_total || 0) + tokens;

  webhookLogger.info(`Adding ${tokens} tokens. Current: ${currentSub?.tokens_remaining}, New: ${newTokensRemaining}`);

  // Update subscription with added tokens
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
      current_period_end: data.current_period_end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    webhookLogger.error('Error updating subscription', error);
    throw error;
  }
}

async function handlePaymentFailed(supabase: any, data: any, metadata: any) {
  const userId = metadata.user_id;
  
  webhookLogger.info(`Payment failed for user ${userId}`);

  await supabase
    .from('user_subscriptions')
    .update({ status: 'payment_failed' })
    .eq('user_id', userId);
}

async function handleSubscriptionActive(supabase: any, data: any, metadata: any) {
  const userId = metadata.user_id;
  
  webhookLogger.info(`Subscription activated for user ${userId}`);

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

async function handleSubscriptionCancelled(supabase: any, data: any, metadata: any) {
  const userId = metadata.user_id;
  
  webhookLogger.info(`Subscription cancelled for user ${userId}`);

  // Don't remove tokens immediately - let them use until period ends
  await supabase
    .from('user_subscriptions')
    .update({ status: 'cancelled' })
    .eq('user_id', userId);
}

async function handleSubscriptionExpired(supabase: any, data: any, metadata: any) {
  const userId = metadata.user_id;
  
  webhookLogger.info(`Subscription expired for user ${userId}`);

  // Downgrade to freemium
  await supabase
    .from('user_subscriptions')
    .update({
      plan: 'freemium',
      tokens_remaining: 500,
      tokens_total: 500,
      status: 'expired',
      dodo_subscription_id: null,
      dodo_customer_id: null,
    })
    .eq('user_id', userId);
}

async function handleSubscriptionRenewed(supabase: any, data: any, metadata: any) {
  const userId = metadata.user_id;
  const planName = metadata.plan || 'freemium';
  const planKey = planName.toLowerCase().replace(' ', '_') as keyof typeof PLAN_TOKENS;
  const tokens = PLAN_TOKENS[planKey] || 500;

  webhookLogger.info(`Subscription renewed for user ${userId}`);

  // Get current subscription
  const { data: currentSub } = await supabase
    .from('user_subscriptions')
    .select('tokens_remaining')
    .eq('user_id', userId)
    .single();

  // Add new tokens
  await supabase
    .from('user_subscriptions')
    .update({
      tokens_remaining: currentSub.tokens_remaining + tokens,
      tokens_total: currentSub.tokens_total + tokens,
      status: 'active',
      current_period_end: data.current_period_end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .eq('user_id', userId);
}

async function handleSubscriptionPlanChanged(supabase: any, data: any, metadata: any) {
  const userId = metadata.user_id;
  const newPlan = metadata.new_plan || metadata.plan;
  const planKey = newPlan.toLowerCase().replace(' ', '_') as keyof typeof PLAN_TOKENS;
  const tokens = PLAN_TOKENS[planKey] || 500;

  webhookLogger.info(`Plan changed for user ${userId} to ${newPlan}`);

  await supabase
    .from('user_subscriptions')
    .update({
      plan: planKey,
      tokens_remaining: tokens,
      tokens_total: tokens,
      status: 'active',
    })
    .eq('user_id', userId);
}

async function handleSubscriptionOnHold(supabase: any, data: any, metadata: any) {
  const userId = metadata.user_id;
  
  webhookLogger.info(`Subscription on hold for user ${userId}`);

  await supabase
    .from('user_subscriptions')
    .update({ status: 'on_hold' })
    .eq('user_id', userId);
}

async function handleRefundSucceeded(supabase: any, data: any, metadata: any) {
  const userId = metadata.user_id;
  const refundAmount = data.amount || 0;
  
  webhookLogger.info(`Refund processed for user ${userId}, amount: ${refundAmount}`);

  // Optionally deduct tokens proportionally
  await supabase
    .from('user_subscriptions')
    .update({ status: 'refunded' })
    .eq('user_id', userId);
}
