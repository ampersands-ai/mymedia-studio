import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Map plan names to Dodo Payments product IDs
const PLAN_PRODUCT_IDS = {
  'explorer': {
    monthly: 'pdt_sWvSDyXU1PVSQRmLMS73c',
    annual: 'pdt_puVmR1qtPto0GFsEg37X6',
  },
  'professional': {
    monthly: 'pdt_SdYFUQLtaFIXIYLZONFDy',
    annual: 'pdt_37iTzseOiYUKtj01FIk3L',
  },
  'ultimate': {
    monthly: 'pdt_9Yeryv7tq4tXneVFJt5my',
    annual: 'pdt_dgOCQNEbwmqnCcRVCWFms',
  },
  'veo_connoisseur': {
    monthly: 'pdt_Hxf2vEkGfRUAL0irgjsDV',
    annual: 'pdt_6DvfNg7cAMlACiyJ01dFk',
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
    const planKey = plan.toLowerCase().replace(' ', '_') as keyof typeof PLAN_PRODUCT_IDS;
    if (!PLAN_PRODUCT_IDS[planKey]) {
      throw new Error('Invalid plan selected');
    }

    const billingPeriod: 'monthly' | 'annual' = isAnnual ? 'annual' : 'monthly';
    const productId = PLAN_PRODUCT_IDS[planKey][billingPeriod];

    // Check if product ID is configured
    if (productId.includes('PRODUCT_ID')) {
      console.error('Product IDs not configured. Please create products in Dodo Payments dashboard.');
      throw new Error('Payment system not fully configured. Please contact support.');
    }
    
    // Get user profile for email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', user.id)
      .single();

    console.log('Creating Dodo checkout for:', {
      user_id: user.id,
      plan: planKey,
      billing_period: billingPeriod,
      product_id: productId,
    });

    // Create Dodo Payments checkout session
    // Use test environment - change to 'live' for production
    const dodoBaseUrl = 'https://test.dodopayments.com';
    const dodoResponse = await fetch(`${dodoBaseUrl}/checkouts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${dodoApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_cart: [
          {
            product_id: productId,
            quantity: 1,
          }
        ],
        payment_link_settings: {
          success_url: `${req.headers.get('origin')}/dashboard/create?payment=success`,
          cancel_url: `${req.headers.get('origin')}/pricing?payment=cancelled`,
        },
        customer: {
          email: profile?.email || user.email,
          name: profile?.full_name || '',
        },
        metadata: {
          user_id: user.id,
          plan: planKey,
          billing_period: billingPeriod,
        },
      }),
    });

    if (!dodoResponse.ok) {
      const errorText = await dodoResponse.text();
      console.error('Dodo Payments API error:', {
        status: dodoResponse.status,
        statusText: dodoResponse.statusText,
        body: errorText,
      });
      throw new Error(`Dodo Payments API returned ${dodoResponse.status}: ${errorText}`);
    }

    const dodoData = await dodoResponse.json();

    console.log('Payment session created successfully:', {
      user_id: user.id,
      plan: planKey,
      session_id: dodoData.session_id,
      checkout_url: dodoData.checkout_url,
    });

    // Log to audit trail
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'payment.session_created',
      resource_type: 'subscription',
      metadata: {
        plan: planKey,
        billing_period: billingPeriod,
        product_id: productId,
        session_id: dodoData.session_id,
      },
    });

    return new Response(
      JSON.stringify({
        checkout_url: dodoData.checkout_url,
        session_id: dodoData.session_id,
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
