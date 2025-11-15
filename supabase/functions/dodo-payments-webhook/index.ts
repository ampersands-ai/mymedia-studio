// Dodo Payments Webhook Handler - v2.0 - Enhanced Diagnostics
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Webhook } from "https://esm.sh/svix@1";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { createSafeErrorResponse } from "../_shared/error-handler.ts";

const WEBHOOK_VERSION = "2.0-svix-dual-headers";

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
  const logger = new EdgeLogger('dodo-payments-webhook', requestId);
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
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      logger.info('Processing new webhook', { 
        metadata: { idempotencyKey, isDuplicate: false }
      });

      // Step 4: Process the event
      logger.info('Processing webhook event', { metadata: { idempotencyKey, eventType } });
      await handleWebhookEvent(supabase, event);
      
      // Step 5: Record webhook event for idempotency
      await supabase.from('webhook_events').insert({
        idempotency_key: idempotencyKey,
        event_type: eventType,
        processed_at: new Date().toISOString()
      });

      logger.info('Webhook processed successfully', { metadata: { idempotencyKey, eventType } });
      
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    logger.error('Webhook processing failed', error instanceof Error ? error : new Error(String(error)));
    return createSafeErrorResponse(error, 'dodo-payments-webhook', corsHeaders);
  }
});

async function handleWebhookEvent(supabase: any, event: any) {
  const eventType = event.type || event.event_type;
  const eventData = event.data || event;

  logger.info('Processing webhook event', { metadata: { eventType } });

  // Extract metadata (user_id, plan, etc.)
  const metadata = eventData.metadata || {};
  let userId = metadata.user_id;
  const planName = metadata.plan || 'freemium';

  // Fallback: If user_id is missing from metadata, try to find user by email
  if (!userId && eventData.customer?.email) {
    logger.info('Attempting email fallback for user lookup', { 
      email: eventData.customer.email 
    });
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', eventData.customer.email)
      .single();
    
    if (profile && !profileError) {
      userId = profile.id;
      logger.info('Found user by email fallback', { userId });
    } else {
      logger.error('Could not find user by email', profileError || new Error('User not found'), {
        email: eventData.customer.email
      });
      throw new Error(`User not found for email: ${eventData.customer.email}`);
    }
  }

  if (!userId) {
    logger.error('No user_id available', new Error('Missing user identification'));
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
      logger.info('Unhandled event type', { eventType });
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
}

async function handlePaymentSucceeded(supabase: any, data: any, metadata: any) {
  const userId = metadata.user_id;
  const planName = metadata.plan || 'freemium';
  const planKey = planName.toLowerCase().replace(' ', '_') as keyof typeof PLAN_TOKENS;
  const tokens = PLAN_TOKENS[planKey] || 500;

  logger.info('Payment succeeded', { userId, planName, tokens });

  // Get current tokens
  const { data: currentSub } = await supabase
    .from('user_subscriptions')
    .select('tokens_remaining, tokens_total')
    .eq('user_id', userId)
    .maybeSingle();

  // Add new tokens to existing balance
  const newTokensRemaining = (currentSub?.tokens_remaining || 0) + tokens;
  const newTokensTotal = (currentSub?.tokens_total || 0) + tokens;

  logger.info('Adding tokens', { 
    tokens, 
    currentRemaining: currentSub?.tokens_remaining,
    newRemaining: newTokensRemaining 
  });

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
    logger.error('Error updating subscription', error);
    throw error;
  }
}

async function handlePaymentFailed(supabase: any, data: any, metadata: any) {
  const userId = metadata.user_id;
  
  logger.info('Payment failed', { userId });

  await supabase
    .from('user_subscriptions')
    .update({ status: 'payment_failed' })
    .eq('user_id', userId);
}

async function handleSubscriptionActive(supabase: any, data: any, metadata: any) {
  const userId = metadata.user_id;
  
  logger.info('Subscription activated', { userId });

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
  
  logger.info('Subscription cancelled', { userId });

  // Don't remove tokens immediately - let them use until period ends
  await supabase
    .from('user_subscriptions')
    .update({ status: 'cancelled' })
    .eq('user_id', userId);
}

async function handleSubscriptionExpired(supabase: any, data: any, metadata: any) {
  const userId = metadata.user_id;
  
  logger.info('Subscription expired', { userId });

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

  logger.info('Subscription renewed', { userId, tokens });

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

  logger.info('Plan changed', { userId, newPlan, tokens });

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
  
  logger.info('Subscription on hold', { userId });

  await supabase
    .from('user_subscriptions')
    .update({ status: 'on_hold' })
    .eq('user_id', userId);
}

async function handleRefundSucceeded(supabase: any, data: any, metadata: any) {
  const userId = metadata.user_id;
  const refundAmount = data.amount || 0;
  
  logger.info('Refund processed', { userId, refundAmount });

  // Optionally deduct tokens proportionally
  await supabase
    .from('user_subscriptions')
    .update({ status: 'refunded' })
    .eq('user_id', userId);
}
