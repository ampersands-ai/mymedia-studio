import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createErrorResponse, logError } from "../_shared/error-handler.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const deductTokensSchema = z.object({
  tokens_to_deduct: z.number().int().min(1).max(100000),
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

    // Get current token balance
    const { data: subscription, error: fetchError } = await supabase
      .from('user_subscriptions')
      .select('tokens_remaining')
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      logError('deduct-tokens', fetchError, { user_id: user.id });
      throw new Error('Failed to fetch token balance');
    }

    if (!subscription) {
      throw new Error('User subscription not found');
    }

    // Check if user has enough tokens
    if (subscription.tokens_remaining < tokens_to_deduct) {
      throw new Error('Insufficient tokens');
    }

    // Deduct tokens
    const { data: updatedSubscription, error: updateError } = await supabase
      .from('user_subscriptions')
      .update({ 
        tokens_remaining: subscription.tokens_remaining - tokens_to_deduct 
      })
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      logError('deduct-tokens', updateError, { user_id: user.id, tokens: tokens_to_deduct });
      throw new Error('Failed to deduct tokens');
    }

    // Log token usage for security monitoring
    try {
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'tokens_deducted',
        metadata: {
          tokens_deducted: tokens_to_deduct,
          tokens_remaining: updatedSubscription.tokens_remaining,
        },
      });
    } catch (logErrorObj) {
      logError('deduct-tokens', logErrorObj, { context: 'audit_log_failed' });
    }

    console.log(`[SUCCESS] Deducted ${tokens_to_deduct} tokens for user ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        tokens_remaining: updatedSubscription.tokens_remaining,
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
