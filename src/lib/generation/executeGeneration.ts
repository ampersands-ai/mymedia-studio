import type { NavigateFunction } from "react-router-dom";
import { getModel } from "@/lib/models/registry";

export interface ExecuteGenerationParams {
  model: {
    record_id: string;
    [key: string]: any; // Allow additional properties for backwards compatibility
  };
  prompt: string;
  modelParameters: Record<string, any>;
  uploadedImages: File[];
  uploadedImageUrls?: string[];
  userId: string;
  uploadImagesToStorage: (userId: string) => Promise<string[]>;
  generate: (params: any) => Promise<any>;
  startPolling: (id: string) => void;
  navigate: NavigateFunction;
  maxPromptLength?: number;
}

/**
 * Server-side model execution via edge function
 * Secure API key handling, no client-side secrets
 * 
 * @returns generation ID if successful, throws error otherwise
 */
export async function executeGeneration({
  model,
  prompt,
  modelParameters,
  uploadedImages,
  userId,
  uploadImagesToStorage,
  startPolling,
  navigate,
}: ExecuteGenerationParams): Promise<string> {
  
  // Get model from registry
  const modelModule = getModel(model.record_id);
  if (!modelModule) {
    throw new Error(`Model not found in registry: ${model.record_id}`);
  }

  // Upload images to storage first (if any)
  let uploadedImageUrls: string[] = [];
  if (uploadedImages.length > 0) {
    uploadedImageUrls = await uploadImagesToStorage(userId);
  }

  // Execute model directly using its execute() function
  const generationId = await modelModule.execute({
    prompt,
    modelParameters,
    uploadedImages,
    uploadedImageUrls,
    userId,
    uploadImagesToStorage,
    generate: async () => ({}),
    startPolling,
    navigate,
  });

  // Start polling for generation status
  startPolling(generationId);

  return generationId;
}
