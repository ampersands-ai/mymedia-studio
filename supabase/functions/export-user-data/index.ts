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

    console.log(`[export-user-data] User ${user.id} requesting data export`);

    // Check for recent pending/processing export request (rate limit)
    const { data: recentRequest, error: checkError } = await supabase
      .from('data_export_requests')
      .select('id, status, requested_at')
      .eq('user_id', user.id)
      .in('status', ['pending', 'processing'])
      .order('requested_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (checkError) {
      console.error('[export-user-data] Error checking recent request:', checkError);
      throw checkError;
    }

    if (recentRequest) {
      return new Response(
        JSON.stringify({ error: 'An export is already in progress. Please wait for it to complete.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create export request
    const { data: exportRequest, error: insertError } = await supabase
      .from('data_export_requests')
      .insert({
        user_id: user.id,
        status: 'processing',
      })
      .select()
      .single();

    if (insertError) {
      console.error('[export-user-data] Error creating export request:', insertError);
      throw insertError;
    }

    // Gather all user data
    const exportData: Record<string, any> = {
      export_metadata: {
        exported_at: new Date().toISOString(),
        user_id: user.id,
        email: user.email,
      },
    };

    // 1. Profile data
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    exportData.profile = profile;

    // 2. Subscription data
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    exportData.subscription = subscription;

    // 3. Generations (limit to last 1000)
    const { data: generations } = await supabase
      .from('generations')
      .select('id, type, prompt, status, tokens_used, created_at, model_id, settings')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1000);
    exportData.generations = generations;

    // 4. Storyboards
    const { data: storyboards } = await supabase
      .from('storyboards')
      .select('id, topic, tone, style, status, duration, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);
    exportData.storyboards = storyboards;

    // 5. Community creations
    const { data: communityCreations } = await supabase
      .from('community_creations')
      .select('id, prompt, content_type, likes_count, views_count, shared_at')
      .eq('user_id', user.id);
    exportData.community_creations = communityCreations;

    // 6. Audit logs (security-relevant actions)
    const { data: auditLogs } = await supabase
      .from('audit_logs')
      .select('action, resource_type, created_at, ip_address')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(500);
    exportData.audit_logs = auditLogs;

    // 7. Consent records
    const { data: consentRecords } = await supabase
      .from('user_consent_records')
      .select('consent_type, consented, consented_at, withdrawn_at')
      .eq('user_id', user.id);
    exportData.consent_records = consentRecords;

    // 8. Email history (without full content)
    const { data: emailHistory } = await supabase
      .from('email_history')
      .select('email_type, subject, sent_at, delivery_status')
      .eq('user_id', user.id)
      .order('sent_at', { ascending: false })
      .limit(100);
    exportData.email_history = emailHistory;

    // 9. Notification preferences (if exists)
    const { data: notifications } = await supabase
      .from('generation_notifications')
      .select('notification_type, sent_at, delivery_status')
      .eq('user_id', user.id)
      .order('sent_at', { ascending: false })
      .limit(100);
    exportData.notifications = notifications;

    // Convert to JSON and calculate size
    const jsonData = JSON.stringify(exportData, null, 2);
    const dataSize = new Blob([jsonData]).size;

    // Store in Supabase Storage
    const fileName = `user-data-export-${user.id}-${Date.now()}.json`;
    const { error: uploadError } = await supabase.storage
      .from('user-exports')
      .upload(fileName, jsonData, {
        contentType: 'application/json',
        upsert: true,
      });

    if (uploadError) {
      // If bucket doesn't exist, just return the data directly
      console.warn('[export-user-data] Storage upload failed, returning data directly:', uploadError);
      
      // Update request as completed without download URL
      await supabase
        .from('data_export_requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          file_size_bytes: dataSize,
        })
        .eq('id', exportRequest.id);

      // Log the export
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'data_exported',
        resource_type: 'account',
        resource_id: user.id,
        metadata: {
          file_size_bytes: dataSize,
          records_count: {
            generations: generations?.length || 0,
            storyboards: storyboards?.length || 0,
            audit_logs: auditLogs?.length || 0,
          },
        },
      });

      // Return data directly as download
      return new Response(jsonData, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${fileName}"`,
        },
      });
    }

    // Create signed URL (expires in 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { data: signedUrlData } = await supabase.storage
      .from('user-exports')
      .createSignedUrl(fileName, 60 * 60 * 24 * 7); // 7 days in seconds

    // Update request as completed
    await supabase
      .from('data_export_requests')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        download_url: signedUrlData?.signedUrl || null,
        expires_at: expiresAt.toISOString(),
        file_size_bytes: dataSize,
      })
      .eq('id', exportRequest.id);

    // Log the export
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'data_exported',
      resource_type: 'account',
      resource_id: user.id,
      metadata: {
        file_size_bytes: dataSize,
        records_count: {
          generations: generations?.length || 0,
          storyboards: storyboards?.length || 0,
          audit_logs: auditLogs?.length || 0,
        },
      },
    });

    console.log(`[export-user-data] Successfully exported data for user ${user.id}, size: ${dataSize} bytes`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Data export completed',
        download_url: signedUrlData?.signedUrl || null,
        expires_at: expiresAt.toISOString(),
        file_size_bytes: dataSize,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[export-user-data] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to export user data' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
