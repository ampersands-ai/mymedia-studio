import type { UseMutationResult } from '@tanstack/react-query';
import type { 
  Generation, 
  Model, 
  Template, 
  VideoJob, 
  WorkflowExecution,
  VoiceOption,
  Storyboard,
  CustomParameters
} from './api-responses';

// Hook return types for consistency
export interface UseGenerationReturn {
  generate: (params: GenerationParams) => Promise<void>;
  isGenerating: boolean;
  result: Generation | null;
  error: string | null;
  clearError: () => void;
}

export interface GenerationParams {
  modelId: string;
  modelRecordId: string;
  prompt: string;
  customParameters?: CustomParameters;
  templateId?: string;
  enhancePrompt?: boolean;
}

export interface UseModelsReturn {
  models: Model[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export interface UseTemplatesReturn {
  templates: Template[];
  isLoading: boolean;
  error: Error | null;
  getTemplateById: (id: string) => Template | undefined;
}

export interface UsePollingReturn {
  startPolling: (generationId: string) => void;
  stopPolling: () => void;
  isPolling: boolean;
  pollingId: string | null;
}

export interface UseVideoJobsReturn {
  currentJob: VideoJob | null;
  isLoading: boolean;
  createJob: UseMutationResult<VideoJob, Error, CreateVideoJobParams>;
  resetJob: () => void;
}

export interface CreateVideoJobParams {
  prompt: string;
  voice_id?: string;
  music_prompt?: string;
  custom_parameters?: CustomParameters;
}

export interface UseWorkflowExecutionReturn {
  execute: (params: WorkflowExecutionParams) => Promise<void>;
  isExecuting: boolean;
  execution: WorkflowExecution | null;
  error: string | null;
}

export interface WorkflowExecutionParams {
  templateId: string;
  userInput: Record<string, unknown>;
}

export interface UseVoiceOptionsReturn {
  voices: VoiceOption[];
  isLoading: boolean;
  error: Error | null;
  getVoiceById: (id: string) => VoiceOption | undefined;
}

export interface UseStoryboardReturn {
  storyboard: Storyboard | null;
  isLoading: boolean;
  createStoryboard: UseMutationResult<Storyboard, Error, CreateStoryboardParams>;
  updateStoryboard: UseMutationResult<Storyboard, Error, UpdateStoryboardParams>;
  error: Error | null;
}

export interface CreateStoryboardParams {
  title: string;
  scenes: Array<{
    prompt: string;
    duration?: number;
    order: number;
  }>;
}

export interface UpdateStoryboardParams {
  id: string;
  updates: Partial<CreateStoryboardParams>;
}
