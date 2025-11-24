import { callRunware } from "./runware.ts";
import { callLovableAI } from "./lovable-ai.ts";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface JsonSchema {
  properties?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ProviderRequest {
  model: string;
  prompt: string;
  parameters: Record<string, unknown>;
  uploadEndpoint?: string; // For video direct upload (presigned URL)
  input_schema?: JsonSchema; // Model's JSON schema for dynamic validation
  userId?: string; // For storage path generation (sync only)
  generationId?: string; // For storage path generation (sync only)
  supabase?: SupabaseClient; // Supabase client for presigned URLs (sync only)
  use_api_key?: string; // Explicit API key name from MODEL_CONFIG
}

export interface ProviderResponse {
  output_data: Uint8Array;
  file_extension: string;
  file_size: number;
  metadata: Record<string, unknown>;
  storage_path?: string; // Optional: indicates content already uploaded to storage
}

export async function callProvider(
  provider: string,
  request: ProviderRequest
): Promise<ProviderResponse> {
  // Provider routing
  switch (provider) {
    case 'runware':
      return await callRunware(request);
    
    case 'lovable_ai_sync':
      return await callLovableAI(request);
    
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
