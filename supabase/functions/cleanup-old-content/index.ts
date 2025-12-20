import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CleanupStats {
  warnings_sent: number;
  content_deleted: number;
  storage_files_deleted: number;
  errors: string[];
}

Deno.serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);
  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('cleanup-old-content', requestId);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  const stats: CleanupStats = {
    warnings_sent: 0,
    content_deleted: 0,
    storage_files_deleted: 0,
    errors: [],
  };

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    logger.info('Starting daily content cleanup job');

    // Calculate date thresholds
    const now = new Date();
    const thirteenDaysAgo = new Date(now);
    thirteenDaysAgo.setDate(thirteenDaysAgo.getDate() - 13);
    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    // ============================================
    // PHASE 1: Send 24-hour warning emails (Day 13)
    // ============================================
    logger.info('Phase 1: Sending warning emails for content at day 13');

    // Find generations that are 13 days old and haven't been warned
    const { data: generationsToWarn, error: warnQueryError } = await supabase
      .from('generations')
      .select(`
        id, 
        user_id, 
        type, 
        prompt, 
        created_at, 
        output_url
      `)
      .gte('created_at', fourteenDaysAgo.toISOString())
      .lt('created_at', thirteenDaysAgo.toISOString())
      .eq('status', 'completed');

    if (warnQueryError) {
      logger.error('Error querying generations to warn', warnQueryError as Error);
      stats.errors.push(`Query error: ${warnQueryError.message}`);
    }

    if (generationsToWarn && generationsToWarn.length > 0) {
      // Group generations by user
      const userGenerations = new Map<string, typeof generationsToWarn>();
      for (const gen of generationsToWarn) {
        const existing = userGenerations.get(gen.user_id) || [];
        existing.push(gen);
        userGenerations.set(gen.user_id, existing);
      }

      // Check which users have already been warned today
      const { data: existingWarnings } = await supabase
        .from('content_deletion_warnings')
        .select('user_id')
        .gte('warned_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString());

      const alreadyWarnedUsers = new Set(existingWarnings?.map(w => w.user_id) || []);

      // Send warning emails to users who haven't been warned today
      for (const [userId, gens] of userGenerations) {
        if (alreadyWarnedUsers.has(userId)) {
          continue;
        }

        try {
          // Get user profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, profile_name')
            .eq('id', userId)
            .single();

          if (!profile?.email) {
            continue;
          }

          const generationIds = gens.map(g => g.id);

          // Send warning email
          const { error: emailError } = await resend.emails.send({
            from: 'Artifio <noreply@artifio.ai>',
            to: [profile.email],
            subject: '⚠️ Your generated content will be deleted in 24 hours',
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <style>
                  body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                  .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                  .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                  .warning-box { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0; }
                  .footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 30px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1 style="margin: 0;">⚠️ Content Deletion Warning</h1>
                  </div>
                  <div class="content">
                    <p>Hi <strong>${profile.profile_name || 'Creator'}</strong>,</p>
                    
                    <div class="warning-box">
                      <strong>Important:</strong> ${gens.length} of your generated content item${gens.length > 1 ? 's' : ''} will be automatically deleted in <strong>24 hours</strong> as part of our data retention policy.
                    </div>
                    
                    <p>Content scheduled for deletion:</p>
                    <ul>
                      ${gens.slice(0, 5).map(g => `<li>${g.type}: "${(g.prompt || '').substring(0, 50)}${(g.prompt || '').length > 50 ? '...' : ''}"</li>`).join('')}
                      ${gens.length > 5 ? `<li>...and ${gens.length - 5} more items</li>` : ''}
                    </ul>
                    
                    <p>If you want to keep this content, please download it before the deletion date.</p>
                    
                    <div style="text-align: center;">
                      <a href="https://artifio.ai/dashboard/history" class="button">
                        Download Your Content
                      </a>
                    </div>
                    
                    <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                      This is an automated message as part of our 14-day data retention policy. All generated content is automatically deleted after 14 days to protect your privacy.
                    </p>
                  </div>
                  <div class="footer">
                    <p>© ${new Date().getFullYear()} Artifio. All rights reserved.</p>
                  </div>
                </div>
              </body>
              </html>
            `
          });

          if (emailError) {
            logger.error('Failed to send warning email', emailError as Error, { userId });
            stats.errors.push(`Email error for ${userId}: ${(emailError as any).message}`);
          } else {
            stats.warnings_sent++;

            // Record the warning
            await supabase.from('content_deletion_warnings').insert({
              user_id: userId,
              generation_ids: generationIds,
              scheduled_deletion_at: fourteenDaysAgo.toISOString(),
              email_sent: true,
            });

            // Log to email history
            await supabase.from('email_history').insert({
              user_id: userId,
              recipient_email: profile.email,
              email_type: 'content_deletion_warning',
              subject: '⚠️ Your generated content will be deleted in 24 hours',
              delivery_status: 'sent',
              metadata: {
                generation_count: gens.length,
                generation_ids: generationIds,
              }
            });
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          logger.error('Error processing warning for user', err as Error, { userId });
          stats.errors.push(`Warning error for ${userId}: ${errorMessage}`);
        }
      }
    }

    logger.info(`Phase 1 complete: ${stats.warnings_sent} warning emails sent`);

    // ============================================
    // PHASE 2: Delete content older than 14 days
    // ============================================
    logger.info('Phase 2: Deleting content older than 14 days');

    // Find generations older than 14 days
    const { data: generationsToDelete, error: deleteQueryError } = await supabase
      .from('generations')
      .select('id, user_id, storage_path, type')
      .lt('created_at', fourteenDaysAgo.toISOString())
      .eq('status', 'completed');

    if (deleteQueryError) {
      logger.error('Error querying generations to delete', deleteQueryError as Error);
      stats.errors.push(`Delete query error: ${deleteQueryError.message}`);
    }

    if (generationsToDelete && generationsToDelete.length > 0) {
      // Delete from storage first
      const storagePaths = generationsToDelete
        .filter(g => g.storage_path)
        .map(g => g.storage_path as string);

      if (storagePaths.length > 0) {
        // Delete in batches of 100
        for (let i = 0; i < storagePaths.length; i += 100) {
          const batch = storagePaths.slice(i, i + 100);
          const { error: storageError } = await supabase.storage
            .from('generated-content')
            .remove(batch);

          if (storageError) {
            logger.error('Error deleting from storage', storageError as Error, { 
              metadata: { batch_start: i, batch_size: batch.length } 
            });
            stats.errors.push(`Storage delete error: ${storageError.message}`);
          } else {
            stats.storage_files_deleted += batch.length;
          }
        }
      }

      // Delete generation records
      const generationIds = generationsToDelete.map(g => g.id);
      
      // Delete in batches of 100
      for (let i = 0; i < generationIds.length; i += 100) {
        const batch = generationIds.slice(i, i + 100);
        const { error: dbError } = await supabase
          .from('generations')
          .delete()
          .in('id', batch);

        if (dbError) {
          logger.error('Error deleting generations from database', dbError as Error, { 
            metadata: { batch_start: i, batch_size: batch.length } 
          });
          stats.errors.push(`DB delete error: ${dbError.message}`);
        } else {
          stats.content_deleted += batch.length;
        }
      }

      // Clean up warning records
      await supabase
        .from('content_deletion_warnings')
        .delete()
        .lt('scheduled_deletion_at', fourteenDaysAgo.toISOString());
    }

    logger.info(`Phase 2 complete: ${stats.content_deleted} generations deleted, ${stats.storage_files_deleted} storage files deleted`);

    // ============================================
    // Log cleanup results
    // ============================================
    await supabase.from('audit_logs').insert({
      action: 'content_cleanup_completed',
      resource_type: 'system',
      metadata: {
        warnings_sent: stats.warnings_sent,
        content_deleted: stats.content_deleted,
        storage_files_deleted: stats.storage_files_deleted,
        errors_count: stats.errors.length,
        errors: stats.errors.slice(0, 10), // Only store first 10 errors
        execution_date: now.toISOString(),
      },
    });

    logger.info('Content cleanup job completed', { metadata: stats as unknown as Record<string, unknown> });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Content cleanup completed',
        stats,
      }),
      { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logger.error('Error in cleanup job', error as Error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    stats.errors.push(`Fatal error: ${errorMessage}`);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        stats,
      }),
      { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
