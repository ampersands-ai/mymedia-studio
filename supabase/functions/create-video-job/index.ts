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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Authenticate user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Parse and validate input
    const { topic, duration = 60, style = 'modern', voice_id = '21m00Tcm4TlvDq8ikWAM' } = await req.json();

    if (!topic || topic.trim().length < 5) {
      throw new Error('Topic must be at least 5 characters');
    }

    if (duration < 30 || duration > 90) {
      throw new Error('Duration must be between 30 and 90 seconds');
    }

    // Check token balance
    const { data: subscription, error: subError } = await supabaseClient
      .from('user_subscriptions')
      .select('tokens_remaining')
      .eq('user_id', user.id)
      .single();

    if (subError || !subscription) {
      throw new Error('Could not fetch subscription data');
    }

    if (subscription.tokens_remaining < 15) {
      throw new Error('Insufficient tokens. 15 tokens required for video generation.');
    }

    // Deduct tokens atomically
    const { error: deductError } = await supabaseClient
      .from('user_subscriptions')
      .update({ tokens_remaining: subscription.tokens_remaining - 15 })
      .eq('user_id', user.id)
      .eq('tokens_remaining', subscription.tokens_remaining);

    if (deductError) {
      console.error('Token deduction error:', deductError);
      throw new Error('Failed to deduct tokens. Please try again.');
    }

    // Create video job
    const { data: job, error: jobError } = await supabaseClient
      .from('video_jobs')
      .insert({
        user_id: user.id,
        topic: topic.trim(),
        duration,
        style,
        voice_id,
        status: 'pending',
      })
      .select()
      .single();

    if (jobError) {
      console.error('Job creation error:', jobError);
      // Refund tokens on failure
      await supabaseClient
        .from('user_subscriptions')
        .update({ tokens_remaining: subscription.tokens_remaining })
        .eq('user_id', user.id);
      throw new Error('Failed to create video job');
    }

    console.log(`Created video job ${job.id} for user ${user.id}`);

    // Trigger async processing (fire-and-forget)
    const processUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/process-video-job`;
    fetch(processUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ job_id: job.id }),
    }).catch(err => console.error('Failed to trigger processing:', err));

    return new Response(
      JSON.stringify({ success: true, job }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error: any) {
    console.error('Error in create-video-job:', error);
    
    const status = error.message === 'Unauthorized' ? 401 : 400;
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
