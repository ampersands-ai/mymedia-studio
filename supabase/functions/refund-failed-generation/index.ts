import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { applyRateLimit } from "../_shared/rate-limit-middleware.ts";

const refundSchema = z.object({
  generation_id: z.string().uuid(),
  reason: z.string().min(1).max(1000),
});

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('refund-failed-generation', requestId);
  const startTime = Date.now();

  const responseHeaders = getResponseHeaders(req);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  // Rate limiting - standard tier
  const rateLimitResponse = await applyRateLimit(req, 'standard', 'refund-failed-generation');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request
    const body = await req.json();
    const { generation_id, reason } = refundSchema.parse(body);

    logger.info('Processing refund request', { userId: user.id, metadata: { generation_id } });

    // Get the generation and verify ownership + failed status
    const { data: generation, error: genError } = await supabaseAdmin
      .from('generations')
      .select('id, user_id, status, tokens_used, tokens_charged')
      .eq('id', generation_id)
      .single();

    if (genError || !generation) {
      throw new Error('Generation not found');
    }

    // Verify ownership
    if (generation.user_id !== user.id) {
      throw new Error('Unauthorized: This generation does not belong to you');
    }

    // Verify it's a failed generation
    if (generation.status !== 'failed') {
      throw new Error('Only failed generations can be refunded through this endpoint');
    }

    // Check if already refunded (tokens_charged should be 0 for refunded)
    if (generation.tokens_charged === 0 && generation.tokens_used === 0) {
      throw new Error('This generation has no credits to refund');
    }

    // Check for existing dispute
    const { data: existingDispute } = await supabaseAdmin
      .from('token_dispute_reports')
      .select('id')
      .eq('generation_id', generation_id)
      .maybeSingle();

    if (existingDispute) {
      throw new Error('A refund request already exists for this generation');
    }

    // Check dispute history
    const { data: historyDispute } = await supabaseAdmin
      .from('token_dispute_history')
      .select('id, refund_amount')
      .eq('generation_id', generation_id)
      .maybeSingle();

    if (historyDispute) {
      if (historyDispute.refund_amount && historyDispute.refund_amount > 0) {
        throw new Error('This generation was already refunded');
      }
      throw new Error('A dispute was already processed for this generation');
    }

    // Refund tokens using atomic RPC
    const refundAmount = generation.tokens_used;
    const { error: refundError } = await supabaseAdmin.rpc('increment_tokens', {
      user_id_param: user.id,
      amount: refundAmount
    });

    if (refundError) {
      logger.error('Failed to refund tokens', refundError as Error);
      throw new Error('Failed to process refund');
    }

    // Create auto-resolved dispute record
    const { error: disputeError } = await supabaseAdmin
      .from('token_dispute_reports')
      .insert({
        generation_id: generation_id,
        user_id: user.id,
        reason: reason,
        status: 'resolved',
        auto_resolved: true,
        refund_amount: refundAmount,
        admin_notes: `Auto-resolved on ${new Date().toISOString()}\nReason: Failed generation detected\nAction: Refunded ${refundAmount} credits automatically\nGeneration ID: ${generation_id}`,
      });

    if (disputeError) {
      // Rollback refund if dispute record fails
      await supabaseAdmin.rpc('increment_tokens', {
        user_id_param: user.id,
        amount: -refundAmount
      });
      logger.error('Failed to create dispute record', disputeError as Error);
      throw new Error('Failed to record refund');
    }

    // Update generation tokens_charged to 0 to mark as refunded
    await supabaseAdmin
      .from('generations')
      .update({ tokens_charged: 0 })
      .eq('id', generation_id);

    // Log audit
    await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id,
      action: 'generation_refunded',
      resource_type: 'generation',
      resource_id: generation_id,
      metadata: {
        refund_amount: refundAmount,
        reason: reason,
        auto_resolved: true,
        timestamp: new Date().toISOString()
      }
    });

    // Send admin notification email
    try {
      await supabaseAdmin.functions.invoke('send-dispute-notification', {
        body: {
          generation_id: generation_id,
          user_id: user.id,
          reason: reason,
          refund_amount: refundAmount,
          auto_resolved: true,
          status: 'resolved'
        }
      });
    } catch (emailError) {
      // Don't fail the refund if email fails
      logger.warn('Failed to send admin notification', { error: emailError });
    }

    logger.info('Refund processed successfully', {
      userId: user.id,
      metadata: { generation_id, refund_amount: refundAmount }
    });
    logger.logDuration('Refund request', startTime);

    return new Response(
      JSON.stringify({
        success: true,
        refund_amount: refundAmount,
        message: `${refundAmount} credits have been refunded to your account`
      }),
      { status: 200, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error('Refund failed', error as Error);
    
    const message = (error as Error)?.message || 'An error occurred';
    const status = message.includes('Unauthorized') ? 401 : 400;

    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
