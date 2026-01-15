import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { generateEmailHTML } from "../_shared/email-templates.ts";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Plan tokens for reference
const PLAN_TOKENS: Record<string, number> = {
  freemium: 150,
  starter: 1500,
  professional: 5000,
  enterprise: 15000,
};

interface ReminderResult {
  type: string;
  userId: string;
  sent: boolean;
  error?: string;
}

serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);
  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('send-subscription-reminders', requestId);
  
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const now = new Date();
    const results: ReminderResult[] = [];

    logger.info('Starting subscription reminder processing', {
      metadata: { timestamp: now.toISOString() }
    });

    // ============================================
    // 1. RENEWAL REMINDERS (3 days before billing)
    // ============================================
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    
    const twoDaysFromNow = new Date(now);
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

    const { data: renewalUsers, error: renewalError } = await supabase
      .from('user_subscriptions')
      .select(`
        user_id, 
        plan, 
        current_period_end,
        billing_period,
        profiles!inner(email, profile_name)
      `)
      .eq('status', 'active')
      .gte('current_period_end', twoDaysFromNow.toISOString())
      .lte('current_period_end', threeDaysFromNow.toISOString())
      .neq('plan', 'freemium');

    if (renewalError) {
      logger.error('Error fetching renewal users', renewalError as unknown as Error);
    } else if (renewalUsers && renewalUsers.length > 0) {
      logger.info('Found users for renewal reminder', { 
        metadata: { count: renewalUsers.length } 
      });

      for (const user of renewalUsers) {
        const billingPeriodKey = `renewal_${user.current_period_end?.substring(0, 10)}`;
        
        // Check if already sent
        const { data: existing } = await supabase
          .from('subscription_reminder_logs')
          .select('id')
          .eq('user_id', user.user_id)
          .eq('reminder_type', 'renewal_3d')
          .eq('billing_period_key', billingPeriodKey)
          .single();

        if (existing) continue;

        const profile = user.profiles as any;
        const email = profile?.email;
        if (!email) continue;

        const renewalDate = new Date(user.current_period_end!);
        const planName = user.plan.charAt(0).toUpperCase() + user.plan.slice(1);

        try {
          const emailHTML = generateEmailHTML({
            title: 'Your Subscription Renews Soon',
            preheader: `Your ${planName} plan renews on ${renewalDate.toLocaleDateString()}`,
            headerColor: '#667eea',
            headerEmoji: '🔄',
            sections: [
              {
                type: 'summary',
                title: 'Upcoming Renewal',
                content: `
                  <p>Hi <strong>${profile?.profile_name || 'there'}</strong>,</p>
                  <p>This is a friendly reminder that your <strong>${planName}</strong> plan will automatically renew on <strong>${renewalDate.toLocaleDateString()}</strong>.</p>
                  <p>Your credits will be refreshed and you'll continue enjoying all the premium features.</p>
                `
              },
              {
                type: 'details',
                title: 'Plan Details',
                content: `Plan: ${planName}\nBilling: ${user.billing_period || 'Monthly'}\nRenewal Date: ${renewalDate.toLocaleDateString()}\nCredits on Renewal: ${PLAN_TOKENS[user.plan] || 'N/A'}`
              },
              {
                type: 'actions',
                title: 'Manage Subscription',
                content: [
                  { label: 'View My Plan', url: 'https://artifio.ai/pricing' },
                  { label: 'Manage Subscription', url: 'https://artifio.ai/dashboard/subscription' }
                ]
              }
            ],
            footer: 'If you have any questions, contact support@artifio.ai'
          });

          const { error: emailError } = await resend.emails.send({
            from: 'Artifio <noreply@artifio.ai>',
            to: [email],
            subject: `🔄 Your ${planName} plan renews in 3 days`,
            html: emailHTML,
          });

          if (!emailError) {
            await supabase.from('subscription_reminder_logs').insert({
              user_id: user.user_id,
              reminder_type: 'renewal_3d',
              billing_period_key: billingPeriodKey,
            });

            await supabase.from('email_history').insert({
              user_id: user.user_id,
              recipient_email: email,
              email_type: 'renewal_reminder',
              subject: `🔄 Your ${planName} plan renews in 3 days`,
              delivery_status: 'sent',
              metadata: { plan: user.plan, renewalDate: user.current_period_end }
            });

            results.push({ type: 'renewal_3d', userId: user.user_id, sent: true });
          } else {
            results.push({ type: 'renewal_3d', userId: user.user_id, sent: false, error: emailError.message });
          }
        } catch (err) {
          logger.error('Error sending renewal reminder', err as Error, { metadata: { userId: user.user_id } });
          results.push({ type: 'renewal_3d', userId: user.user_id, sent: false, error: String(err) });
        }
      }
    }

    // ============================================
    // 2. GRACE PERIOD WARNING - 7 DAYS
    // ============================================
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    const sixDaysFromNow = new Date(now);
    sixDaysFromNow.setDate(sixDaysFromNow.getDate() + 6);

    const { data: graceWarning7d, error: grace7dError } = await supabase
      .from('user_subscriptions')
      .select(`
        user_id, 
        plan, 
        grace_period_end,
        tokens_remaining,
        frozen_credits,
        profiles!inner(email, profile_name)
      `)
      .in('status', ['cancelled', 'grace_period'])
      .gte('grace_period_end', sixDaysFromNow.toISOString())
      .lte('grace_period_end', sevenDaysFromNow.toISOString());

    if (grace7dError) {
      logger.error('Error fetching grace period 7d users', grace7dError as unknown as Error);
    } else if (graceWarning7d && graceWarning7d.length > 0) {
      logger.info('Found users for 7-day grace warning', { 
        metadata: { count: graceWarning7d.length } 
      });

      for (const user of graceWarning7d) {
        const billingPeriodKey = `grace_${user.grace_period_end?.substring(0, 10)}`;
        
        const { data: existing } = await supabase
          .from('subscription_reminder_logs')
          .select('id')
          .eq('user_id', user.user_id)
          .eq('reminder_type', 'grace_7d')
          .eq('billing_period_key', billingPeriodKey)
          .single();

        if (existing) continue;

        const profile = user.profiles as any;
        const email = profile?.email;
        if (!email) continue;

        const expiryDate = new Date(user.grace_period_end!);
        const creditsAtRisk = user.frozen_credits || user.tokens_remaining || 0;

        try {
          const emailHTML = generateEmailHTML({
            title: 'Your Credits Expire in 7 Days',
            preheader: `You have ${creditsAtRisk} credits that will expire soon`,
            headerColor: '#d97706',
            headerEmoji: '⚠️',
            sections: [
              {
                type: 'summary',
                title: 'Action Required',
                content: `
                  <p>Hi <strong>${profile?.profile_name || 'there'}</strong>,</p>
                  <p>Your subscription has been cancelled, and your <strong>${creditsAtRisk} credits</strong> will expire on <strong>${expiryDate.toLocaleDateString()}</strong>.</p>
                  <p>Resubscribe now to keep your credits and continue creating amazing content!</p>
                `
              },
              {
                type: 'list',
                title: 'What Happens Next?',
                content: [
                  '✅ Resubscribe now: Keep all your credits',
                  '⏰ Wait: Credits expire on ' + expiryDate.toLocaleDateString(),
                  '❌ After expiry: Account reverts to free tier with limited credits'
                ]
              },
              {
                type: 'actions',
                content: [
                  { label: 'Resubscribe Now', url: 'https://artifio.ai/pricing' }
                ]
              }
            ],
            footer: 'Questions? Contact support@artifio.ai'
          });

          const { error: emailError } = await resend.emails.send({
            from: 'Artifio <noreply@artifio.ai>',
            to: [email],
            subject: `⚠️ Your ${creditsAtRisk} credits expire in 7 days`,
            html: emailHTML,
          });

          if (!emailError) {
            await supabase.from('subscription_reminder_logs').insert({
              user_id: user.user_id,
              reminder_type: 'grace_7d',
              billing_period_key: billingPeriodKey,
            });

            await supabase.from('email_history').insert({
              user_id: user.user_id,
              recipient_email: email,
              email_type: 'grace_warning_7d',
              subject: `⚠️ Your ${creditsAtRisk} credits expire in 7 days`,
              delivery_status: 'sent',
              metadata: { creditsAtRisk, expiryDate: user.grace_period_end }
            });

            results.push({ type: 'grace_7d', userId: user.user_id, sent: true });
          } else {
            results.push({ type: 'grace_7d', userId: user.user_id, sent: false, error: emailError.message });
          }
        } catch (err) {
          logger.error('Error sending grace 7d warning', err as Error, { metadata: { userId: user.user_id } });
          results.push({ type: 'grace_7d', userId: user.user_id, sent: false, error: String(err) });
        }
      }
    }

    // ============================================
    // 3. GRACE PERIOD WARNING - 48 HOURS
    // ============================================
    const twoDaysFromNowGrace = new Date(now);
    twoDaysFromNowGrace.setDate(twoDaysFromNowGrace.getDate() + 2);
    
    const oneDayFromNow = new Date(now);
    oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);

    const { data: graceWarning48h, error: grace48hError } = await supabase
      .from('user_subscriptions')
      .select(`
        user_id, 
        plan, 
        grace_period_end,
        tokens_remaining,
        frozen_credits,
        profiles!inner(email, profile_name)
      `)
      .in('status', ['cancelled', 'grace_period'])
      .gte('grace_period_end', oneDayFromNow.toISOString())
      .lte('grace_period_end', twoDaysFromNowGrace.toISOString());

    if (grace48hError) {
      logger.error('Error fetching grace period 48h users', grace48hError as unknown as Error);
    } else if (graceWarning48h && graceWarning48h.length > 0) {
      logger.info('Found users for 48-hour grace warning', { 
        metadata: { count: graceWarning48h.length } 
      });

      for (const user of graceWarning48h) {
        const billingPeriodKey = `grace_${user.grace_period_end?.substring(0, 10)}`;
        
        const { data: existing } = await supabase
          .from('subscription_reminder_logs')
          .select('id')
          .eq('user_id', user.user_id)
          .eq('reminder_type', 'grace_48h')
          .eq('billing_period_key', billingPeriodKey)
          .single();

        if (existing) continue;

        const profile = user.profiles as any;
        const email = profile?.email;
        if (!email) continue;

        const expiryDate = new Date(user.grace_period_end!);
        const creditsAtRisk = user.frozen_credits || user.tokens_remaining || 0;

        try {
          const emailHTML = generateEmailHTML({
            title: 'Final Warning: Credits Expire Tomorrow',
            preheader: `URGENT: ${creditsAtRisk} credits expire in less than 48 hours`,
            headerColor: '#dc2626',
            headerEmoji: '🚨',
            sections: [
              {
                type: 'summary',
                title: 'Final Notice',
                content: `
                  <p>Hi <strong>${profile?.profile_name || 'there'}</strong>,</p>
                  <p><strong>This is your final reminder.</strong></p>
                  <p>Your <strong>${creditsAtRisk} credits</strong> will be permanently lost on <strong>${expiryDate.toLocaleDateString()}</strong>.</p>
                  <p>After this date, your account will revert to the free tier with only ${PLAN_TOKENS.freemium} credits per month.</p>
                `
              },
              {
                type: 'actions',
                content: [
                  { label: '🔥 Save My Credits Now', url: 'https://artifio.ai/pricing' }
                ]
              }
            ],
            footer: 'This is an automated reminder. Contact support@artifio.ai for help.'
          });

          const { error: emailError } = await resend.emails.send({
            from: 'Artifio <noreply@artifio.ai>',
            to: [email],
            subject: `🚨 FINAL WARNING: ${creditsAtRisk} credits expire in 48 hours`,
            html: emailHTML,
          });

          if (!emailError) {
            await supabase.from('subscription_reminder_logs').insert({
              user_id: user.user_id,
              reminder_type: 'grace_48h',
              billing_period_key: billingPeriodKey,
            });

            await supabase.from('email_history').insert({
              user_id: user.user_id,
              recipient_email: email,
              email_type: 'grace_warning_48h',
              subject: `🚨 FINAL WARNING: ${creditsAtRisk} credits expire in 48 hours`,
              delivery_status: 'sent',
              metadata: { creditsAtRisk, expiryDate: user.grace_period_end }
            });

            results.push({ type: 'grace_48h', userId: user.user_id, sent: true });
          } else {
            results.push({ type: 'grace_48h', userId: user.user_id, sent: false, error: emailError.message });
          }
        } catch (err) {
          logger.error('Error sending grace 48h warning', err as Error, { metadata: { userId: user.user_id } });
          results.push({ type: 'grace_48h', userId: user.user_id, sent: false, error: String(err) });
        }
      }
    }

    // ============================================
    // 4. LOW CREDITS ALERT (< 10% remaining)
    // ============================================
    const { data: lowCreditUsers, error: lowCreditError } = await supabase
      .from('user_subscriptions')
      .select(`
        user_id, 
        plan, 
        tokens_remaining,
        tokens_total,
        profiles!inner(email, profile_name)
      `)
      .eq('status', 'active')
      .neq('plan', 'freemium')
      .gt('tokens_total', 0);

    if (lowCreditError) {
      logger.error('Error fetching low credit users', lowCreditError as unknown as Error);
    } else if (lowCreditUsers && lowCreditUsers.length > 0) {
      const filteredLowCredit = lowCreditUsers.filter(u => 
        u.tokens_remaining / u.tokens_total < 0.1 && u.tokens_remaining > 0
      );

      if (filteredLowCredit.length > 0) {
        logger.info('Found users with low credits', { 
          metadata: { count: filteredLowCredit.length } 
        });

        for (const user of filteredLowCredit) {
          // Use month-year as billing period key to only send once per month
          const billingPeriodKey = `lowcredit_${now.getFullYear()}_${now.getMonth()}`;
          
          const { data: existing } = await supabase
            .from('subscription_reminder_logs')
            .select('id')
            .eq('user_id', user.user_id)
            .eq('reminder_type', 'low_credits')
            .eq('billing_period_key', billingPeriodKey)
            .single();

          if (existing) continue;

          const profile = user.profiles as any;
          const email = profile?.email;
          if (!email) continue;

          const percentRemaining = Math.round((user.tokens_remaining / user.tokens_total) * 100);
          const planName = user.plan.charAt(0).toUpperCase() + user.plan.slice(1);

          try {
            const emailHTML = generateEmailHTML({
              title: 'Running Low on Credits',
              preheader: `You have ${user.tokens_remaining} credits remaining (${percentRemaining}%)`,
              headerColor: '#ea580c',
              headerEmoji: '💫',
              sections: [
                {
                  type: 'summary',
                  title: 'Credits Running Low',
                  content: `
                    <p>Hi <strong>${profile?.profile_name || 'there'}</strong>,</p>
                    <p>You're running low on credits! You have <strong>${user.tokens_remaining} credits</strong> remaining (${percentRemaining}% of your monthly allowance).</p>
                    <p>Consider upgrading your plan or purchasing additional credits to keep creating.</p>
                  `
                },
                {
                  type: 'details',
                  title: 'Credit Usage',
                  content: `Current Plan: ${planName}\nCredits Remaining: ${user.tokens_remaining} / ${user.tokens_total}\nUsage: ${100 - percentRemaining}%`
                },
                {
                  type: 'actions',
                  content: [
                    { label: 'Upgrade Plan', url: 'https://artifio.ai/pricing' },
                    { label: 'View Usage', url: 'https://artifio.ai/dashboard/subscription' }
                  ]
                }
              ],
              footer: 'Manage your notification preferences in Settings'
            });

            const { error: emailError } = await resend.emails.send({
              from: 'Artifio <noreply@artifio.ai>',
              to: [email],
              subject: `💫 Running low: ${user.tokens_remaining} credits remaining`,
              html: emailHTML,
            });

            if (!emailError) {
              await supabase.from('subscription_reminder_logs').insert({
                user_id: user.user_id,
                reminder_type: 'low_credits',
                billing_period_key: billingPeriodKey,
              });

              await supabase.from('email_history').insert({
                user_id: user.user_id,
                recipient_email: email,
                email_type: 'low_credits_alert',
                subject: `💫 Running low: ${user.tokens_remaining} credits remaining`,
                delivery_status: 'sent',
                metadata: { 
                  tokensRemaining: user.tokens_remaining, 
                  tokensTotal: user.tokens_total,
                  percentRemaining 
                }
              });

              results.push({ type: 'low_credits', userId: user.user_id, sent: true });
            } else {
              results.push({ type: 'low_credits', userId: user.user_id, sent: false, error: emailError.message });
            }
          } catch (err) {
            logger.error('Error sending low credits alert', err as Error, { metadata: { userId: user.user_id } });
            results.push({ type: 'low_credits', userId: user.user_id, sent: false, error: String(err) });
          }
        }
      }
    }

    // Summary
    const summary = {
      total: results.length,
      sent: results.filter(r => r.sent).length,
      failed: results.filter(r => !r.sent).length,
      byType: {
        renewal_3d: results.filter(r => r.type === 'renewal_3d').length,
        grace_7d: results.filter(r => r.type === 'grace_7d').length,
        grace_48h: results.filter(r => r.type === 'grace_48h').length,
        low_credits: results.filter(r => r.type === 'low_credits').length,
      }
    };

    logger.info('Subscription reminders completed', { metadata: summary });

    return new Response(
      JSON.stringify({ success: true, summary, results }),
      { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logger.error('Error in send-subscription-reminders', error instanceof Error ? error : new Error(String(error)));
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
