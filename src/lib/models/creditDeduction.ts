import { supabase } from "@/integrations/supabase/client";

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
    if (availableCredits.available_credits < cost) {
      throw new Error(`Insufficient available credits. Required: ${cost}, Available: ${availableCredits.available_credits}`);
    }
  }
}

/**
 * Settle credits - Deduct credits after successful generation
 * Called by webhooks when generation status becomes 'completed'
 */
export async function settleCredits(userId: string, generationId: string, cost: number): Promise<void> {
  // Mark generation as charged
  const { error: genError } = await supabase
    .from("generations")
    .update({ 
      tokens_charged: cost,
      updated_at: new Date().toISOString()
    })
    .eq("id", generationId);

  if (genError) {
    console.error("Failed to mark generation as charged:", genError);
    throw new Error("Failed to update generation charge status");
  }

  // Deduct from user balance
  const { data: subscription, error: subError } = await supabase
    .from("user_subscriptions")
    .select("tokens_remaining")
    .eq("user_id", userId)
    .single();

  if (subError || !subscription) {
    throw new Error("Subscription not found");
  }

  const { error: updateError } = await supabase
    .from("user_subscriptions")
    .update({ 
      tokens_remaining: Math.max(0, subscription.tokens_remaining - cost),
      updated_at: new Date().toISOString()
    })
    .eq("user_id", userId);

  if (updateError) {
    console.error("Failed to deduct credits:", updateError);
    throw new Error("Failed to deduct credits");
  }
}

/**
 * Legacy function - kept for backward compatibility
 * @deprecated Use reserveCredits() + settleCredits() instead
 */
export async function deductCredits(userId: string, cost: number): Promise<void> {
  await reserveCredits(userId, cost);
}

/**
 * Release reserved credits - Called when generation fails
 * Sets tokens_charged = 0 so credits remain available
 */
export async function releaseCredits(generationId: string): Promise<void> {
  const { error } = await supabase
    .from("generations")
    .update({ 
      tokens_charged: 0,
      updated_at: new Date().toISOString()
    })
    .eq("id", generationId);

  if (error) {
    console.error("Failed to release reserved credits:", error);
  }
}

/**
 * Legacy refund function - kept for backward compatibility
 * @deprecated Use releaseCredits() instead
 */
export async function refundCredits(userId: string, cost: number): Promise<void> {
  const { error } = await supabase.rpc("increment_tokens", {
    user_id_param: userId,
    amount: cost
  });

  if (error) {
    console.error("Failed to refund credits:", error);
  }
}
