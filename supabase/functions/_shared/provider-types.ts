/**
 * Provider Type System
 * 
 * Consolidated type definitions for provider requests/responses.
 * Eliminates scattered definitions across edge functions.
 */

export interface SchemaProperty {
  type: string;
  enum?: unknown[];
  default?: unknown;
  description?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
}

export interface InputSchema {
  type?: string;
  properties: Record<string, SchemaProperty>;
  required?: string[];
  imageInputField?: string;
}

export interface ProviderRequest {
  model: string;
  model_record_id?: string;
  parameters: Record<string, unknown>;
  api_endpoint?: string;
  payload_structure?: string;
  uploadEndpoint?: string;
  input_schema?: InputSchema;
}

export interface ProviderResponse {
  output_data: Uint8Array;
  file_extension: string;
  file_size: number;
  metadata: Record<string, unknown>;
  storage_path?: string;
}

/**
 * Type guard for InputSchema
 */
export function isInputSchema(value: unknown): value is InputSchema {
  if (!value || typeof value !== 'object') return false;
  const schema = value as Partial<InputSchema>;
  return typeof schema.properties === 'object' && schema.properties !== null;
}

/**
 * Type guard for ProviderRequest
 */
export function isProviderRequest(value: unknown): value is ProviderRequest {
  if (!value || typeof value !== 'object') return false;
  const req = value as Partial<ProviderRequest>;
  return typeof req.model === 'string' && typeof req.parameters === 'object';
}
