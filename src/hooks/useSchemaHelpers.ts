import { useCallback } from "react";
import type { ModelConfiguration } from "@/types/schema";
import { isKieAiAudioModel } from "@/lib/custom-creation-utils";

// Type stub for backward compatibility - models now loaded from registry
type AIModel = ModelConfiguration;

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
   * Dynamically detect image field from schema using explicit imageInputField flag
   */
  const getImageFieldInfo = useCallback((model: AIModel | null): { 
    fieldName: string | null; 
    isRequired: boolean; 
    isArray: boolean; 
    maxImages: number 
  } => {
    if (!model?.input_schema) {
      return { fieldName: null, isRequired: false, isArray: false, maxImages: 0 };
    }
    
    const imageFieldName = (model.input_schema as any).imageInputField;
    
    // No image input field defined in schema
    if (!imageFieldName) {
      return { fieldName: null, isRequired: false, isArray: false, maxImages: 0 };
    }
    
    const properties = (model.input_schema as any).properties || {};
    const fieldSchema = properties[imageFieldName];
    
    if (!fieldSchema) {
      console.warn(`Image field '${imageFieldName}' declared in schema but not found in properties`);
      return { fieldName: null, isRequired: false, isArray: false, maxImages: 0 };
    }
    
    const required = (model.input_schema as any).required || [];
    const isRequired = required.includes(imageFieldName);
    const isArray = fieldSchema.type === 'array';
    const maxImages = isArray 
      ? (fieldSchema.maxItems || model.max_images || 10) 
      : 1;
    
    return { fieldName: imageFieldName, isRequired, isArray, maxImages };
  }, []);


  /**
   * Determine max prompt length based on model and customMode
   */
  const getMaxPromptLength = useCallback((model: AIModel | null, customMode?: boolean): number => {
    if (!model) return 5000;

    // Kie.ai audio in non-custom mode has 500 char limit
    if (isKieAiAudioModel(model) && customMode === false) {
      return 500;
    }

    // Default limit for all other cases
    return 5000;
  }, []);

  return {
    getSchemaRequiredFields,
    getImageFieldInfo,
    getMaxPromptLength,
  };
};
