import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors-headers.ts";

// API key mapping logic for KIE AI
function getKieApiKey(use_api_key: string): string {
  // Directly use the explicit API key name from MODEL_CONFIG
  const apiKey = Deno.env.get(use_api_key) || Deno.env.get('KIE_AI_API_KEY');

  if (!apiKey) {
    throw new Error(`${use_api_key} not configured`);
  }

  return apiKey;
}

// API key mapping logic for Runware
function getRunwareApiKey(use_api_key: string): string {
  // Directly use the explicit API key name from MODEL_CONFIG
  const apiKey = Deno.env.get(use_api_key) || Deno.env.get('RUNWARE_API_KEY');

  if (!apiKey) {
    throw new Error(`${use_api_key} not configured`);
  }

  return apiKey;
}

Deno.serve(async (req) => {
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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { provider, use_api_key } = await req.json();

    // Validate required parameters
    if (!provider) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: provider' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!use_api_key) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: use_api_key' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let apiKey: string;

    if (provider === 'kie_ai') {
      apiKey = getKieApiKey(use_api_key);
    } else if (provider === 'runware') {
      apiKey = getRunwareApiKey(use_api_key);
    } else if (provider === 'elevenlabs') {
      apiKey = Deno.env.get('ELEVENLABS_API_KEY') || '';
    } else if (provider === 'json2video') {
      apiKey = Deno.env.get('JSON2VIDEO_API_KEY') || '';
    } else if (provider === 'shotstack') {
      apiKey = Deno.env.get('SHOTSTACK_API_KEY') || '';
    } else {
      return new Response(
        JSON.stringify({ error: `Unknown provider: ${provider}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: `API key not configured for provider: ${provider}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ apiKey }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-api-key function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
