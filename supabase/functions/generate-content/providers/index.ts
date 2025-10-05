import { callKieAI } from "./kie-ai.ts";

export interface ProviderRequest {
  model: string;
  prompt: string;
  parameters: Record<string, any>;
  api_endpoint?: string;
}

export interface ProviderResponse {
  output_data: Uint8Array;
  file_extension: string;
  file_size: number;
  metadata: Record<string, any>;
}

export async function callProvider(
  provider: string,
  request: ProviderRequest
): Promise<ProviderResponse> {
  console.log(`Calling provider: ${provider}`);

  switch (provider) {
    // Kie.ai provider temporarily disabled to allow project remixing
    // The KIE_AI_API_KEY secret prevents remixing when active
    // To re-enable: uncomment this code, add KIE_AI_API_KEY secret, and reactivate models
    case 'kie_ai':
      throw new Error('Kie.ai provider is currently disabled. To re-enable, add KIE_AI_API_KEY secret and reactivate models.');
    
    case 'json2video':
      throw new Error('JSON2Video provider not yet implemented. Please configure in providers/json2video.ts');
    
    case 'shotstack':
      throw new Error('Shotstack provider not yet implemented. Please configure in providers/shotstack.ts');
    
    case 'comfyui':
      throw new Error('ComfyUI provider not yet implemented. Please configure in providers/comfyui.ts');
    
    case 'lovable_ai':
      throw new Error('Lovable AI provider not yet implemented for direct generation. Use for prompt enhancement only.');
    
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
