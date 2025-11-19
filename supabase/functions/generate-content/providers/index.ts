import { callKieAI } from "./kie-ai.ts";
import { callRunware } from "./runware.ts";
import { callLovableAI } from "./lovable-ai.ts";
import { webhookLogger } from "../../_shared/logger.ts";
export interface ProviderRequest {
  model: string;
  model_record_id?: string;
  parameters: Record<string, any>;
  api_endpoint?: string;
  payload_structure?: string;
  uploadEndpoint?: string; // For video direct upload (presigned URL)
  input_schema?: any; // Model's JSON schema for dynamic validation
}

export interface ProviderResponse {
  output_data: Uint8Array;
  file_extension: string;
  file_size: number;
  metadata: Record<string, any>;
  storage_path?: string; // Optional: indicates content already uploaded to storage
}

export async function callProvider(
  provider: string,
  request: ProviderRequest,
  webhookToken?: string
): Promise<ProviderResponse> {
  webhookLogger.info(`Calling provider: ${provider}`);

  switch (provider) {
    case 'kie_ai':
      if (!webhookToken) {
        throw new Error('webhookToken is required for kie_ai provider');
      }
      return await callKieAI(request, webhookToken);
    
    case 'runware':
      return await callRunware(request);
    
    case 'lovable_ai_sync':
      return await callLovableAI(request);
    
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
