import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors-headers.ts";

// API key mapping logic for KIE AI
function getKieApiKey(modelId: string, recordId: string): string {
  const veo3Models = [
    '8aac94cb-5625-47f4-880c-4f0fd8bd83a1',
    'a5c2ec16-6294-4588-86b6-7b4182601cda',
    '6e8a863e-8630-4eef-bdbb-5b41f4c883f9',
    'f8e9c7a5-9d4b-6f2c-8a1e-5d7b3c9f4a6e',
    'e9c8b7a6-8d5c-4f3e-9a2f-6d8b5c9e4a7f',
  ];
  
  const sora2Models = [
    'd7f8c5a3-9b2e-6f4d-8c9a-5e7b3a6d4f8c',
    'c6e5b4a3-5d2f-1c0e-6a9f-3d5b6c7e4a8f',
  ];
  
  const nanoBananaModels = ['c7e9a5f3-8d4b-6f2c-9a1e-5d8b3c7f4a6e'];
  const seedreamV4Models = ['d2ffb834-fc59-4c80-bf48-c2cc25281fdd', 'a6c8e4f7-9d2b-5f3c-8a6e-7d4b9c5f3a8e'];
  
  let secretName: string;
  
  if (veo3Models.includes(recordId)) secretName = 'KIE_AI_API_KEY_VEO3';
  else if (sora2Models.includes(recordId)) secretName = 'KIE_AI_API_KEY_SORA2';
  else if (nanoBananaModels.includes(recordId)) secretName = 'KIE_AI_API_KEY_NANO_BANANA';
  else if (seedreamV4Models.includes(recordId)) secretName = 'KIE_AI_API_KEY_SEEDREAM_V4';
  else if (modelId.includes('image_editing')) secretName = 'KIE_AI_API_KEY_IMAGE_EDITING';
  else if (modelId.includes('image_to_video')) secretName = 'KIE_AI_API_KEY_IMAGE_TO_VIDEO';
  else if (modelId.includes('prompt_to_image')) secretName = 'KIE_AI_API_KEY_PROMPT_TO_IMAGE';
  else if (modelId.includes('prompt_to_video')) secretName = 'KIE_AI_API_KEY_PROMPT_TO_VIDEO';
  else if (modelId.includes('prompt_to_audio')) secretName = 'KIE_AI_API_KEY_PROMPT_TO_AUDIO';
  else secretName = 'KIE_AI_API_KEY';
  
  const apiKey = Deno.env.get(secretName) || Deno.env.get('KIE_AI_API_KEY');
  
  if (!apiKey) {
    throw new Error(`${secretName} not configured`);
  }
  
  return apiKey;
}

// API key mapping logic for Runware
function getRunwareApiKey(modelId: string): string {
  let secretName: string;
  
  if (modelId.startsWith('runware:100@1') ||
      modelId.startsWith('runware:flux') ||
      modelId.startsWith('runware:stable-diffusion')) {
    secretName = 'RUNWARE_API_KEY_PROMPT_TO_IMAGE';
  } else if (modelId.startsWith('runware:102@1') || 
             modelId.startsWith('runware:103@1')) {
    secretName = 'RUNWARE_API_KEY_IMAGE_EDITING';
  } else if (modelId.startsWith('bytedance:')) {
    secretName = 'RUNWARE_API_KEY_IMAGE_TO_VIDEO';
  } else {
    secretName = 'RUNWARE_API_KEY';
  }
  
  const apiKey = Deno.env.get(secretName) || Deno.env.get('RUNWARE_API_KEY');
  
  if (!apiKey) {
    throw new Error(`${secretName} not configured`);
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

    const { provider, modelId, recordId } = await req.json();

    if (!provider) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: provider' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let apiKey: string;

    if (provider === 'kie_ai') {
      if (!modelId || !recordId) {
        return new Response(
          JSON.stringify({ error: 'Missing required parameters: modelId and recordId for kie_ai' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      apiKey = getKieApiKey(modelId, recordId);
    } else if (provider === 'runware') {
      if (!modelId) {
        return new Response(
          JSON.stringify({ error: 'Missing required parameter: modelId for runware' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      apiKey = getRunwareApiKey(modelId);
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
