// Dodo Payments Webhook Handler - v2.0 - Fresh Deployment
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Webhook } from "https://esm.sh/svix@1";

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

// Log deployment on boot
console.log(`🚀 Dodo Webhook v${WEBHOOK_VERSION} DEPLOYED AND READY`);
console.log(`📋 Supports both svix-* and webhook-* header formats`);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const webhookSecret = Deno.env.get('DODO_WEBHOOK_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // SECURITY: Webhook secret is required
    if (!webhookSecret) {
      console.error('CRITICAL SECURITY ERROR: DODO_WEBHOOK_KEY not configured');
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
    console.log(`📨 Webhook v${WEBHOOK_VERSION} - Using header set: ${headerSet}`);
    console.log(`   svix-id: ${svixId ? 'present' : 'missing'}`);
    console.log(`   svix-timestamp: ${svixTimestamp ? 'present' : 'missing'}`);
    console.log(`   svix-signature: ${svixSignature ? 'present' : 'missing'}`);
    
    if (!svixSignature || !svixId || !svixTimestamp) {
      console.error('Security: Missing Svix webhook headers');
      console.log('svix-id:', svixId);
      console.log('svix-timestamp:', svixTimestamp);
      console.log('svix-signature:', svixSignature ? 'present' : 'missing');
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
        console.error('❌ Webhook timestamp validation failed:', { 
          timestamp, 
          now, 
          diff: now - timestamp,
          reason: isNaN(timestamp) ? 'invalid_timestamp' : 'timestamp_expired'
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
      console.log(`✅ Security: Valid webhook verified via Svix (${headerSet})`, event.type || event.event_type);

      // Step 3: Check for duplicate webhook using idempotency
      const eventData = event.data || event;
      const idempotencyKey = eventData.payment_id || eventData.subscription_id || svixId;
      
      const { data: existingEvent } = await supabase
        .from('webhook_events')
        .select('id')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();
      
      if (existingEvent) {
        console.log('⚠️ Duplicate webhook detected, ignoring:', idempotencyKey);
        return new Response(JSON.stringify({ received: true, duplicate: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Step 4: Process the event
      await handleWebhookEvent(supabase, event);
      
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
      console.error(`❌ Svix verification failed (using ${headerSet} headers):`, verifyError);
      console.error('Verification error details:', verifyError instanceof Error ? verifyError.message : String(verifyError));
      console.error('Body length:', bodyText.length);
      console.error('Timestamp:', svixTimestamp);
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleWebhookEvent(supabase: any, event: any) {
  const eventType = event.type || event.event_type;
  const eventData = event.data || event;

  console.log(`Processing event: ${eventType}`);

  // Extract metadata (user_id, plan, etc.)
  const metadata = eventData.metadata || {};
  let userId = metadata.user_id;
  const planName = metadata.plan || 'freemium';

  // Fallback: If user_id is missing from metadata, try to find user by email
  if (!userId && eventData.customer?.email) {
    console.log('metadata.user_id missing, attempting to find user by email:', eventData.customer.email);
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', eventData.customer.email)
      .single();
    
    if (profile && !profileError) {
      userId = profile.id;
      console.log('Found user by email fallback:', userId);
    } else {
      console.error('Could not find user by email:', profileError);
      throw new Error(`User not found for email: ${eventData.customer.email}`);
    }
  }

  if (!userId) {
    console.error('No user_id in metadata and no customer email to lookup');
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
      console.log(`Unhandled event type: ${eventType}`);
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

  console.log(`Payment succeeded for user ${userId}, plan ${planName}`);

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
    console.error("PostHog tracking failed:", error);
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

  console.log(`Adding ${tokens} tokens. Current: ${currentSub?.tokens_remaining}, New: ${newTokensRemaining}`);

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
    console.error('Error updating subscription:', error);
    throw error;
  }
}

async function handlePaymentFailed(supabase: any, data: any, metadata: any) {
  const userId = metadata.user_id;
  
  console.log(`Payment failed for user ${userId}`);

  await supabase
    .from('user_subscriptions')
    .update({ status: 'payment_failed' })
    .eq('user_id', userId);
}

async function handleSubscriptionActive(supabase: any, data: any, metadata: any) {
  const userId = metadata.user_id;
  
  console.log(`Subscription activated for user ${userId}`);

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
  
  console.log(`Subscription cancelled for user ${userId}`);

  // Don't remove tokens immediately - let them use until period ends
  await supabase
    .from('user_subscriptions')
    .update({ status: 'cancelled' })
    .eq('user_id', userId);
}

async function handleSubscriptionExpired(supabase: any, data: any, metadata: any) {
  const userId = metadata.user_id;
  
  console.log(`Subscription expired for user ${userId}`);

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

  console.log(`Subscription renewed for user ${userId}`);

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

  console.log(`Plan changed for user ${userId} to ${newPlan}`);

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
  
  console.log(`Subscription on hold for user ${userId}`);

  await supabase
    .from('user_subscriptions')
    .update({ status: 'on_hold' })
    .eq('user_id', userId);
}

async function handleRefundSucceeded(supabase: any, data: any, metadata: any) {
  const userId = metadata.user_id;
  const refundAmount = data.amount || 0;
  
  console.log(`Refund processed for user ${userId}, amount: ${refundAmount}`);

  // Optionally deduct tokens proportionally
  await supabase
    .from('user_subscriptions')
    .update({ status: 'refunded' })
    .eq('user_id', userId);
}
