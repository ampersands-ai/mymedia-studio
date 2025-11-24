import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";

const tokenManagementSchema = z.object({
  user_id: z.string().uuid(),
  amount: z.number().int().min(-100000).max(100000),
  action: z.enum(['add', 'deduct']),
});

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('manage-user-tokens', requestId);
  const startTime = Date.now();

  // Get response headers (includes CORS + security headers)
  const responseHeaders = getResponseHeaders(req);

  // Handle CORS preflight with secure origin validation
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  interface RequestBody {
    user_id?: string;
    amount?: number;
    action?: string;
  }

  interface AuthUser {
    id: string;
  }

  let body: RequestBody | undefined;
  let user: AuthUser | undefined;

  try {
    logger.info('Processing token management request');
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
      logger.warn('Non-admin user attempted token management', { userId: user.id });
      throw new Error('Forbidden: Admin access required');
    }

    // Validate and parse request body
    body = await req.json();
    const { user_id, amount, action } = tokenManagementSchema.parse(body);

    logger.info('Token management request validated', { 
      metadata: { targetUserId: user_id, amount, action, adminId: user.id }
    });

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

    logger.info('Token management completed successfully', {
      metadata: {
        targetUserId: user_id,
        amount,
        action,
        newTokensRemaining,
        newTokensTotal
      }
    });
    logger.logDuration('Token management request', startTime);

    return new Response(
      JSON.stringify({ 
        success: true,
        tokens_remaining: newTokensRemaining,
        tokens_total: newTokensTotal
      }),
      { status: 200, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logger.error('Token management failed', error as Error, {
      metadata: {
        adminUserId: user?.id,
        targetUserId: body?.user_id,
        amount: body?.amount,
        action: body?.action,
      }
    });

    const message = (error as Error)?.message || 'An error occurred';
    const status = message.includes('Unauthorized') || message.includes('authorization') ? 401
      : message.includes('Forbidden') ? 403
      : message.includes('not found') ? 404
      : 400;
    
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
