import type { NavigateFunction } from "react-router-dom";
import { getModel } from "@/lib/models/registry";

/**
 * Recursively sanitize model parameters to remove base64 image data.
 * Images are uploaded separately via uploadImagesToStorage(), so storing
 * them in the settings JSONB column is redundant and violates the 50KB size constraint.
 */
function sanitizeModelParameters(params: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string' && value.startsWith('data:image/')) {
      // Replace base64 image with placeholder - actual image is in storage
      sanitized[key] = '[IMAGE_DATA_REMOVED]';
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => {
        if (typeof item === 'string' && item.startsWith('data:image/')) {
          return '[IMAGE_DATA_REMOVED]';
        }
        if (typeof item === 'object' && item !== null) {
          return sanitizeModelParameters(item as Record<string, unknown>);
        }
        return item;
      });
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeModelParameters(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

export interface ExecuteGenerationParams {
  model: {
    record_id: string;
    [key: string]: unknown; // Allow additional properties for backwards compatibility
  };
  prompt: string;
  modelParameters: Record<string, unknown>;
  uploadedImages: File[];
  uploadedImageUrls?: string[];
  userId: string;
  uploadImagesToStorage: (userId: string) => Promise<string[]>;
  generate: (params: Record<string, unknown>) => Promise<unknown>;
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

  // Sanitize parameters to remove base64 image data before storage
  // Images are uploaded separately and passed via uploadedImageUrls
  const sanitizedParameters = sanitizeModelParameters(modelParameters);

  // Execute model directly using its execute() function
  const generationId = await modelModule.execute({
    model,
    prompt,
    modelParameters: sanitizedParameters,
    uploadedImages,
    uploadedImageUrls,
    userId,
    uploadImagesToStorage,
    generate: async () => ({}),
    startPolling,
    navigate,
  });

  // Model's execute() already calls startPolling internally
  return generationId;
}
