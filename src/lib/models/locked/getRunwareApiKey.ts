import { supabase } from "@/integrations/supabase/client";

export async function getRunwareApiKey(modelId: string, recordId: string): Promise<string> {
  // Determine secret name based on model's content type
  let secretName: string;
  
  if (modelId.includes('prompt_to_image') || 
      modelId.startsWith('runware:100@1') ||
      modelId.startsWith('runware:flux') ||
      modelId.startsWith('runware:stable-diffusion')) {
    secretName = 'RUNWARE_API_KEY_PROMPT_TO_IMAGE';
  } else if (modelId.includes('image_editing') || 
             modelId.startsWith('runware:102@1') || 
             modelId.startsWith('runware:103@1')) {
    secretName = 'RUNWARE_API_KEY_IMAGE_EDITING';
  } else if (modelId.includes('image_to_video') || 
             modelId.startsWith('bytedance:')) {
    secretName = 'RUNWARE_API_KEY_IMAGE_TO_VIDEO';
  } else {
    secretName = 'RUNWARE_API_KEY';
  }
  
  // Try group-specific key first
  let { data, error } = await supabase.functions.invoke('get-secret', {
    body: { secret_name: secretName }
  });
  
  // Fallback to generic key
  if (error || !data?.value) {
    console.warn(`${secretName} not found, using RUNWARE_API_KEY`);
    ({ data, error } = await supabase.functions.invoke('get-secret', {
      body: { secret_name: 'RUNWARE_API_KEY' }
    }));
  }
  
  if (error || !data?.value) {
    throw new Error(`Runware API key not configured: ${secretName}`);
  }
  
  return data.value;
}
