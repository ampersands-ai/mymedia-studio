import { serve } from "std/http/server.ts";
import { createClient } from "supabase";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Inline helper: sanitize errors before logging
function sanitizeError(error: any): any {
  if (error && typeof error === 'object') {
    const { authorization, token, api_key, apiKey, secret, ...safe } = error;
    return safe;
  }
  return error;
}

// Inline helper: log errors to console
function logError(context: string, error: any, metadata?: any): void {
  console.error(`[ERROR] ${context}:`, sanitizeError(error), metadata);
}

// Inline helper: create standardized error response
function createErrorResponse(error: any, headers: any, context: string, metadata?: any): Response {
  logError(context, error, metadata);
  const message = error?.message || 'An error occurred';
  const status = message.includes('Unauthorized') || message.includes('authorization') ? 401
    : message.includes('Forbidden') ? 403
    : message.includes('not found') ? 404
    : message.includes('Insufficient') ? 402
    : 400;
  
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...headers, 'Content-Type': 'application/json' } }
  );
}

const deductTokensSchema = z.object({
  tokens_to_deduct: z.number().min(0.01).max(100000),
});

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let body: any;
  let user: any;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !authUser) {
      throw new Error('Unauthorized');
    }

    user = authUser;

    // Validate request body
    body = await req.json();
    const { tokens_to_deduct } = deductTokensSchema.parse(body);

    // Deduct tokens using optimistic locking with retry logic
    // This prevents race conditions under high concurrency
    let updatedSubscriptionFinal: any;
    let retries = 3;
    
    while (retries > 0) {
      try {
        // Get current token balance
        const { data: subscription, error: fetchError } = await supabase
          .from('user_subscriptions')
          .select('tokens_remaining')
          .eq('user_id', user.id)
          .single();

        if (fetchError) {
          logError('deduct-tokens', fetchError, { user_id: user.id });
          throw new Error('Failed to fetch credit balance');
        }

        if (!subscription) {
          throw new Error('User subscription not found');
        }

        // Check if user has enough credits
        if (subscription.tokens_remaining < tokens_to_deduct) {
          throw new Error('Insufficient credits');
        }

        // Deduct credits with optimistic locking (compare-and-swap)
        const { data: updatedSubscription, error: updateError } = await supabase
          .from('user_subscriptions')
          .update({ 
            tokens_remaining: subscription.tokens_remaining - tokens_to_deduct 
          })
          .eq('user_id', user.id)
          .eq('tokens_remaining', subscription.tokens_remaining) // Optimistic lock: only update if value hasn't changed
          .select()
          .single();

        if (updateError || !updatedSubscription) {
          // Race condition detected - retry
          retries--;
          if (retries === 0) {
            throw new Error('Credit deduction failed after retries - please try again');
          }
          console.log(`[RETRY] Credit deduction retry ${3 - retries}/3 for user ${user.id}`);
          await new Promise(resolve => setTimeout(resolve, 50)); // Small delay before retry
          continue;
        }

        updatedSubscriptionFinal = updatedSubscription;
        break; // Success
      } catch (error) {
        if (retries === 1) throw error;
        retries--;
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    // Log credit usage for security monitoring
    try {
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'tokens_deducted',
        metadata: {
          tokens_deducted: tokens_to_deduct,
          tokens_remaining: updatedSubscriptionFinal.tokens_remaining,
        },
      });
    } catch (logErrorObj) {
      logError('deduct-tokens', logErrorObj, { context: 'audit_log_failed' });
    }

    console.log(`[SUCCESS] Deducted ${tokens_to_deduct} credits for user ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        tokens_remaining: updatedSubscriptionFinal.tokens_remaining,
        tokens_deducted: tokens_to_deduct
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return createErrorResponse(error, corsHeaders, 'deduct-tokens', { 
      user_id: user?.id,
      tokens_requested: body?.tokens_to_deduct,
    });
  }
});
