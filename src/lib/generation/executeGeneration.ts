import { toast } from "sonner";
import type { NavigateFunction } from "react-router-dom";
import { 
  buildCustomParameters, 
  validateGenerationInputs, 
  handleGenerationError,
  getImageFieldInfo,
} from "@/lib/custom-creation-utils";

interface ExecuteGenerationParams {
  model: any;
  prompt: string;
  modelParameters: Record<string, any>;
  uploadedImages: File[];
  enhancePrompt: boolean;
  userId: string;
  uploadImagesToStorage: (userId: string) => Promise<string[]>;
  generate: (params: any) => Promise<any>;
  startPolling: (id: string) => void;
  navigate: NavigateFunction;
  maxPromptLength?: number;
}

/**
 * Shared generation pipeline used by both Custom Creation and Test flows.
 * Ensures identical validation, parameter building, image handling, and API calls.
 * 
 * @returns generation ID if successful, throws error otherwise
 */
export async function executeGeneration({
  model,
  prompt,
  modelParameters,
  uploadedImages,
  enhancePrompt,
  userId,
  uploadImagesToStorage,
  generate,
  startPolling,
  navigate,
  maxPromptLength = 5000,
}: ExecuteGenerationParams): Promise<string> {
  
  // Step 1: Detect image field requirements
  const imageFieldInfo = getImageFieldInfo(model);
  
  // Step 2: Validate inputs (same as Custom Creation)
  const isPromptRequired = model.input_schema?.required?.includes('prompt') || false;
  const validation = validateGenerationInputs(
    model,
    prompt,
    uploadedImages,
    isPromptRequired,
    imageFieldInfo.isRequired,
    maxPromptLength
  );
  
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Step 3: Validate required schema fields (advanced options)
  if (model.input_schema) {
    const requiredFields = model.input_schema.required || [];
    const schemaProperties = model.input_schema.properties || {};
    const excludeFields = ['prompt', 'inputImage', 'image_urls', 'imageUrl', 'image_url', 'image', 'images', 'filesUrl', 'fileUrls', 'reference_image_urls', 'frameImages'];

    for (const field of requiredFields) {
      if (excludeFields.includes(field)) continue;
      
      const value = modelParameters[field];
      if (value === undefined || value === null || value === '') {
        const fieldTitle = schemaProperties[field]?.title || field;
        throw new Error(`Please provide a value for: ${fieldTitle}`);
      }
    }
  }

  // Step 4: Build custom parameters with conditional filtering
  const customParameters = buildCustomParameters(modelParameters, model.input_schema);

  // Step 5: Upload images and assign to correct schema field
  if (imageFieldInfo.fieldName && uploadedImages.length > 0) {
    const imageUrls = await uploadImagesToStorage(userId);
    if (imageFieldInfo.isArray) {
      customParameters[imageFieldInfo.fieldName] = imageUrls;
    } else {
      customParameters[imageFieldInfo.fieldName] = imageUrls[0];
    }
  }

  // Step 6: Determine if schema has prompt field
  const hasPromptField = !!(model.input_schema?.properties?.prompt);

  // Step 7: Call generation API
  try {
    const generateParams: any = {
      model_record_id: model.record_id,
      custom_parameters: customParameters,
      enhance_prompt: enhancePrompt,
    };
    
    // Only include prompt if schema defines it
    if (hasPromptField) {
      generateParams.prompt = prompt.trim();
    }
    
    const result = await generate(generateParams);

    const genId = result?.id || result?.generation_id;
    if (!genId) {
      throw new Error("No generation ID returned");
    }

    // Step 8: Start polling
    startPolling(genId);

    return genId;
  } catch (error: any) {
    // Re-use shared error handling
    const handled = handleGenerationError(error, navigate);
    if (!handled) {
      console.error('Generation error:', error);
      throw error;
    }
    throw error;
  }
}
