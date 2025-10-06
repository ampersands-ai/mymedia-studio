import { callKieAI } from "./kie-ai.ts";

export interface ProviderRequest {
  model: string;
  prompt: string;
  parameters: Record<string, any>;
  api_endpoint?: string;
  payload_structure?: string;
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
    case 'kie_ai':
      return await callKieAI(request);
    
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
