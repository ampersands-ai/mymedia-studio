
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Retry helper with exponential backoff and IP fallback
async function fetchWithRetry(url: string, options: RequestInit, maxAttempts = 3): Promise<Response> {
  const delays = [400, 800, 1600]; // exponential backoff in ms
  
  // Parse the URL to extract hostname
  const urlObj = new URL(url);
  const hostname = urlObj.hostname;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      // Silent retry - no logging for attempts
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      const isLastAttempt = attempt === maxAttempts - 1;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // If it's a DNS error and not the last attempt, try IP fallback
      if ((errorMessage.includes('dns error') || errorMessage.includes('lookup address')) && isLastAttempt) {
        // Silent DNS fallback attempt
        try {
          // Use Cloudflare DNS over HTTPS to resolve the domain
          const dnsResponse = await fetch(
            `https://cloudflare-dns.com/dns-query?name=${hostname}&type=A`,
            {
              headers: { 'Accept': 'application/dns-json' }
            }
          );
          
          const dnsData = await dnsResponse.json();
          
          if (dnsData.Answer && dnsData.Answer.length > 0) {
            const ipAddress = dnsData.Answer[0].data;
            
            // Replace hostname with IP in URL
            const ipUrl = url.replace(hostname, ipAddress);
            
            // Add Host header to ensure correct virtual host routing
            const ipOptions = {
              ...options,
              headers: {
                ...options.headers,
                'Host': hostname,
              }
            };
            
            const ipResponse = await fetch(ipUrl, ipOptions);
            return ipResponse;
          } else {
            throw new Error('DNS_ERROR');
          }
        } catch (ipError) {
          throw new Error('DNS_ERROR');
        }
      }
      
      if (isLastAttempt) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, delays[attempt]));
    }
  }
  
  throw new Error('Max retry attempts reached');
}

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

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('create-dodo-payment', requestId);
  const startTime = Date.now();
  
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

    const { plan, isAnnual, appOrigin } = await req.json();

    // Validate plan
    const planKey = plan.toLowerCase().replace(' ', '_') as keyof typeof PLAN_PRODUCT_IDS;
    if (!PLAN_PRODUCT_IDS[planKey]) {
      throw new Error('Invalid plan selected');
    }

    const billingPeriod: 'monthly' | 'annual' = isAnnual ? 'annual' : 'monthly';
    const productId = PLAN_PRODUCT_IDS[planKey][billingPeriod];

    // Check if product ID is configured
    if (productId.includes('PRODUCT_ID')) {
      logger.error('Product IDs not configured', new Error('Please create products in Dodo Payments dashboard'));
      throw new Error('Payment system not fully configured. Please contact support.');
    }
    
    // Get user profile for email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', user.id)
      .single();

    // Get the app origin from request, fallback to header, then default
    const baseUrl = appOrigin || req.headers.get('origin') || 'https://artifio-create-flow.lovable.app';
    const successUrl = `${baseUrl}/dashboard/create?payment=success`;
    const cancelUrl = `${baseUrl}/pricing?payment=cancelled`;

    logger.info('Creating Dodo checkout', {
      userId: user.id,
      metadata: {
        plan: planKey,
        billing_period: billingPeriod,
        product_id: productId
      }
    });

    // Determine environment based on API key prefix
    const isTestMode = dodoApiKey.startsWith('test_');
    const dodoBaseUrl = isTestMode 
      ? 'https://test.dodopayments.com' 
      : 'https://live.dodopayments.com';
    
    logger.info(`Using Dodo Payments environment`, { 
      metadata: { environment: isTestMode ? 'test' : 'live', baseUrl: dodoBaseUrl } 
    });
    
    let dodoData;
    try {
      const dodoResponse = await fetchWithRetry(`${dodoBaseUrl}/checkouts`, {
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
            success_url: successUrl,
            cancel_url: cancelUrl,
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

      dodoData = await dodoResponse.json();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Handle DNS errors specifically
      if (errorMessage === 'DNS_ERROR') {
        console.error('DNS resolution failed after retries');
        return new Response(
          JSON.stringify({ 
            error: 'Payment service temporarily unavailable. Please retry in a few seconds.',
            code: 'SERVICE_UNAVAILABLE'
          }),
          { 
            status: 503, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      // Re-throw other errors to be caught by outer catch block
      throw error;
    }

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
