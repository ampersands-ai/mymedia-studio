import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Process Account Deletions - Scheduled Job
 * 
 * This function processes pending account deletion requests that have passed
 * their scheduled deletion date. It:
 * 1. Wipes credits (sets tokens_remaining to 0)
 * 2. Deletes user data from various tables
 * 3. Marks the deletion request as completed
 * 4. Deletes the auth user
 * 
 * Should be run periodically via cron (e.g., every hour)
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[process-account-deletions] Starting scheduled deletion processing');

    // Find pending deletion requests that are past their scheduled date
    const { data: pendingDeletions, error: fetchError } = await supabase
      .from('account_deletion_requests')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_deletion_at', new Date().toISOString());

    if (fetchError) {
      console.error('[process-account-deletions] Error fetching pending deletions:', fetchError);
      throw fetchError;
    }

    if (!pendingDeletions || pendingDeletions.length === 0) {
      console.log('[process-account-deletions] No pending deletions to process');
      return new Response(
        JSON.stringify({ message: 'No pending deletions to process', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[process-account-deletions] Found ${pendingDeletions.length} deletions to process`);

    let processedCount = 0;
    let errorCount = 0;

    for (const deletion of pendingDeletions) {
      try {
        const userId = deletion.user_id;
        console.log(`[process-account-deletions] Processing deletion for user ${userId}`);

        // Step 1: Wipe credits immediately (per spec: "Credits lost immediately upon deletion")
        const { error: creditError } = await supabase
          .from('user_subscriptions')
          .update({
            tokens_remaining: 0,
            tokens_total: 0,
            frozen_credits: null,
            grace_period_end: null,
          })
          .eq('user_id', userId);

        if (creditError) {
          console.error(`[process-account-deletions] Error wiping credits for ${userId}:`, creditError);
        }

        // Step 2: Delete user's generations
        const { error: genError } = await supabase
          .from('generations')
          .delete()
          .eq('user_id', userId);

        if (genError) {
          console.error(`[process-account-deletions] Error deleting generations for ${userId}:`, genError);
        }

        // Step 3: Delete user's storyboards
        const { error: storyError } = await supabase
          .from('storyboards')
          .delete()
          .eq('user_id', userId);

        if (storyError) {
          console.error(`[process-account-deletions] Error deleting storyboards for ${userId}:`, storyError);
        }

        // Step 4: Delete user's video jobs
        const { error: videoError } = await supabase
          .from('video_jobs')
          .delete()
          .eq('user_id', userId);

        if (videoError) {
          console.error(`[process-account-deletions] Error deleting video jobs for ${userId}:`, videoError);
        }

        // Step 5: Delete user's share tokens
        const { error: shareError } = await supabase
          .from('share_tokens')
          .delete()
          .eq('user_id', userId);

        if (shareError) {
          console.error(`[process-account-deletions] Error deleting share tokens for ${userId}:`, shareError);
        }

        // Step 6: Delete user's subscription
        const { error: subError } = await supabase
          .from('user_subscriptions')
          .delete()
          .eq('user_id', userId);

        if (subError) {
          console.error(`[process-account-deletions] Error deleting subscription for ${userId}:`, subError);
        }

        // Step 7: Delete user's profile
        const { error: profileError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', userId);

        if (profileError) {
          console.error(`[process-account-deletions] Error deleting profile for ${userId}:`, profileError);
        }

        // Step 8: Mark deletion request as completed
        const { error: updateError } = await supabase
          .from('account_deletion_requests')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', deletion.id);

        if (updateError) {
          console.error(`[process-account-deletions] Error updating deletion status for ${userId}:`, updateError);
        }

        // Step 9: Log the deletion
        await supabase.from('audit_logs').insert({
          user_id: userId,
          action: 'account_deleted',
          resource_type: 'account',
          resource_id: userId,
          metadata: {
            deletion_request_id: deletion.id,
            reason: deletion.reason,
            scheduled_at: deletion.scheduled_deletion_at,
            completed_at: new Date().toISOString(),
          },
        });

        // Step 10: Delete auth user (must be last)
        const { error: authError } = await supabase.auth.admin.deleteUser(userId);

        if (authError) {
          console.error(`[process-account-deletions] Error deleting auth user ${userId}:`, authError);
          // Don't throw - the data is already cleaned up
        }

        console.log(`[process-account-deletions] Successfully completed deletion for user ${userId}`);
        processedCount++;

      } catch (userError) {
        console.error(`[process-account-deletions] Error processing deletion for user ${deletion.user_id}:`, userError);
        errorCount++;
        
        // Mark as failed but don't stop processing other users
        await supabase
          .from('account_deletion_requests')
          .update({
            status: 'failed',
            deletion_metadata: {
              ...deletion.deletion_metadata,
              error: userError instanceof Error ? userError.message : 'Unknown error',
              failed_at: new Date().toISOString(),
            },
          })
          .eq('id', deletion.id);
      }
    }

    console.log(`[process-account-deletions] Completed. Processed: ${processedCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({
        message: 'Account deletions processed',
        processed: processedCount,
        errors: errorCount,
        total: pendingDeletions.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[process-account-deletions] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process account deletions' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
