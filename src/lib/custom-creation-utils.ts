import { toast } from "sonner";
import type { NavigateFunction } from "react-router-dom";
import { logger } from "@/lib/logger";

interface ModelSchema {
  input_schema?: {
    required?: string[];
    imageInputField?: string;
    properties?: Record<string, {
      type?: string;
      maxItems?: number;
    }>;
    conditionalFields?: Record<string, {
      dependsOn?: string;
      value?: unknown;
    }>;
  };
  max_images?: number;
  provider: string;
  content_type: string;
}

/**
 * Get required fields from model schema
 */
export const getSchemaRequiredFields = (model: ModelSchema): string[] => {
  return model?.input_schema?.required || [];
};

/**
 * Detect image field info from schema
 */
// Detect image upload field from model schema using explicit imageInputField flag
export const getImageFieldInfo = (model: ModelSchema): {
  fieldName: string | null;
  isRequired: boolean;
  isArray: boolean;
  maxImages: number;
} => {
  if (!model?.input_schema) {
    return { fieldName: null, isRequired: false, isArray: false, maxImages: 0 };
  }
  
  const imageFieldName = model.input_schema.imageInputField;
  
  // No image input field defined in schema
  if (!imageFieldName) {
    return { fieldName: null, isRequired: false, isArray: false, maxImages: 0 };
  }
  
  // Validate the field exists in properties
  const fieldSchema = model.input_schema.properties?.[imageFieldName];
  if (!fieldSchema) {
    logger.warn(`Image field '${imageFieldName}' declared in schema but not found in properties`);
    return { fieldName: null, isRequired: false, isArray: false, maxImages: 0 };
  }
  
  const required = model.input_schema.required || [];
  const isRequired = required.includes(imageFieldName);
  const isArray = fieldSchema.type === 'array';
  const maxImages = isArray 
    ? (fieldSchema.maxItems || model.max_images || 10) 
    : 1;
  
  return { fieldName: imageFieldName, isRequired, isArray, maxImages };
};


/**
 * Check if model is a primary provider audio model
 * Centralized utility to avoid duplication
 */
export const isPrimaryProviderAudioModel = (model: { provider: string; content_type: string }): boolean => {
  return model.provider === 'kie_ai' && model.content_type === 'audio';
};

// Legacy alias for backward compatibility
export const isKieAiAudioModel = isPrimaryProviderAudioModel;

/**
 * Get max prompt length based on model and customMode
 */
export const getMaxPromptLength = (model: ModelSchema, customMode: boolean | undefined): number => {
  if (!model) return 5000;

  // Primary provider audio in non-custom mode has 500 char limit
  if (isPrimaryProviderAudioModel(model) && customMode === false) {
    return 500;
  }

  // Default limit for all other cases
  return 5000;
};

/**
 * Build custom parameters, filtering out conditional fields
 */
export const buildCustomParameters = (
  modelParameters: Record<string, unknown>,
  inputSchema: ModelSchema['input_schema']
): Record<string, unknown> => {
  const customParameters: Record<string, unknown> = {};
  const conditionalFields = inputSchema?.conditionalFields || {};

  for (const [key, value] of Object.entries(modelParameters)) {
    const fieldConfig = conditionalFields[key];
    if (fieldConfig?.dependsOn) {
      const depValue = modelParameters[fieldConfig.dependsOn];
      if (depValue !== fieldConfig.value) {
        continue; // Skip this field
      }
    }
    customParameters[key] = value;
  }

  // Ensure customMode has explicit default
  if (inputSchema?.properties?.customMode && customParameters.customMode === undefined) {
    customParameters.customMode = false;
  }

  return customParameters;
};

/**
 * Validate generation inputs (prompt only)
 * Image validation is now handled by schema-driven validation in executeGeneration
 */
export const validateGenerationInputs = (
  _model: ModelSchema,
  prompt: string,
  _uploadedImages: File[],
  isPromptRequired: boolean,
  _isImageRequired: boolean,
  maxPromptLength: number
): { valid: boolean; error?: string } => {
  if (isPromptRequired && !prompt.trim()) {
    return { valid: false, error: "Please enter a prompt" };
  }
  
  if (prompt.trim().length > maxPromptLength) {
    return { valid: false, error: `Prompt must be less than ${maxPromptLength} characters` };
  }
  
  // Image validation removed - now handled by schema-driven validation after upload
  
  return { valid: true };
};

/**
 * Handle generation error with navigation
 */
export const handleGenerationError = (error: Error, navigate: NavigateFunction): boolean => {
  if (error.message === "SESSION_EXPIRED") {
    toast.error("Session expired", {
      description: "Please log in again. Your work has been saved.",
      duration: 5000
    });
    setTimeout(() => navigate("/auth"), 2000);
    return true;
  }

  if (error.message?.includes("INSUFFICIENT_TOKENS")) {
    interface InsufficientTokensError {
      type: string;
      required?: number;
      available?: number;
    }

    let parsedError: InsufficientTokensError = { type: "INSUFFICIENT_TOKENS" };
    try {
      parsedError = JSON.parse(error.message.replace("INSUFFICIENT_TOKENS: ", "")) as InsufficientTokensError;
    } catch {
      parsedError = { type: "INSUFFICIENT_TOKENS" };
    }

    toast.error("Insufficient tokens", {
      description: parsedError.required
        ? `You need ${parsedError.required} tokens but only have ${parsedError.available || 0}. Upgrade to continue creating.`
        : "You don't have enough tokens. Upgrade your plan to continue creating amazing content.",
      duration: 10000,
      action: {
        label: "View Plans",
        onClick: () => navigate("/pricing")
      }
    });
    return true;
  }

  return false;
};
