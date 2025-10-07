import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PLAN_PRICES = {
  'explorer': {
    monthly: 9.99,
    annual: 95.88, // $7.99/mo * 12
  },
  'professional': {
    monthly: 24.99,
    annual: 239.88, // $19.99/mo * 12
  },
  'ultimate': {
    monthly: 49.99,
    annual: 479.88, // $39.99/mo * 12
  },
  'veo_connoisseur': {
    monthly: 119.99,
    annual: 1079.88, // $89.99/mo * 12
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const dodoApiKey = Deno.env.get('DODO_PAYMENTS_API_KEY');

    if (!dodoApiKey) {
      throw new Error('DODO_PAYMENTS_API_KEY not configured');
    }

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { plan, isAnnual } = await req.json();

    // Validate plan
    const planKey = plan.toLowerCase().replace(' ', '_') as keyof typeof PLAN_PRICES;
    if (!PLAN_PRICES[planKey]) {
      throw new Error('Invalid plan selected');
    }

    const billingPeriod: 'monthly' | 'annual' = isAnnual ? 'annual' : 'monthly';
    const amount = PLAN_PRICES[planKey][billingPeriod];
    
    // Get user profile for email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', user.id)
      .single();

    // Create Dodo Payments checkout session
    // NOTE: This is a placeholder - adjust based on actual Dodo Payments API
    const dodoResponse = await fetch('https://api.dodopayments.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${dodoApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount * 100, // Convert to cents
        currency: 'USD',
        customer_email: profile?.email || user.email,
        customer_name: profile?.full_name || '',
        description: `${plan} Plan - ${billingPeriod}`,
        metadata: {
          user_id: user.id,
          plan: planKey,
          billing_period: billingPeriod,
        },
        success_url: `${req.headers.get('origin')}/dashboard/create?payment=success`,
        cancel_url: `${req.headers.get('origin')}/pricing?payment=cancelled`,
        payment_method_types: ['card'],
      }),
    });

    if (!dodoResponse.ok) {
      const errorText = await dodoResponse.text();
      console.error('Dodo Payments API error:', errorText);
      throw new Error(`Failed to create payment session: ${errorText}`);
    }

    const dodoData = await dodoResponse.json();

    console.log('Payment session created:', {
      user_id: user.id,
      plan: planKey,
      amount,
      session_id: dodoData.id || dodoData.session_id,
    });

    // Log to audit trail
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'payment.session_created',
      resource_type: 'subscription',
      metadata: {
        plan: planKey,
        billing_period: billingPeriod,
        amount,
        session_id: dodoData.id || dodoData.session_id,
      },
    });

    return new Response(
      JSON.stringify({
        checkout_url: dodoData.url || dodoData.checkout_url,
        session_id: dodoData.id || dodoData.session_id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error creating payment session:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
