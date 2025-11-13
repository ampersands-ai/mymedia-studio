import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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
    : 400;
  
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...headers, 'Content-Type': 'application/json' } }
  );
}

const tokenManagementSchema = z.object({
  user_id: z.string().uuid(),
  amount: z.number().int().min(-100000).max(100000),
  action: z.enum(['add', 'deduct']),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let body: any;
  let user: any;

  try {
    // Authenticate the requesting user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: authUser }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !authUser) {
      throw new Error('Unauthorized');
    }

    user = authUser;

    // Verify admin role using service role client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roleData) {
      throw new Error('Forbidden: Admin access required');
    }

    // Validate and parse request body
    body = await req.json();
    const { user_id, amount, action } = tokenManagementSchema.parse(body);

    // Ensure amount is positive
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    // Get current subscription
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('tokens_remaining, tokens_total')
      .eq('user_id', user_id)
      .single();

    if (subError || !subscription) {
      throw new Error('User subscription not found');
    }

    // Calculate new token amounts
    const newTokensRemaining = action === 'add' 
      ? subscription.tokens_remaining + amount 
      : Math.max(0, subscription.tokens_remaining - amount);
    
    const newTokensTotal = action === 'add'
      ? subscription.tokens_total + amount
      : subscription.tokens_total; // Don't change total when deducting

    // Update tokens
    const { error: updateError } = await supabaseAdmin
      .from('user_subscriptions')
      .update({
        tokens_remaining: newTokensRemaining,
        tokens_total: newTokensTotal,
      })
      .eq('user_id', user_id);

    if (updateError) {
      throw updateError;
    }

    // Log to audit trail with enhanced metadata for security monitoring
    await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id, // Admin who made the change
      action: `tokens_${action}`,
      resource_type: 'user_subscription',
      resource_id: user_id,
      metadata: {
        amount,
        previous_tokens_remaining: subscription.tokens_remaining,
        new_tokens_remaining: newTokensRemaining,
        previous_tokens_total: subscription.tokens_total,
        new_tokens_total: newTokensTotal,
        timestamp: new Date().toISOString(),
        source: 'manual_admin_action'
      }
    });

    console.log(`[SUCCESS] Credits ${action} completed: ${amount} for user ${user_id}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        tokens_remaining: newTokensRemaining,
        tokens_total: newTokensTotal
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return createErrorResponse(error, corsHeaders, 'manage-user-tokens', {
      admin_user_id: user?.id,
      target_user_id: body?.user_id,
      amount: body?.amount,
      action: body?.action,
    });
  }
});
