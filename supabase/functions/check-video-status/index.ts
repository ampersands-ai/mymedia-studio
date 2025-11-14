
import { EdgeLogger } from "../_shared/edge-logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('check-video-status', requestId);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { render_id } = await req.json();

    if (!render_id) {
      throw new Error('render_id is required');
    }

    const response = await fetch(`https://api.shotstack.io/v1/render/${render_id}`, {
      headers: { 'x-api-key': Deno.env.get('SHOTSTACK_API_KEY') ?? '' }
    });

    if (!response.ok) {
      throw new Error('Failed to check Shotstack status');
    }

    const result = await response.json();
    
    return new Response(
      JSON.stringify({
        status: result.response.status,
        url: result.response.url,
        progress: result.response.progress
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    logger.error('Error checking video status', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
