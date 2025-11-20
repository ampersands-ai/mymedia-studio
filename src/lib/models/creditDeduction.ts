import { supabase } from "@/integrations/supabase/client";

/**
 * Deduct credits from user's subscription before executing a generation
 * @throws Error if insufficient credits or subscription not found
 */
export async function deductCredits(userId: string, cost: number): Promise<void> {
  // Get current subscription
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

  // Deduct credits
  const { error: updateError } = await supabase
    .from("user_subscriptions")
    .update({ 
      tokens_remaining: subscription.tokens_remaining - cost,
      updated_at: new Date().toISOString()
    })
    .eq("user_id", userId);

  if (updateError) {
    throw new Error("Failed to deduct credits. Please try again.");
  }
}

/**
 * Refund credits if generation fails after deduction
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
