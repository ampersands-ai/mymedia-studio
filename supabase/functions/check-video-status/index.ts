
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { API_ENDPOINTS } from "../_shared/api-endpoints.ts";



Deno.serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);

  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('check-video-status', requestId);
  
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  try {
    const { render_id } = await req.json();

    if (!render_id) {
      throw new Error('render_id is required');
    }

    const response = await fetch(`${API_ENDPOINTS.SHOTSTACK.BASE}${API_ENDPOINTS.SHOTSTACK.VERSION}/render/${render_id}`, {
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
      { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logger.error('Error checking video status', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...responseHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
