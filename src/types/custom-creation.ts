import { CreationGroup } from "@/constants/creation-groups";
import type { ModelJsonSchema } from './model-schema';
import type { AIModel } from '@/hooks/useModels';

/**
 * Re-export AIModel as ModelRecord for backward compatibility
 * AIModel is the canonical type from the database
 */
export type ModelRecord = AIModel;

/**
 * Schema value types for input fields
 */
export type SchemaValue = 
  | string 
  | number 
  | boolean 
  | string[] 
  | number[] 
  | Record<string, unknown>
  | null 
  | undefined;

/**
 * Schema change handler type
 */
export type SchemaChangeHandler = (value: SchemaValue) => void;

/**
 * Video style types for VideoCreator
 * Must match VideoJobInput.style from @/types/video
 */
export type VideoStyle = 
  | 'modern' 
  | 'tech' 
  | 'educational' 
  | 'dramatic';

/**
 * Single generation output structure
 */
export interface GenerationOutput {
  id: string;
  storage_path: string;
  output_index: number;
  provider_task_id?: string | null;
  model_id?: string | null;
  provider?: string | null;
  modelFamily?: string | null;
}

/**
 * Caption data structure
 */
export interface CaptionData {
  caption: string;
  hashtags: string[];
  generated_at: string;
}

/**
 * Consolidated state for custom creation
 */
export interface CustomCreationState {
  // Form state
  prompt: string;
  selectedModel: string | null;
  selectedGroup: CreationGroup;
  modelParameters: Record<string, any>;
  generateCaption: boolean;
  notifyOnCompletion: boolean;
  resolution: "Native" | "HD";
  advancedOpen: boolean;
  audioDuration: number | null;
  videoDuration: number | null;
  
  // Generation state
  generatedOutput: string | null;
  generatedOutputs: GenerationOutput[];
  selectedOutputIndex: number;
  pollingGenerationId: string | null;
  parentGenerationId: string | null;
  localGenerating: boolean;
  generationStartTime: number | null;
  apiCallStartTime: number | null; // When the actual API call started (after setup)
  generationCompleteTime: number | null;
  isBackgroundProcessing: boolean; // When polling stopped but generation continues in background
  
  // UI state
  showLightbox: boolean;
  captionExpanded: boolean;
  hashtagsExpanded: boolean;
  showResetDialog: boolean;
  generatingSurprise: boolean;
  generatingVideoIndex: number | null;
  
  // Caption state
  captionData: CaptionData | null;
  isGeneratingCaption: boolean;
  
  // Template preview
  templateBeforeImage: string | null;
  templateAfterImage: string | null;
  
  // Failed generation error
  failedGenerationError: {
    message: string;
    generationId: string;
    timestamp: number;
    providerResponse?: Record<string, unknown>;
  } | null;
}

/**
 * Type guard to check if a value is a valid SchemaValue
 */
export function isSchemaValue(value: unknown): value is SchemaValue {
  return (
    value === null ||
    value === undefined ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    Array.isArray(value) ||
    (typeof value === 'object' && value !== null)
  );
}

/**
 * Type guard to check if a model is valid
 */
export function isValidModelRecord(model: unknown): model is ModelRecord {
  if (!model || typeof model !== 'object') return false;
  const m = model as Partial<ModelRecord>;
  return !!(
    m.record_id &&
    m.id &&
    m.model_name &&
    m.provider &&
    m.content_type &&
    typeof m.base_token_cost === 'number'
  );
}

/**
 * Type guard to check if value is a ModelJsonSchema with properties
 */
export function hasSchemaProperties(schema: unknown): schema is ModelJsonSchema {
  return !!(
    schema &&
    typeof schema === 'object' &&
    'properties' in schema &&
    schema.properties &&
    typeof schema.properties === 'object'
  );
}
