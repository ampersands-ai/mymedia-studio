/**
 * Credit Service Module
 * Handles token/credit operations including checking, deducting, and refunding
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../../_shared/edge-logger.ts";

export interface TokenCheckResult {
  hasEnough: boolean;
  available: number;
  required: number;
}

export interface TokenDeductResult {
  success: boolean;
  newBalance: number;
  error?: string;
}

/**
 * Check if user has sufficient token balance
 */
export async function checkTokenBalance(
  supabase: SupabaseClient,
  userId: string,
  requiredTokens: number,
  logger: EdgeLogger
): Promise<TokenCheckResult> {
  const { data: subscription, error: subError } = await supabase
    .from('user_subscriptions')
    .select('tokens_remaining')
    .eq('user_id', userId)
    .single();

  if (subError || !subscription) {
    throw new Error('Subscription not found');
  }

  return {
    hasEnough: subscription.tokens_remaining >= requiredTokens,
    available: subscription.tokens_remaining,
    required: requiredTokens
  };
}

/**
 * Deduct tokens from user account atomically
 */
export async function deductTokens(
  supabase: SupabaseClient,
  userId: string,
  tokenCost: number,
  logger: EdgeLogger,
  responseHeaders: Record<string, string>
): Promise<{ success: true; newBalance: number } | { success: false; response: Response }> {
  // First check balance
  const balanceCheck = await checkTokenBalance(supabase, userId, tokenCost, logger);
  
  if (!balanceCheck.hasEnough) {
    return {
      success: false,
      response: new Response(
        JSON.stringify({ 
          error: 'Insufficient credits',
          type: 'INSUFFICIENT_TOKENS',
          required: tokenCost,
          available: balanceCheck.available,
          message: `You need ${tokenCost} credits but only have ${balanceCheck.available} credits available.`
        }),
        { status: 402, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      )
    };
  }

  // Deduct tokens using atomic database function with row-level locking
  const { data: deductResult, error: deductError } = await supabase
    .rpc('deduct_user_tokens', {
      p_user_id: userId,
      p_cost: tokenCost
    });

  if (deductError) {
    logger.error('Token deduction failed', deductError instanceof Error ? deductError : new Error(String(deductError) || 'Database error'), {
      userId,
      metadata: { cost: tokenCost }
    });
    throw new Error('Failed to deduct tokens - database error');
  }

  if (!deductResult || deductResult.length === 0) {
    logger.error('Token deduction returned no result', undefined, {
      userId,
      metadata: { cost: tokenCost }
    });
    throw new Error('Failed to deduct tokens - no result returned');
  }

  const result = deductResult[0];
  
  if (!result.success) {
    if (result.error_message === 'Insufficient tokens') {
      return {
        success: false,
        response: new Response(
          JSON.stringify({ 
            error: 'Insufficient credits',
            type: 'INSUFFICIENT_TOKENS',
            required: tokenCost,
            available: result.tokens_remaining || 0,
            message: `You need ${tokenCost} credits but only have ${result.tokens_remaining || 0} credits available.`
          }),
          { status: 402, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
        )
      };
    }
    
    logger.error('Token deduction failed', undefined, {
      userId,
      metadata: { error: result.error_message, cost: tokenCost }
    });
    throw new Error(`Failed to deduct tokens: ${result.error_message}`);
  }

  logger.info('Tokens deducted successfully', {
    userId,
    metadata: { 
      tokens_deducted: tokenCost,
      new_balance: result.tokens_remaining 
    }
  });

  return { success: true, newBalance: result.tokens_remaining };
}

/**
 * Refund tokens to user account
 */
export async function refundTokens(
  supabase: SupabaseClient,
  userId: string,
  tokenAmount: number,
  logger: EdgeLogger,
  reason?: string
): Promise<void> {
  await supabase.rpc('increment_tokens', {
    user_id_param: userId,
    amount: tokenAmount
  });

  logger.info('Credits refunded', {
    userId,
    metadata: { 
      tokens_refunded: tokenAmount,
      reason: reason || 'unspecified'
    }
  });
}

/**
 * Log token transaction to audit logs
 */
export async function logTokenTransaction(
  supabase: SupabaseClient,
  userId: string,
  action: 'tokens_deducted' | 'tokens_refunded',
  tokenAmount: number,
  tokensRemaining: number,
  modelId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await supabase.from('audit_logs').insert({
    user_id: userId,
    action,
    metadata: {
      ...metadata,
      [action === 'tokens_deducted' ? 'tokens_deducted' : 'tokens_refunded']: tokenAmount,
      tokens_remaining: tokensRemaining,
      model_id: modelId,
      model_name: modelId
    }
  });
}
