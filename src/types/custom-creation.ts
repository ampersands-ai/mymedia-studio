import { CreationGroup } from "@/constants/creation-groups";

/**
 * Single generation output structure
 */
export interface GenerationOutput {
  id: string;
  storage_path: string;
  output_index: number;
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
  enhancePrompt: boolean;
  generateCaption: boolean;
  resolution: "Native" | "HD";
  advancedOpen: boolean;
  
  // Generation state
  generatedOutput: string | null;
  generatedOutputs: GenerationOutput[];
  selectedOutputIndex: number;
  pollingGenerationId: string | null;
  parentGenerationId: string | null;
  localGenerating: boolean;
  generationStartTime: number | null;
  generationCompleteTime: number | null;
  
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
}
