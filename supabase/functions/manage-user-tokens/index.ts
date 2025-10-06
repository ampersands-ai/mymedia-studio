import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TokenRequest {
  user_id: string;
  amount: number;
  action: 'add' | 'deduct';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the requesting user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: TokenRequest = await req.json();
    const { user_id, amount, action } = body;

    if (!user_id || !amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid request parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current subscription
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('tokens_remaining, tokens_total')
      .eq('user_id', user_id)
      .single();

    if (subError) {
      return new Response(
        JSON.stringify({ error: 'User subscription not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

    // Log to audit trail
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
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        tokens_remaining: newTokensRemaining,
        tokens_total: newTokensTotal
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error managing tokens:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
