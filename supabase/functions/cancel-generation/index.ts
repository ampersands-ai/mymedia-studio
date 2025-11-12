import { serve } from "std/http/server.ts";
import { createClient } from "supabase";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is authenticated
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { generation_id } = await req.json();
    
    if (!generation_id) {
      return new Response(
        JSON.stringify({ error: 'Missing generation_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get generation details and verify ownership
    const { data: generation, error: getError } = await supabase
      .from('generations')
      .select('*')
      .eq('id', generation_id)
      .eq('user_id', user.id) // Only allow canceling own generations
      .maybeSingle();

    if (getError || !generation) {
      return new Response(
        JSON.stringify({ error: 'Generation not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only allow canceling if still processing
    if (generation.status !== 'processing') {
      return new Response(
        JSON.stringify({ error: `Cannot cancel generation with status: ${generation.status}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`User ${user.id} canceling generation ${generation_id}`);
      
    // Mark as failed with user cancellation message
    const { error: updateError } = await supabase
      .from('generations')
      .update({
        status: 'failed',
        provider_response: {
          error: 'Generation canceled by user',
          canceled_at: new Date().toISOString(),
          canceled_by: user.id
        }
      })
      .eq('id', generation_id);

    if (updateError) {
      throw new Error(`Failed to update generation: ${updateError.message}`);
    }

    // Refund tokens
    await supabase.rpc('increment_tokens', {
      user_id_param: user.id,
      amount: generation.tokens_used
    });

    console.log(`Tokens refunded: ${generation.tokens_used} to user ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Generation canceled and tokens refunded',
        tokens_refunded: generation.tokens_used
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Cancel generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
