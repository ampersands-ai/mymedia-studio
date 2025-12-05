/**
 * Output Processor Types
 * Independent module for handling generation output processing
 */

export interface GenerationOutput {
  id: string;
  storage_path: string;
  type?: string;
  output_index: number;
  provider_task_id?: string;
  model_id?: string;
  provider?: string;
}

export interface ProcessorConfig {
  userId: string;
  generationId: string;
  onOutputs: (outputs: GenerationOutput[], parentId: string) => void;
  onError: (error: string) => void;
  onStatusChange?: (status: ProcessorStatus) => void;
}

export type ProcessorStatus = 
  | 'idle'
  | 'connecting'
  | 'polling'
  | 'realtime'
  | 'processing'
  | 'completed'
  | 'error';

export interface GenerationRecord {
  id: string;
  status: string;
  storage_path: string | null;
  type: string;
  created_at: string;
  provider_task_id: string | null;
  model_id: string | null;
  model_record_id: string | null;
  provider_response: Record<string, unknown> | null;
  is_batch_output: boolean | null;
  user_id: string | null;
  output_index: number | null;
}

export interface ChildGenerationRecord {
  id: string;
  storage_path: string | null;
  output_index: number | null;
  provider_task_id: string | null;
  model_id: string | null;
  model_record_id: string | null;
  status: string;
}
