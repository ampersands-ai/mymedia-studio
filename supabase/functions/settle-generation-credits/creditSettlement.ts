import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

export async function settleCredits(userId: string, generationId: string, cost: number): Promise<void> {
  // Only mark the generation as charged - credits were already deducted upfront in generate-content
  await supabase.from("generations").update({ 
    tokens_charged: cost,
    updated_at: new Date().toISOString()
  }).eq("id", generationId);
  // DO NOT deduct from tokens_remaining here - already done in generate-content
}

export async function releaseCredits(generationId: string): Promise<void> {
  // Get the generation to find user and cost for refund
  const { data: generation } = await supabase
    .from("generations")
    .select("user_id, tokens_used")
    .eq("id", generationId)
    .single();

  if (!generation) return;

  // Mark generation as not charged
  await supabase.from("generations").update({ 
    tokens_charged: 0,
    updated_at: new Date().toISOString()
  }).eq("id", generationId);

  // Refund the credits back to user since generation failed
  const { data: subscription } = await supabase
    .from("user_subscriptions")
    .select("tokens_remaining")
    .eq("user_id", generation.user_id)
    .single();

  if (subscription) {
    await supabase.from("user_subscriptions").update({ 
      tokens_remaining: subscription.tokens_remaining + generation.tokens_used,
      updated_at: new Date().toISOString()
    }).eq("user_id", generation.user_id);
  }
}
