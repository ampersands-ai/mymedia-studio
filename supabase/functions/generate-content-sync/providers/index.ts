import { callRunware } from "./runware.ts";
import { callLovableAI } from "./lovable-ai.ts";
export interface ProviderRequest {
  model: string;
  prompt: string;
  parameters: Record<string, any>;
  uploadEndpoint?: string; // For video direct upload (presigned URL)
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
  request: ProviderRequest
): Promise<ProviderResponse> {
  console.log(JSON.stringify({ event: 'calling_provider', provider }));

  switch (provider) {
    case 'runware':
      return await callRunware(request);
    
    case 'lovable_ai_sync':
      return await callLovableAI(request);
    
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
