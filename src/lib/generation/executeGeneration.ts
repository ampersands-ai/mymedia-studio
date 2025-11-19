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
 * Shared generation pipeline - DIRECT execution from physical model files
 * NO routing, NO shared logic - each model file handles everything
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
  
  // Direct execution from physical model file
  const { getModelModule } = await import("@/lib/models/locked");
  
  const modelModule = getModelModule(model.record_id, model.id);
  
  if (!modelModule) {
    throw new Error(`Model file not found for ${model.model_name}. Generate the file first.`);
  }
  
  if (!modelModule.execute) {
    throw new Error(`Model file for ${model.model_name} is missing execute() function`);
  }
  
  // Execute directly - model file handles EVERYTHING
  return modelModule.execute({
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
