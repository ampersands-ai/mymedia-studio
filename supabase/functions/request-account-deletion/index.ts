import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with user's auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { reason } = await req.json();

    console.log(`[request-account-deletion] User ${user.id} requesting account deletion`);

    // Check for existing pending deletion request
    const { data: existingRequest, error: checkError } = await supabase
      .from('account_deletion_requests')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .maybeSingle();

    if (checkError) {
      console.error('[request-account-deletion] Error checking existing request:', checkError);
      throw checkError;
    }

    if (existingRequest) {
      return new Response(
        JSON.stringify({ error: 'A deletion request is already pending' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate scheduled deletion date (7 days from now)
    const scheduledDeletionAt = new Date();
    scheduledDeletionAt.setDate(scheduledDeletionAt.getDate() + 7);

    // Create deletion request
    const { data: deletionRequest, error: insertError } = await supabase
      .from('account_deletion_requests')
      .insert({
        user_id: user.id,
        reason: reason || null,
        scheduled_deletion_at: scheduledDeletionAt.toISOString(),
        status: 'pending',
        deletion_metadata: {
          email: user.email,
          requested_from_ip: req.headers.get('x-forwarded-for') || 'unknown',
          user_agent: req.headers.get('user-agent') || 'unknown',
        },
      })
      .select()
      .single();

    if (insertError) {
      console.error('[request-account-deletion] Error creating deletion request:', insertError);
      throw insertError;
    }

    // Log the request in audit logs
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'account_deletion_requested',
      resource_type: 'account',
      resource_id: user.id,
      metadata: {
        scheduled_deletion_at: scheduledDeletionAt.toISOString(),
        reason: reason || 'Not provided',
      },
      ip_address: req.headers.get('x-forwarded-for') || null,
      user_agent: req.headers.get('user-agent') || null,
    });

    // Send confirmation email via send-test-email (reusing existing email function)
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();

      await supabase.functions.invoke('send-test-email', {
        body: {
          to: user.email,
          subject: 'Account Deletion Scheduled - Artifio',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Account Deletion Scheduled</h2>
              <p>Hi ${profile?.full_name || 'there'},</p>
              <p>We've received your request to delete your Artifio account.</p>
              <p><strong>Your account is scheduled to be permanently deleted on ${scheduledDeletionAt.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.</strong></p>
              <p>What will be deleted:</p>
              <ul>
                <li>Your profile and personal information</li>
                <li>All generated images and videos</li>
                <li>Your storyboards and projects</li>
                <li>Subscription and billing history</li>
              </ul>
              <p>If you change your mind, you can cancel this request anytime before the deletion date by visiting your account settings.</p>
              <p>If you didn't request this deletion, please contact us immediately at support@artifio.ai</p>
              <p>Thank you for using Artifio.</p>
            </div>
          `,
        },
      });
    } catch (emailError) {
      console.error('[request-account-deletion] Failed to send confirmation email:', emailError);
      // Don't fail the request if email fails
    }

    console.log(`[request-account-deletion] Successfully scheduled deletion for user ${user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account deletion scheduled',
        scheduled_deletion_at: scheduledDeletionAt.toISOString(),
        request_id: deletionRequest.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[request-account-deletion] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process deletion request' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
