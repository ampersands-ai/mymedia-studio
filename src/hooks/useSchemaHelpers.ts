import { useCallback } from "react";
import type { Database } from "@/integrations/supabase/types";

type AIModel = Database['public']['Tables']['ai_models']['Row'];

/**
 * Schema parsing utilities for dynamic form generation
 * Provides helpers to extract required fields, image info, and primary keys
 */
export const useSchemaHelpers = () => {
  /**
   * Get required fields from model schema
   */
  const getSchemaRequiredFields = useCallback((model: AIModel | null): string[] => {
    if (!model?.input_schema || typeof model.input_schema !== 'object') return [];
    return (model.input_schema as any)?.required || [];
  }, []);

  /**
   * Dynamically detect image field from schema
   */
  const getImageFieldInfo = useCallback((model: AIModel | null): { 
    fieldName: string | null; 
    isRequired: boolean; 
    isArray: boolean; 
    maxImages: number 
  } => {
    if (!model) {
      return { fieldName: null, isRequired: false, isArray: false, maxImages: 0 };
    }
    
    const schema = model.input_schema as any;
    if (!schema?.properties) {
      return { fieldName: null, isRequired: false, isArray: false, maxImages: 0 };
    }
    
    const properties = schema.properties;
    const required = schema.required || [];
    
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

      // Skip main prompt fields (handled by PromptInput component)
      if (['prompt', 'positiveprompt', 'positive_prompt'].includes(name)) continue;

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
    model?: AIModel | null
  ): string | undefined => {
    if (!properties) return undefined;
    if (!model?.provider || !model.provider.toLowerCase().includes("elevenlabs")) return undefined;

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
  const getMaxPromptLength = useCallback((model: AIModel | null, customMode?: boolean): number => {
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
