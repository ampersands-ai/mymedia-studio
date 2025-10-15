import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    
    // Get Svix signature headers (Dodo Payments uses Svix for webhook delivery)
    const svixSignature = req.headers.get('webhook-signature');
    const svixId = req.headers.get('webhook-id');
    const svixTimestamp = req.headers.get('webhook-timestamp');
    
    if (!svixSignature || !svixId || !svixTimestamp) {
      console.error('Security: Missing Svix webhook headers');
      console.log('webhook-signature:', svixSignature);
      console.log('webhook-id:', svixId);
      console.log('webhook-timestamp:', svixTimestamp);
      return new Response(
        JSON.stringify({ error: 'Missing webhook signature headers' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // SECURITY: Verify Svix HMAC signature
    // Svix signature format: "v1,<base64_signature>" - extract the signature part
    const signatureParts = svixSignature.split(',');
    if (signatureParts.length !== 2 || signatureParts[0] !== 'v1') {
      console.error('Security: Invalid Svix signature format');
      return new Response(
        JSON.stringify({ error: 'Invalid signature format' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const receivedSignature = signatureParts[1];
    
    // Svix signature is HMAC-SHA256 of: "${webhook_id}.${webhook_timestamp}.${body}"
    const signedContent = `${svixId}.${svixTimestamp}.${bodyText}`;
    
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(signedContent)
    );
    
    // Convert to base64 for comparison
    const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));

    if (receivedSignature !== expectedSignature) {
      console.error('Security: Invalid webhook signature');
      console.log('Received:', receivedSignature);
      console.log('Expected:', expectedSignature);
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const event = JSON.parse(bodyText);
    console.log('Security: Valid webhook received:', event.type);

    await handleWebhookEvent(supabase, event);

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
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

  // Update subscription
  const { error } = await supabase
    .from('user_subscriptions')
    .update({
      plan: planKey,
      tokens_remaining: tokens,
      tokens_total: tokens,
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
