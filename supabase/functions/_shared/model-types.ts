/**
 * Shared Model Types
 *
 * These types are used by both:
 * - Client-side model registry (src/lib/models/)
 * - Edge functions (supabase/functions/)
 *
 * This ensures type consistency without database dependencies.
 */

export interface ModelConfig {
  // Core identifiers
  modelId: string;
  recordId: string;
  modelName: string;

  // Provider configuration
  provider: string;
  contentType: string;
  use_api_key?: string;

  // API configuration
  apiEndpoint?: string | null;
  payloadStructure?: string;

  // Cost and performance
  baseCreditCost: number;
  estimatedTimeSeconds?: number;
  costMultipliers?: Record<string, number>;

  // Capabilities
  maxImages?: number | null;
  defaultOutputs?: number;

  // Status
  isActive?: boolean;

  // UI metadata (optional for edge function, required for client)
  logoUrl?: string;
  modelFamily?: string;
  variantName?: string;
  displayOrderInFamily?: number;

  // Lock system
  isLocked?: boolean;
  lockedFilePath?: string;
}

export interface ModelSchema {
  type: string;
  properties: Record<string, any>;
  required?: string[];
  imageInputField?: string;
}

/**
 * Full model definition as sent from client to edge function
 */
export interface FullModelDefinition {
  config: ModelConfig;
  schema: ModelSchema;
}
