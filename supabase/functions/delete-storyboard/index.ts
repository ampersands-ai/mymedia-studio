import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { storyboardId } = await req.json();

    if (!storyboardId) {
      throw new Error('storyboardId is required');
    }

    console.log('[delete-storyboard] Deleting storyboard:', storyboardId, 'for user:', user.id);

    // Verify storyboard belongs to the user
    const { data: storyboard, error: verifyError } = await supabaseClient
      .from('storyboards')
      .select('id')
      .eq('id', storyboardId)
      .eq('user_id', user.id)
      .single();

    if (verifyError || !storyboard) {
      throw new Error('Storyboard not found or unauthorized');
    }

    // Delete all scenes first (foreign key constraint)
    const { error: scenesError } = await supabaseClient
      .from('storyboard_scenes')
      .delete()
      .eq('storyboard_id', storyboardId);

    if (scenesError) {
      console.error('[delete-storyboard] Error deleting scenes:', scenesError);
      throw new Error('Failed to delete storyboard scenes');
    }

    // Delete the storyboard
    const { error: storyboardError } = await supabaseClient
      .from('storyboards')
      .delete()
      .eq('id', storyboardId);

    if (storyboardError) {
      console.error('[delete-storyboard] Error deleting storyboard:', storyboardError);
      throw new Error('Failed to delete storyboard');
    }

    console.log('[delete-storyboard] Successfully deleted storyboard and scenes');

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[delete-storyboard] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
