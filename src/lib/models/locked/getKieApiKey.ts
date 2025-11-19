import { supabase } from "@/integrations/supabase/client";

export async function getKieApiKey(modelId: string, recordId: string): Promise<string> {
  // Model-specific keys (highest priority)
  const veo3Models = [
    '8aac94cb-5625-47f4-880c-4f0fd8bd83a1', // Veo 3.1 Fast (image_to_video)
    'a5c2ec16-6294-4588-86b6-7b4182601cda', // Veo 3.1 HQ (image_to_video)
    '6e8a863e-8630-4eef-bdbb-5b41f4c883f9', // Veo 3.1 Reference (image_to_video)
    'f8e9c7a5-9d4b-6f2c-8a1e-5d7b3c9f4a6e', // Veo 3.1 Fast (prompt_to_video)
    'e9c8b7a6-8d5c-4f3e-9a2f-6d8b5c9e4a7f', // Veo 3.1 HQ (prompt_to_video)
  ];
  
  const sora2Models = [
    'd7f8c5a3-9b2e-6f4d-8c9a-5e7b3a6d4f8c', // Sora 2 (image_to_video)
    'c6e5b4a3-5d2f-1c0e-6a9f-3d5b6c7e4a8f', // Sora 2 (prompt_to_video)
  ];
  
  const nanoBananaModels = ['c7e9a5f3-8d4b-6f2c-9a1e-5d8b3c7f4a6e'];
  
  const seedreamV4Models = [
    'd2ffb834-fc59-4c80-bf48-c2cc25281fdd', // image_editing
    'a6c8e4f7-9d2b-5f3c-8a6e-7d4b9c5f3a8e', // prompt_to_image
  ];
  
  // Determine secret name
  let secretName: string;
  
  if (veo3Models.includes(recordId)) {
    secretName = 'KIE_AI_API_KEY_VEO3';
  } else if (sora2Models.includes(recordId)) {
    secretName = 'KIE_AI_API_KEY_SORA2';
  } else if (nanoBananaModels.includes(recordId)) {
    secretName = 'KIE_AI_API_KEY_NANO_BANANA';
  } else if (seedreamV4Models.includes(recordId)) {
    secretName = 'KIE_AI_API_KEY_SEEDREAM_V4';
  } else if (modelId.includes('image_editing')) {
    secretName = 'KIE_AI_API_KEY_IMAGE_EDITING';
  } else if (modelId.includes('image_to_video')) {
    secretName = 'KIE_AI_API_KEY_IMAGE_TO_VIDEO';
  } else if (modelId.includes('prompt_to_image')) {
    secretName = 'KIE_AI_API_KEY_PROMPT_TO_IMAGE';
  } else if (modelId.includes('prompt_to_video')) {
    secretName = 'KIE_AI_API_KEY_PROMPT_TO_VIDEO';
  } else if (modelId.includes('prompt_to_audio')) {
    secretName = 'KIE_AI_API_KEY_PROMPT_TO_AUDIO';
  } else {
    secretName = 'KIE_AI_API_KEY';
  }
  
  // Try specific key first
  let { data, error } = await supabase.functions.invoke('get-secret', {
    body: { secret_name: secretName }
  });
  
  // Fallback to generic key
  if (error || !data?.value) {
    console.warn(`${secretName} not found, using KIE_AI_API_KEY`);
    ({ data, error } = await supabase.functions.invoke('get-secret', {
      body: { secret_name: 'KIE_AI_API_KEY' }
    }));
  }
  
  if (error || !data?.value) {
    throw new Error(`API key not configured: ${secretName}`);
  }
  
  return data.value;
}
