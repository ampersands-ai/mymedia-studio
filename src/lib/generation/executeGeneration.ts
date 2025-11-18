import type { NavigateFunction } from "react-router-dom";
import { 
  buildCustomParameters, 
  validateGenerationInputs, 
  handleGenerationError,
  getImageFieldInfo,
} from "@/lib/custom-creation-utils";
import { logger } from "@/lib/logger";

interface ExecuteGenerationParams {
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
 * Ensures identical validation, parameter building, image handling, and API calls.
 * 
 * VALIDATION APPROACH (Jan 2025 - Schema-Driven):
 * - No hardcoded excludeFields list
 * - Image fields validated AFTER upload (URLs inserted into customParameters)
 * - All required fields validated using schema.required with type-aware empty checks
 * - Prompt fields get user input; other fields use customParameters values
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
  
  // Step 1: Detect image field requirements
  const imageFieldInfo = getImageFieldInfo(model);
  
  // Step 2: Validate inputs (same as Custom Creation)
  const isPromptRequired = (model.input_schema?.required || []).some((field: string) =>
    ['prompt', 'positivePrompt', 'positive_prompt'].includes(field)
  ) || false;
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

  // Step 3: Build custom parameters with conditional filtering
  let customParameters = buildCustomParameters(modelParameters, model.input_schema);

  // Step 3a: Add prompt to customParameters BEFORE schema filtering
  const promptFieldName = 
    model.input_schema?.properties?.prompt ? 'prompt' :
    model.input_schema?.properties?.positivePrompt ? 'positivePrompt' :
    model.input_schema?.properties?.positive_prompt ? 'positive_prompt' :
    null;
  
  if (promptFieldName && prompt.trim()) {
    customParameters[promptFieldName] = prompt.trim();
  }

  // Step 4: STRICT SCHEMA ENFORCEMENT - Filter to only schema-defined properties
  if (model.input_schema?.properties) {
    const allowedKeys = Object.keys(model.input_schema.properties);
    const filtered: Record<string, any> = {};
    for (const key of allowedKeys) {
      if (customParameters[key] !== undefined) {
        filtered[key] = customParameters[key];
      }
    }
    customParameters = filtered;
    logger.info('Frontend schema filtering', { 
      allowedKeys, 
      filteredKeys: Object.keys(filtered) 
    });
  }

  // Step 5: Upload images and assign to correct schema field
  if (uploadedImages.length > 0) {
    const imageUrls = await uploadImagesToStorage(userId);
    
    // Check if we have separate startFrame/endFrame fields (for Veo3 Image-to-Video)
    const hasStartFrame = model.input_schema?.properties?.startFrame;
    const hasEndFrame = model.input_schema?.properties?.endFrame;
    
    if (hasStartFrame && hasEndFrame) {
      // Assign first image to startFrame, second to endFrame
      customParameters.startFrame = imageUrls[0];
      if (imageUrls.length > 1) {
        customParameters.endFrame = imageUrls[1];
      }
    } else if (imageFieldInfo.fieldName) {
      // Use existing single-field logic
      if (imageFieldInfo.isArray) {
        customParameters[imageFieldInfo.fieldName] = imageUrls;
      } else {
        customParameters[imageFieldInfo.fieldName] = imageUrls[0];
      }
    }
  }

  // Step 6: Schema-driven required field validation (after images uploaded)
  if (model.input_schema?.required && model.input_schema?.properties) {
    const requiredFields = model.input_schema.required;
    const schemaProperties = model.input_schema.properties;
    
    // Detect prompt field for special handling
    const promptFieldName = 
      schemaProperties.prompt ? 'prompt' :
      schemaProperties.positivePrompt ? 'positivePrompt' :
      schemaProperties.positive_prompt ? 'positive_prompt' :
      null;

    for (const field of requiredFields) {
      // For prompt fields, use the user's prompt input
      const value = (field === promptFieldName) ? prompt.trim() : customParameters[field];
      const fieldSchema = schemaProperties[field];
      const fieldTitle = fieldSchema?.title || field;
      
      // Type-aware empty checks
      let isEmpty = false;
      if (value === undefined || value === null) {
        isEmpty = true;
      } else if (typeof value === 'string') {
        isEmpty = value.trim() === '';
      } else if (Array.isArray(value)) {
        isEmpty = value.length === 0;
      } else if (typeof value === 'object') {
        isEmpty = Object.keys(value).length === 0;
      }
      // numbers and booleans: allow 0 and false
      
      if (isEmpty) {
        throw new Error(`Please provide a value for: ${fieldTitle}`);
      }
    }
  }

  // Step 7: Call generation API
  try {
    const generateParams: any = {
      model_record_id: model.record_id,
      custom_parameters: customParameters,
      enhance_prompt: false,
    };
    
    const result = await generate(generateParams);

    const genId = result?.id || result?.generation_id;
    if (!genId) {
      throw new Error("No generation ID returned");
    }

    console.log('✅ Generation started, calling startPolling', { genId });
    
    // Step 8: Start polling
    startPolling(genId);
    
    console.log('✅ startPolling called', { genId });

    return genId;
  } catch (error: any) {
    // Re-use shared error handling
    const handled = handleGenerationError(error, navigate);
    if (!handled) {
      logger.error('Generation execution failed', error, {
        utility: 'executeGeneration',
        modelId: model?.id,
        userId,
        hasImages: uploadedImages.length > 0,
        operation: 'executeGeneration'
      });
      throw error;
    }
    throw error;
  }
}
