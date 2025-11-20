import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { settleCredits, releaseCredits } from './creditSettlement.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { generationId, status } = await req.json();

    if (!generationId || !status) {
      throw new Error('Missing generationId or status');
    }

    const { data: generation } = await supabase
      .from('generations')
      .select('user_id, tokens_used, tokens_charged')
      .eq('id', generationId)
      .single();

    if (!generation) {
      throw new Error('Generation not found');
    }

    // Already settled
    if (generation.tokens_charged > 0) {
      return new Response(JSON.stringify({ message: 'Already settled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (status === 'completed') {
      await settleCredits(generation.user_id, generationId, generation.tokens_used);
      return new Response(JSON.stringify({ success: true, charged: generation.tokens_used }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else if (status === 'failed') {
      await releaseCredits(generationId);
      return new Response(JSON.stringify({ success: true, charged: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ message: 'No action needed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Settlement error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
