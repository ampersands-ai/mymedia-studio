import { useCallback } from "react";
import type { ModelConfiguration } from "@/types/schema";
import { isKieAiAudioModel } from "@/lib/custom-creation-utils";
import { logger } from "@/lib/logger";

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
    if (!model?.input_schema || typeof model.input_schema !== 'object' || model.input_schema === null) return [];
    const schema = model.input_schema as { required?: string[] };
    return schema.required || [];
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

    const schema = model.input_schema as { imageInputField?: string; properties?: Record<string, { type?: string; maxItems?: number }>; required?: string[] };
    const imageFieldName = schema.imageInputField;

    // No image input field defined in schema
    if (!imageFieldName) {
      return { fieldName: null, isRequired: false, isArray: false, maxImages: 0 };
    }

    const properties = schema.properties || {};
    const fieldSchema = properties[imageFieldName];

    if (!fieldSchema) {
      logger.warn(`Image field '${imageFieldName}' declared in schema but not found in properties`);
      return { fieldName: null, isRequired: false, isArray: false, maxImages: 0 };
    }

    const required = schema.required || [];
    const isRequired = required.includes(imageFieldName);
    const isArray = fieldSchema.type === 'array';
    const maxImages = isArray 
      ? (fieldSchema.maxItems || model.max_images || 10) 
      : 1;
    
    return { fieldName: imageFieldName, isRequired, isArray, maxImages };
  }, []);


  /**
   * Determine max prompt length based on model and customMode
   * Reads model-specific maxLength from schema if available
   */
  const getMaxPromptLength = useCallback((model: AIModel | null, customMode?: boolean): number => {
    const DEFAULT_LIMIT = 5000;
    
    if (!model) return DEFAULT_LIMIT;

    // Primary provider audio in non-custom mode has 500 char limit
    if (isKieAiAudioModel(model) && customMode === false) {
      return 500;
    }

    // Read model-specific maxLength from schema if available
    const schema = model.input_schema as { 
      properties?: Record<string, { maxLength?: number }> 
    };
    const promptMaxLength = schema?.properties?.prompt?.maxLength;
    
    if (promptMaxLength && typeof promptMaxLength === 'number') {
      return promptMaxLength;
    }

    return DEFAULT_LIMIT;
  }, []);

  /**
   * Dynamically detect audio field from schema using explicit audioInputField flag
   */
  const getAudioFieldInfo = useCallback((model: AIModel | null): { 
    fieldName: string | null; 
    isRequired: boolean; 
    maxDuration: number | null;
  } => {
    if (!model?.input_schema) {
      return { fieldName: null, isRequired: false, maxDuration: null };
    }

    const schema = model.input_schema as { 
      audioInputField?: string; 
      properties?: Record<string, { maxDuration?: number }>; 
      required?: string[] 
    };
    const audioFieldName = schema.audioInputField;

    // No audio input field defined in schema
    if (!audioFieldName) {
      return { fieldName: null, isRequired: false, maxDuration: null };
    }

    const properties = schema.properties || {};
    const fieldSchema = properties[audioFieldName];

    if (!fieldSchema) {
      logger.warn(`Audio field '${audioFieldName}' declared in schema but not found in properties`);
      return { fieldName: null, isRequired: false, maxDuration: null };
    }

    const required = schema.required || [];
    const isRequired = required.includes(audioFieldName);
    const maxDuration = fieldSchema.maxDuration || null;

    return { fieldName: audioFieldName, isRequired, maxDuration };
  }, []);

  /**
   * Dynamically detect video field from schema using explicit videoInputField flag
   */
  const getVideoFieldInfo = useCallback((model: AIModel | null): { 
    fieldName: string | null; 
    isRequired: boolean; 
    maxDuration: number | null;
    maxFileSize: number;
  } => {
    const defaultMaxSize = 10 * 1024 * 1024; // 10MB default
    
    if (!model?.input_schema) {
      return { fieldName: null, isRequired: false, maxDuration: null, maxFileSize: defaultMaxSize };
    }

    const schema = model.input_schema as { 
      videoInputField?: string; 
      properties?: Record<string, { maxDuration?: number; maxFileSize?: number }>; 
      required?: string[] 
    };
    const videoFieldName = schema.videoInputField;

    // No video input field defined in schema
    if (!videoFieldName) {
      return { fieldName: null, isRequired: false, maxDuration: null, maxFileSize: defaultMaxSize };
    }

    const properties = schema.properties || {};
    const fieldSchema = properties[videoFieldName];

    if (!fieldSchema) {
      logger.warn(`Video field '${videoFieldName}' declared in schema but not found in properties`);
      return { fieldName: null, isRequired: false, maxDuration: null, maxFileSize: defaultMaxSize };
    }

    const required = schema.required || [];
    const isRequired = required.includes(videoFieldName);
    const maxDuration = fieldSchema.maxDuration || null;
    const maxFileSize = fieldSchema.maxFileSize || defaultMaxSize;

    return { fieldName: videoFieldName, isRequired, maxDuration, maxFileSize };
  }, []);

  return {
    getSchemaRequiredFields,
    getImageFieldInfo,
    getAudioFieldInfo,
    getVideoFieldInfo,
    getMaxPromptLength,
  };
};
