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

    const url = new URL(req.url);
    const storyboardId = url.searchParams.get('storyboardId');

    if (!storyboardId) {
      throw new Error('Missing storyboardId parameter');
    }

    // Fetch storyboard
    const { data: storyboard, error: storyboardError } = await supabaseClient
      .from('storyboards')
      .select('*')
      .eq('id', storyboardId)
      .eq('user_id', user.id)
      .single();

    if (storyboardError || !storyboard) {
      throw new Error('Storyboard not found or unauthorized');
    }

    // TODO: Check actual render service status using render_job_id
    // For now, simulate completion after 30 seconds
    const createdAt = new Date(storyboard.updated_at).getTime();
    const elapsed = Date.now() - createdAt;
    const simulatedDuration = 30000; // 30 seconds

    let status = storyboard.status;
    let progress = 0;
    let videoUrl = storyboard.video_url;

    if (status === 'rendering') {
      progress = Math.min(95, Math.floor((elapsed / simulatedDuration) * 100));
      
      // Simulate completion
      if (elapsed >= simulatedDuration) {
        status = 'complete';
        progress = 100;
        videoUrl = `https://placeholder-video-url.com/${storyboardId}.mp4`;
        
        // Update storyboard
        await supabaseClient
          .from('storyboards')
          .update({
            status: 'complete',
            video_url: videoUrl,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', storyboardId);
      }
    } else if (status === 'complete') {
      progress = 100;
    }

    return new Response(
      JSON.stringify({
        status,
        progress,
        videoUrl,
        renderJobId: storyboard.render_job_id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});