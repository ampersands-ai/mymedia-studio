import { toast } from "sonner";
import type { NavigateFunction } from "react-router-dom";

/**
 * Get required fields from model schema
 */
export const getSchemaRequiredFields = (model: any): string[] => {
  return model?.input_schema?.required || [];
};

/**
 * Detect image field info from schema
 */
export const getImageFieldInfo = (model: any): {
  fieldName: string | null;
  isRequired: boolean;
  isArray: boolean;
  maxImages: number;
} => {
  if (!model?.input_schema?.properties) {
    return { fieldName: null, isRequired: false, isArray: false, maxImages: 0 };
  }
  
  const properties = model.input_schema.properties;
  const required = model.input_schema.required || [];
  
  // Look for image-like fields
  const imageFieldNames = [
    'inputImage', 'image_urls', 'imageUrl', 'image_url', 'image', 'images', 
    'filesUrl', 'filesURL', 'file_urls', 'fileUrls', 'reference_image_urls', 'frameImages'
  ];
  
  for (const fieldName of imageFieldNames) {
    if (properties[fieldName]) {
      const schema = properties[fieldName];
      const isArray = schema.type === 'array';
      const isRequired = required.includes(fieldName);
      const maxImages = model.max_images ?? 0;
      return { fieldName, isRequired, isArray, maxImages };
    }
  }
  
  return { fieldName: null, isRequired: false, isArray: false, maxImages: 0 };
};

/**
 * Find primary long-text field key (prompt/script/etc.)
 */
export const findPrimaryTextKey = (properties: Record<string, any> | undefined): string | undefined => {
  if (!properties) return undefined;
  
  const keywords = ["input text", "text", "prompt", "script", "caption", "description"];
  let bestKey: string | undefined;
  let bestScore = -Infinity;

  for (const [key, schema] of Object.entries(properties)) {
    const title = (schema?.title || "").toLowerCase();
    const desc = (schema?.description || "").toLowerCase();
    const name = key.toLowerCase();

    // Ignore non-textual fields
    const isFileLike = ["image", "file", "url", "upload"].some(k => 
      name.includes(k) || title.includes(k) || desc.includes(k)
    );
    if (isFileLike) continue;

    let score = 0;
    if (schema?.type === "string") score += 2;
    if (!schema?.enum) score += 1;
    if (["textarea", "markdown"].includes(schema?.format)) score += 4;
    
    const maxLen = typeof schema?.maxLength === "number" ? schema.maxLength : 0;
    if (maxLen >= 200) score += 3;
    if (maxLen >= 500) score += 1;

    for (const kw of keywords) {
      if (name.includes(kw) || title.includes(kw) || desc.includes(kw)) score += 2;
    }

    if (score > bestScore) {
      bestScore = score;
      bestKey = key;
    }
  }

  return bestScore >= 3 ? bestKey : undefined;
};

/**
 * Find primary voice field key for ElevenLabs models
 */
export const findPrimaryVoiceKey = (
  properties: Record<string, any> | undefined, 
  modelId?: string
): string | undefined => {
  if (!properties || !modelId?.toLowerCase().includes("elevenlabs")) {
    return undefined;
  }

  const keywords = ["voice", "voice_id", "voice name"];  
  let bestKey: string | undefined;
  let bestScore = -Infinity;

  for (const [key, schema] of Object.entries(properties)) {
    const title = (schema?.title || "").toLowerCase();
    const desc = (schema?.description || "").toLowerCase();
    const name = key.toLowerCase();

    let score = 0;
    if (Array.isArray(schema?.enum) && schema.enum.length > 0) score += 2;
    
    for (const kw of keywords) {
      if (name.includes(kw) || title.includes(kw) || desc.includes(kw)) score += 3;
    }

    if (score > bestScore) {
      bestScore = score;
      bestKey = key;
    }
  }

  return bestScore >= 4 ? bestKey : undefined;
};

/**
 * Get max prompt length based on model and customMode
 */
export const getMaxPromptLength = (model: any, customMode: boolean | undefined): number => {
  if (!model) return 5000;
  
  // Check if this is a Kie.ai audio model with customMode false
  const isKieAiAudio = model.provider === 'kie_ai' && model.content_type === 'audio';
  
  // Kie.ai audio in non-custom mode has 500 char limit
  if (isKieAiAudio && customMode === false) {
    return 500;
  }
  
  // Default limit for all other cases
  return 5000;
};

/**
 * Build custom parameters, filtering out conditional fields
 */
export const buildCustomParameters = (
  modelParameters: Record<string, any>,
  inputSchema: any
): Record<string, any> => {
  const customParameters: Record<string, any> = {};
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
 * Validate generation inputs
 */
export const validateGenerationInputs = (
  model: any,
  prompt: string,
  uploadedImages: File[],
  isPromptRequired: boolean,
  isImageRequired: boolean,
  maxPromptLength: number
): { valid: boolean; error?: string } => {
  if (isPromptRequired && !prompt.trim()) {
    return { valid: false, error: "Please enter a prompt" };
  }
  
  if (prompt.trim().length > maxPromptLength) {
    return { valid: false, error: `Prompt must be less than ${maxPromptLength} characters` };
  }
  
  if (isImageRequired && uploadedImages.length === 0) {
    return { valid: false, error: "Please upload at least one image for this creation type" };
  }
  
  return { valid: true };
};

/**
 * Handle generation error with navigation
 */
export const handleGenerationError = (error: any, navigate: NavigateFunction): boolean => {
  if (error.message === "SESSION_EXPIRED") {
    toast.error("Session expired", {
      description: "Please log in again. Your work has been saved.",
      duration: 5000
    });
    setTimeout(() => navigate("/auth"), 2000);
    return true;
  }
  
  if (error.message?.includes("INSUFFICIENT_TOKENS")) {
    let parsedError: any = {};
    try {
      parsedError = JSON.parse(error.message.replace("INSUFFICIENT_TOKENS: ", ""));
    } catch (e) {
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
