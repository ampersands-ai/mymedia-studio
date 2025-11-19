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
}: ExecuteGenerationParams): Promise<string> {
  
  const { supabase } = await import("@/integrations/supabase/client");
  
  // Upload images to storage first (if any)
  let uploadedImageUrls: string[] = [];
  if (uploadedImages.length > 0) {
    uploadedImageUrls = await uploadImagesToStorage(userId);
  }

  // Call the edge function for secure server-side execution
  const { data, error } = await supabase.functions.invoke('execute-custom-model', {
    body: {
      model_record_id: model.record_id,
      prompt,
      model_parameters: modelParameters,
      uploaded_image_urls: uploadedImageUrls
    }
  });

  if (error) {
    throw new Error(error.message || 'Model execution failed');
  }

  if (!data?.generation_id) {
    throw new Error('Invalid response from server');
  }

  // Start polling for generation status
  startPolling(data.generation_id);

  return data.generation_id;
}
