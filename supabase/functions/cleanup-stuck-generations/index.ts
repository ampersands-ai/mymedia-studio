import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting cleanup of stuck generations...');

    // Find stuck regular generations (pending or processing for more than 4 hours)
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    
    const { data: stuckGenerations, error: findError } = await supabase
      .from('generations')
      .select('id, user_id, model_id, tokens_used, type, parent_generation_id')
      .in('status', ['pending', 'processing'])
      .lt('created_at', fourHoursAgo.toISOString())
      .is('parent_generation_id', null); // Only main generations, not child videos

    if (findError) {
      throw findError;
    }

    // Find stuck video generations (pending or processing for more than 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const { data: stuckVideos, error: videoFindError } = await supabase
      .from('generations')
      .select('id, user_id, model_id, tokens_used, type, parent_generation_id, output_index')
      .in('status', ['pending', 'processing'])
      .eq('type', 'video')
      .not('parent_generation_id', 'is', null) // Child video generations
      .lt('created_at', fiveMinutesAgo.toISOString());

    if (videoFindError) {
      throw videoFindError;
    }

    const totalStuck = (stuckGenerations?.length || 0) + (stuckVideos?.length || 0);

    if (totalStuck === 0) {
      console.log('No stuck generations found');
      return new Response(
        JSON.stringify({ message: 'No stuck generations found', cleaned: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${stuckGenerations?.length || 0} stuck main generations and ${stuckVideos?.length || 0} stuck video generations to clean up`);

    // Update stuck main generations to failed status
    if (stuckGenerations && stuckGenerations.length > 0) {
      const { error: updateError } = await supabase
        .from('generations')
        .update({
          status: 'failed',
          provider_response: {
            error: 'Generation timed out after 4 hours. This can happen when the AI service is overloaded. Your tokens have been refunded - please try again.',
            reason: 'timeout_4hr',
            auto_cleaned: true
          }
        })
        .in('id', stuckGenerations.map(g => g.id));

      if (updateError) {
        console.error('Failed to update stuck main generations:', updateError);
      }

      // Refund credits for each stuck generation
      for (const gen of stuckGenerations) {
        console.log(`Refunding ${gen.tokens_used} credits to user ${gen.user_id} (main generation)`);
        
        const { error: refundError } = await supabase.rpc('increment_tokens', {
          user_id_param: gen.user_id,
          amount: gen.tokens_used
        });

        if (refundError) {
          console.error(`Failed to refund tokens for generation ${gen.id}:`, refundError);
        }

        // Log the cleanup action
        await supabase.from('audit_logs').insert({
          user_id: gen.user_id,
          action: 'generation_auto_cleaned',
          resource_type: 'generation',
          resource_id: gen.id,
          metadata: {
            model_id: gen.model_id,
            tokens_refunded: gen.tokens_used,
            reason: 'timeout_4hr',
            content_type: gen.type
          }
        });
      }
    }

    // Update stuck video generations to failed status
    if (stuckVideos && stuckVideos.length > 0) {
      const { error: videoUpdateError } = await supabase
        .from('generations')
        .update({
          status: 'failed',
          provider_response: {
            error: 'Video generation timed out after 5 minutes. This can happen when the video service is overloaded. Your credits have been refunded - please try again.',
            reason: 'timeout_5min',
            auto_cleaned: true
          }
        })
        .in('id', stuckVideos.map(v => v.id));

      if (videoUpdateError) {
        console.error('Failed to update stuck video generations:', videoUpdateError);
      }

      // Refund credits for each stuck video generation
      for (const video of stuckVideos) {
        console.log(`Refunding ${video.tokens_used} credits to user ${video.user_id} (video generation #${video.output_index})`);
        
        const { error: refundError } = await supabase.rpc('increment_tokens', {
          user_id_param: video.user_id,
          amount: video.tokens_used
        });

        if (refundError) {
          console.error(`Failed to refund tokens for video generation ${video.id}:`, refundError);
        }

        // Log the cleanup action
        await supabase.from('audit_logs').insert({
          user_id: video.user_id,
          action: 'video_generation_auto_cleaned',
          resource_type: 'generation',
          resource_id: video.id,
          metadata: {
            model_id: video.model_id,
            tokens_refunded: video.tokens_used,
            reason: 'timeout_5min',
            content_type: 'video',
            parent_generation_id: video.parent_generation_id,
            output_index: video.output_index
          }
        });
      }
    }

    console.log(`Successfully cleaned up ${stuckGenerations?.length || 0} main generations and ${stuckVideos?.length || 0} video generations`);

    return new Response(
      JSON.stringify({
        message: 'Cleanup completed',
        cleaned: totalStuck,
        main_generations: stuckGenerations?.length || 0,
        video_generations: stuckVideos?.length || 0,
        generation_ids: [
          ...(stuckGenerations?.map(g => g.id) || []),
          ...(stuckVideos?.map(v => v.id) || [])
        ]
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in cleanup-stuck-generations:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
