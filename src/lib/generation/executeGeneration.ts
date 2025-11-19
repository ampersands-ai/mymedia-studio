import type { NavigateFunction } from "react-router-dom";

export interface ExecuteGenerationParams {
  model: any;
  prompt: string;
  modelParameters: Record<string, any>;
  uploadedImages: File[];
  userId: string;
  uploadImagesToStorage: (userId: string) => Promise<string[]>;
  generate: (params: any) => Promise<any>;
  startPolling: (id: string) => void;
  navigate: NavigateFunction;
  maxPromptLength?: number;
}

/**
 * Shared generation pipeline used by both Custom Creation and Test flows.
 * ALL models now route through ModelRouter to execute from .ts files.
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
  generate,
  startPolling,
  navigate,
  maxPromptLength = 5000,
}: ExecuteGenerationParams): Promise<string> {
  
  // ALL models now route through ModelRouter (file-based execution)
  const { executeModelGeneration } = await import("@/lib/models/ModelRouter");
  return executeModelGeneration({
    model,
    prompt,
    modelParameters,
    uploadedImages,
    userId,
    uploadImagesToStorage,
    generate,
    startPolling,
    navigate,
    maxPromptLength,
  });
}
