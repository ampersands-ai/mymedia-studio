import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

/**
 * Reserve credits - Check if user has sufficient balance WITHOUT deducting
 * Used in "Reserve & Settle" pattern: check balance before generation
 * @throws Error if insufficient credits or subscription not found
 */
export async function reserveCredits(userId: string, cost: number): Promise<void> {
  // Get current subscription with reserved credits
  const { data: availableCredits, error: creditsError } = await supabase
    .from("user_available_credits")
    .select("available_credits")
    .eq("user_id", userId)
    .single();

  if (creditsError || !availableCredits) {
    // Fallback to direct subscription check if view fails
    const { data: subscription, error: subError } = await supabase
      .from("user_subscriptions")
      .select("tokens_remaining, status")
      .eq("user_id", userId)
      .single();

    if (subError || !subscription) {
      throw new Error("Subscription not found. Please check your account status.");
    }

    if (subscription.status !== "active") {
      throw new Error("Your subscription is not active. Please renew to continue.");
    }

    if (subscription.tokens_remaining < cost) {
      throw new Error(`Insufficient credits. Required: ${cost}, Available: ${subscription.tokens_remaining}`);
    }
  } else {
    // Check available credits (total - reserved)
    const available = availableCredits.available_credits ?? 0;
    if (available < cost) {
      throw new Error(`Insufficient available credits. Required: ${cost}, Available: ${available}`);
    }
  }
}

/**
 * Settle credits - Mark generation as charged after successful completion
 * Credits were already deducted upfront in generate-content edge function
 * Called by webhooks when generation status becomes 'completed'
 */
export async function settleCredits(_userId: string, generationId: string, cost: number): Promise<void> {
  // Only mark generation as charged - credits were already deducted upfront
  const { error: genError } = await supabase
    .from("generations")
    .update({ 
      tokens_charged: cost,
      updated_at: new Date().toISOString()
    })
    .eq("id", generationId);

  if (genError) {
    logger.error("Failed to mark generation as charged", genError);
    throw new Error("Failed to update generation charge status");
  }
  // DO NOT deduct from tokens_remaining here - already done in generate-content
}


/**
 * Release credits - Called when generation fails
 * Refunds the credits back to user since they were deducted upfront
 */
export async function releaseCredits(generationId: string): Promise<void> {
  // Get the generation to find user and cost for refund
  const { data: generation, error: fetchError } = await supabase
    .from("generations")
    .select("user_id, tokens_used")
    .eq("id", generationId)
    .single();

  if (fetchError || !generation) {
    logger.error("Failed to fetch generation for credit release", fetchError);
    return;
  }

  // Mark generation as not charged
  const { error: updateError } = await supabase
    .from("generations")
    .update({ 
      tokens_charged: 0,
      updated_at: new Date().toISOString()
    })
    .eq("id", generationId);

  if (updateError) {
    logger.error("Failed to mark generation as not charged", updateError);
  }

  // Refund the credits back to user since generation failed
  const { data: subscription, error: subError } = await supabase
    .from("user_subscriptions")
    .select("tokens_remaining")
    .eq("user_id", generation.user_id)
    .single();

  if (subError || !subscription) {
    logger.error("Failed to fetch subscription for refund", subError);
    return;
  }

  const { error: refundError } = await supabase
    .from("user_subscriptions")
    .update({ 
      tokens_remaining: subscription.tokens_remaining + generation.tokens_used,
      updated_at: new Date().toISOString()
    })
    .eq("user_id", generation.user_id);

  if (refundError) {
    logger.error("Failed to refund credits", refundError);
  }
}
