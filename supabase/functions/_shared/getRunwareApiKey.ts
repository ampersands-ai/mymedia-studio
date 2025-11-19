export function getRunwareApiKey(modelId: string): string {
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
