import { useCallback } from "react";

/**
 * Schema parsing utilities for dynamic form generation
 * Provides helpers to extract required fields, image info, and primary keys
 */
export const useSchemaHelpers = () => {
  /**
   * Get required fields from model schema
   */
  const getSchemaRequiredFields = useCallback((model: { custom_parameters?: Record<string, { required?: boolean }> } | null): string[] => {
    if (!model) return [];
    return model?.input_schema?.required || [];
  }, []);

  /**
   * Dynamically detect image field from schema
   */
  const getImageFieldInfo = useCallback((model: { custom_parameters?: Record<string, { type?: string; accepts_image?: boolean }> } | null): { 
    fieldName: string | null; 
    isRequired: boolean; 
    isArray: boolean; 
    maxImages: number 
  } => {
    if (!model) {
      return { fieldName: null, isRequired: false, isArray: false, maxImages: 0 };
    }
    
    if (!model.input_schema?.properties) {
      return { fieldName: null, isRequired: false, isArray: false, maxImages: 0 };
    }
    
    const properties = model.input_schema.properties;
    const required = model.input_schema.required || [];
    
    // Look for image-like fields
    const imageFieldNames = [
      'inputImage', 'image_urls', 'imageUrl', 'image_url', 
      'image', 'images', 'filesUrl', 'filesURL', 'file_urls', 
      'fileUrls', 'reference_image_urls', 'frameImages'
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
  }, []);

  /**
   * Heuristic: find primary long-text field key (prompt/script/etc.)
   */
  const findPrimaryTextKey = useCallback((properties: Record<string, any> | undefined): string | undefined => {
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
        if (name.includes(kw) || title.includes(kw) || desc.includes(kw)) {
          score += 2;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestKey = key;
      }
    }

    return bestScore >= 3 ? bestKey : undefined;
  }, []);

  /**
   * Heuristic: find primary voice field key for ElevenLabs models
   */
  const findPrimaryVoiceKey = useCallback((
    properties: Record<string, any> | undefined, 
    modelId?: string
  ): string | undefined => {
    if (!properties) return undefined;
    if (!modelId || !modelId.toLowerCase().includes("elevenlabs")) return undefined;

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
        if (name.includes(kw) || title.includes(kw) || desc.includes(kw)) {
          score += 3;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestKey = key;
      }
    }

    return bestScore >= 4 ? bestKey : undefined;
  }, []);

  /**
   * Determine max prompt length based on model and customMode
   */
  const getMaxPromptLength = useCallback((model: { custom_parameters?: Record<string, { maxLength?: number }> } | null, customMode?: boolean): number => {
    if (!model) return 5000;
    
    // Check if this is a Kie.ai audio model with customMode false
    const isKieAiAudio = model.provider === 'kie_ai' && model.content_type === 'audio';
    
    // Kie.ai audio in non-custom mode has 500 char limit
    if (isKieAiAudio && customMode === false) {
      return 500;
    }
    
    // Default limit for all other cases
    return 5000;
  }, []);

  return {
    getSchemaRequiredFields,
    getImageFieldInfo,
    findPrimaryTextKey,
    findPrimaryVoiceKey,
    getMaxPromptLength,
  };
};
