import type { AppRouterInstance } from "next/navigation";
import { getModel } from "@/lib/models/registry";

export interface ExecuteGenerationParams {
  model: {
    record_id: string;
    [key: string]: unknown; // Allow additional properties for backwards compatibility
  };
  prompt: string;
  modelParameters: Record<string, unknown>;
  uploadedImages: File[];
  uploadedImageUrls?: string[];
  uploadedAudios?: File[];
  uploadedAudioUrls?: string[];
  uploadedVideos?: File[];
  uploadedVideoUrls?: string[];
  userId: string;
  uploadImagesToStorage: (userId: string) => Promise<string[]>;
  uploadAudiosToStorage?: (userId: string) => Promise<string[]>;
  uploadVideosToStorage?: (userId: string) => Promise<string[]>;
  getAudioDuration?: (file: File) => Promise<number>;
  generate: (params: Record<string, unknown>) => Promise<unknown>;
  startPolling: (id: string) => void;
  router: AppRouterInstance;
  maxPromptLength?: number;
}

/**
 * Server-side model execution via edge function
 * Secure API key handling, no client-side secrets
 * 
 * Note: Sanitization of modelParameters for database storage is handled
 * at the point of database insert in each model's execute() function,
 * NOT here. This ensures API calls receive original data (including base64)
 * while the database only stores sanitized parameters.
 * 
 * @returns generation ID if successful, throws error otherwise
 */
export async function executeGeneration({
  model,
  prompt,
  modelParameters,
  uploadedImages,
  uploadedAudios,
  uploadedVideos,
  userId,
  uploadImagesToStorage,
  uploadAudiosToStorage,
  uploadVideosToStorage,
  getAudioDuration,
  startPolling,
  router,
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

  // Upload audios to storage first (if any)
  let uploadedAudioUrls: string[] = [];
  if (uploadedAudios?.length && uploadAudiosToStorage) {
    uploadedAudioUrls = await uploadAudiosToStorage(userId);
  }

  // Upload videos to storage first (if any) and inject into modelParameters
  // Note: Some video-to-video models expect `video_urls` (array) while others expect `video_url` (string).
  // We set both to keep the pipeline compatible.
  let uploadedVideoUrls: string[] = [];
  if (uploadedVideos?.length && uploadVideosToStorage) {
    uploadedVideoUrls = await uploadVideosToStorage(userId);

    if (uploadedVideoUrls.length > 0) {
      modelParameters = {
        ...modelParameters,
        video_urls: uploadedVideoUrls,
        video_url: uploadedVideoUrls[0],
      };
    }
  }

  // Defensive check: prompt should never be in modelParameters
  // This catches any regressions where prompt accidentally gets included
  if ('prompt' in modelParameters) {
    console.warn('[executeGeneration] Warning: prompt found in modelParameters, removing to prevent conflicts');
    delete modelParameters.prompt;
  }

  // Pass ORIGINAL modelParameters to model's execute()
  // Each model handles sanitization at its own database insert point
  const generationId = await modelModule.execute({
    model,
    prompt,
    modelParameters,
    uploadedImages,
    uploadedImageUrls,
    uploadedAudios,
    uploadedAudioUrls,
    uploadedVideos,
    uploadedVideoUrls,
    userId,
    uploadImagesToStorage,
    uploadAudiosToStorage,
    uploadVideosToStorage,
    getAudioDuration,
    generate: async () => ({}),
    startPolling,
    router,
  });

  // Model's execute() already calls startPolling internally
  return generationId;
}
