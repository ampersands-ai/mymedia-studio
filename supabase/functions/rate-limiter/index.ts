import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limits configuration
const RATE_LIMITS = {
  login: {
    maxAttempts: 5,
    windowMinutes: 15,
    blockMinutes: 15,
  },
  signup: {
    maxAttempts: 3,
    windowMinutes: 60,
    blockMinutes: 60,
  },
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { identifier, action } = await req.json();

    if (!identifier || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing identifier or action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const config = RATE_LIMITS[action as keyof typeof RATE_LIMITS];
    if (!config) {
      return new Response(
        JSON.stringify({ error: 'Invalid action type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase with service role (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Check current rate limit status
    const { data: rateLimit, error: fetchError } = await supabaseAdmin
      .from('rate_limits')
      .select('*')
      .eq('identifier', identifier)
      .eq('action', action)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching rate limit:', fetchError);
      throw fetchError;
    }

    const now = new Date();

    // If blocked, check if block period has expired
    if (rateLimit?.blocked_until) {
      const blockedUntil = new Date(rateLimit.blocked_until);
      if (now < blockedUntil) {
        const minutesRemaining = Math.ceil((blockedUntil.getTime() - now.getTime()) / 60000);
        return new Response(
          JSON.stringify({ 
            allowed: false, 
            error: `Too many attempts. Please try again in ${minutesRemaining} minute(s).`,
            blockedUntil: blockedUntil.toISOString(),
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (!rateLimit) {
      // First attempt - create new record
      const { error: insertError } = await supabaseAdmin
        .from('rate_limits')
        .insert({
          identifier,
          action,
          attempt_count: 1,
          first_attempt_at: now.toISOString(),
          last_attempt_at: now.toISOString(),
        });

      if (insertError) {
        console.error('Error creating rate limit:', insertError);
        throw insertError;
      }

      return new Response(
        JSON.stringify({ allowed: true, remainingAttempts: config.maxAttempts - 1 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if window has expired
    const firstAttempt = new Date(rateLimit.first_attempt_at);
    const windowExpired = (now.getTime() - firstAttempt.getTime()) > (config.windowMinutes * 60 * 1000);

    if (windowExpired) {
      // Reset the counter
      const { error: resetError } = await supabaseAdmin
        .from('rate_limits')
        .update({
          attempt_count: 1,
          first_attempt_at: now.toISOString(),
          last_attempt_at: now.toISOString(),
          blocked_until: null,
        })
        .eq('identifier', identifier)
        .eq('action', action);

      if (resetError) {
        console.error('Error resetting rate limit:', resetError);
        throw resetError;
      }

      return new Response(
        JSON.stringify({ allowed: true, remainingAttempts: config.maxAttempts - 1 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Increment attempt count
    const newAttemptCount = rateLimit.attempt_count + 1;
    const isBlocked = newAttemptCount >= config.maxAttempts;

    const updateData: any = {
      attempt_count: newAttemptCount,
      last_attempt_at: now.toISOString(),
    };

    if (isBlocked) {
      const blockedUntil = new Date(now.getTime() + config.blockMinutes * 60 * 1000);
      updateData.blocked_until = blockedUntil.toISOString();
    }

    const { error: updateError } = await supabaseAdmin
      .from('rate_limits')
      .update(updateData)
      .eq('identifier', identifier)
      .eq('action', action);

    if (updateError) {
      console.error('Error updating rate limit:', updateError);
      throw updateError;
    }

    if (isBlocked) {
      // Log rate limit block to audit logs
      await supabaseAdmin.from('audit_logs').insert({
        user_id: null,
        action: 'rate_limit_blocked',
        resource_type: 'rate_limit',
        resource_id: identifier,
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown',
        metadata: { 
          action, 
          attempt_count: newAttemptCount,
          blocked_until: updateData.blocked_until 
        },
      });

      return new Response(
        JSON.stringify({ 
          allowed: false, 
          error: `Too many attempts. Please try again in ${config.blockMinutes} minute(s).`,
          blockedUntil: updateData.blocked_until,
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ allowed: true, remainingAttempts: config.maxAttempts - newAttemptCount }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in rate-limiter function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
