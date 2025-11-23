import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getModelConfig } from "../_shared/registry/index.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const logger = new EdgeLogger('monitor-model-health', requestId, supabase, true);

    logger.info('Model health monitoring deprecated - feature removed');

    // Model health monitoring disabled - dependent tables were removed
    // Return 410 Gone to indicate this endpoint is permanently unavailable
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Model health monitoring unavailable (feature removed)',
        error: 'Model health monitoring has been deprecated',
        stats: { totalModels: 0, failingModels: 0, alertsSent: 0 }
      }),
      { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error monitoring model health', error instanceof Error ? error.message : String(error));
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
