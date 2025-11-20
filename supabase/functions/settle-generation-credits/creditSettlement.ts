import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

export async function settleCredits(userId: string, generationId: string, cost: number): Promise<void> {
  await supabase.from("generations").update({ 
    tokens_charged: cost,
    updated_at: new Date().toISOString()
  }).eq("id", generationId);

  const { data: subscription } = await supabase
    .from("user_subscriptions")
    .select("tokens_remaining")
    .eq("user_id", userId)
    .single();

  if (subscription) {
    await supabase.from("user_subscriptions").update({ 
      tokens_remaining: Math.max(0, subscription.tokens_remaining - cost),
      updated_at: new Date().toISOString()
    }).eq("user_id", userId);
  }
}

export async function releaseCredits(generationId: string): Promise<void> {
  await supabase.from("generations").update({ 
    tokens_charged: 0,
    updated_at: new Date().toISOString()
  }).eq("id", generationId);
}
