/**
 * Process Grace Periods - Scheduled Job
 * 
 * Runs periodically to:
 * 1. Process expired grace periods - wipe credits for users who didn't resubscribe
 * 2. Process pending downgrades - apply plan changes at end of billing period
 * 
 * Per pricing policy:
 * - Grace period: 30 days after cancellation
 * - After grace period: Credits removed permanently, downgrade to freemium
 * - Pending downgrades: Apply at end of billing cycle, keep existing credits
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";

const FUNCTION_VERSION = "1.0-grace-period-processor";

// Token allocations by plan
const PLAN_TOKENS: Record<string, number> = {
  freemium: 5,
  explorer: 375,
  professional: 1000,
  ultimate: 2500,
  studio: 5000,
  veo_connoisseur: 5000,
};

Deno.serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);
  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('process-grace-periods', requestId);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  try {
    logger.info('Starting grace period processing', { metadata: { version: FUNCTION_VERSION } });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date().toISOString();
    let expiredGracePeriods = 0;
    let appliedDowngrades = 0;

    // ============================================
    // STEP 1: Process Expired Grace Periods
    // ============================================
    // Find users whose grace period has expired
    const { data: expiredGraceUsers, error: graceError } = await supabase
      .from('user_subscriptions')
      .select('user_id, frozen_credits, plan')
      .lt('grace_period_end', now)
      .not('grace_period_end', 'is', null);

    if (graceError) {
      logger.error('Error fetching expired grace periods', graceError as unknown as Error);
    } else if (expiredGraceUsers && expiredGraceUsers.length > 0) {
      logger.info('Found expired grace periods', { 
        metadata: { count: expiredGraceUsers.length } 
      });

      for (const user of expiredGraceUsers) {
        try {
          // Wipe credits and downgrade to freemium
          const { error: updateError } = await supabase
            .from('user_subscriptions')
            .update({
              plan: 'freemium',
              billing_period: 'monthly',
              tokens_remaining: PLAN_TOKENS.freemium,
              tokens_total: PLAN_TOKENS.freemium,
              status: 'expired',
              grace_period_end: null,
              frozen_credits: null,
              stripe_subscription_id: null,
              stripe_customer_id: null,
              dodo_subscription_id: null,
              dodo_customer_id: null,
            })
            .eq('user_id', user.user_id);

          if (updateError) {
            logger.error('Failed to process expired grace period', updateError as unknown as Error, {
              metadata: { userId: user.user_id }
            });
          } else {
            expiredGracePeriods++;
            logger.info('Processed expired grace period - credits wiped', {
              metadata: { 
                userId: user.user_id, 
                previousCredits: user.frozen_credits,
                previousPlan: user.plan 
              }
            });

            // Audit log
            await supabase.from('audit_logs').insert({
              user_id: user.user_id,
              action: 'system.grace_period_expired',
              resource_type: 'subscription',
              metadata: { 
                previousPlan: user.plan,
                creditsLost: user.frozen_credits,
                newPlan: 'freemium',
              },
            });
          }
        } catch (err) {
          logger.error('Exception processing grace period', err as Error, {
            metadata: { userId: user.user_id }
          });
        }
      }
    }

    // ============================================
    // STEP 2: Process Pending Downgrades
    // ============================================
    // Find users with pending downgrades that should be applied
    const { data: pendingDowngrades, error: downgradeError } = await supabase
      .from('user_subscriptions')
      .select('user_id, pending_downgrade_plan, tokens_remaining, plan')
      .lt('pending_downgrade_at', now)
      .not('pending_downgrade_plan', 'is', null);

    if (downgradeError) {
      logger.error('Error fetching pending downgrades', downgradeError as unknown as Error);
    } else if (pendingDowngrades && pendingDowngrades.length > 0) {
      logger.info('Found pending downgrades to apply', { 
        metadata: { count: pendingDowngrades.length } 
      });

      for (const user of pendingDowngrades) {
        try {
          const newPlan = user.pending_downgrade_plan as string;
          
          // Apply the downgrade - keep existing credits per policy
          const { error: updateError } = await supabase
            .from('user_subscriptions')
            .update({
              plan: newPlan,
              pending_downgrade_plan: null,
              pending_downgrade_at: null,
              // Credits stay the same - per policy: "Credits you've already earned stay in your account"
            })
            .eq('user_id', user.user_id);

          if (updateError) {
            logger.error('Failed to apply pending downgrade', updateError as unknown as Error, {
              metadata: { userId: user.user_id }
            });
          } else {
            appliedDowngrades++;
            logger.info('Applied pending downgrade', {
              metadata: { 
                userId: user.user_id, 
                previousPlan: user.plan,
                newPlan,
                creditsRetained: user.tokens_remaining
              }
            });

            // Audit log
            await supabase.from('audit_logs').insert({
              user_id: user.user_id,
              action: 'system.downgrade_applied',
              resource_type: 'subscription',
              metadata: { 
                previousPlan: user.plan,
                newPlan,
                creditsRetained: user.tokens_remaining,
              },
            });
          }
        } catch (err) {
          logger.error('Exception applying downgrade', err as Error, {
            metadata: { userId: user.user_id }
          });
        }
      }
    }

    const summary = {
      expiredGracePeriods,
      appliedDowngrades,
      processedAt: now,
    };

    logger.info('Grace period processing complete', { metadata: summary });

    return new Response(JSON.stringify({ 
      success: true, 
      ...summary 
    }), {
      status: 200,
      headers: { ...responseHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    logger.error('Grace period processing failed', error as Error);
    return new Response(JSON.stringify({ 
      error: 'Processing failed',
      message: (error as Error).message 
    }), {
      status: 500,
      headers: { ...responseHeaders, 'Content-Type': 'application/json' },
    });
  }
});
