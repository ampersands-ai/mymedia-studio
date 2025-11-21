/**
 * useModels Hook - MIGRATED TO .TS FILE CONTROL
 *
 * This hook now reads model data directly from the registry (.ts files)
 * instead of querying the database. This enables complete version control
 * of all model metadata through git.
 *
 * Changes made to MODEL_CONFIG in .ts files appear immediately in the UI.
 * No database sync required!
 */
import { useQuery } from "@tanstack/react-query";
import { getAllModels } from "@/lib/models/registry";

export interface AIModel {
  record_id: string;
  id: string;
  provider: string;
  model_name: string;
  content_type: string;
  base_token_cost: number;
  cost_multipliers: Record<string, unknown> | null;
  input_schema: Record<string, unknown> | null;
  api_endpoint: string | null;
  is_active: boolean;
  groups?: string[] | null;
  payload_structure?: string;
  max_images?: number | null;
  estimated_time_seconds?: number | null;
  logo_url?: string | null;
  default_outputs?: number | null;
  model_family?: string | null;
  variant_name?: string | null;
  display_order_in_family?: number | null;
  // Lock system fields
  is_locked?: boolean;
  locked_at?: string | null;
  locked_by?: string | null;
  locked_file_path?: string | null;
}

export const useModels = () => {
  return useQuery<AIModel[]>({
    queryKey: ["ai-models"],
    queryFn: async () => {
      // Read directly from registry (no database query!)
      const modules = getAllModels();

      // Transform ModelModule[] to AIModel[] format
      return modules
        .filter(m => m.MODEL_CONFIG.isActive) // Only return active models
        .map(m => ({
          // Core fields (snake_case to match original interface)
          record_id: m.MODEL_CONFIG.recordId,
          id: m.MODEL_CONFIG.modelId,
          provider: m.MODEL_CONFIG.provider,
          model_name: m.MODEL_CONFIG.modelName,
          content_type: m.MODEL_CONFIG.contentType,
          base_token_cost: m.MODEL_CONFIG.baseCreditCost,
          cost_multipliers: m.MODEL_CONFIG.costMultipliers || null,

          // Schema from SCHEMA export
          input_schema: m.SCHEMA || null,

          // API configuration
          api_endpoint: m.MODEL_CONFIG.apiEndpoint,
          payload_structure: m.MODEL_CONFIG.payloadStructure,
          max_images: m.MODEL_CONFIG.maxImages,
          estimated_time_seconds: m.MODEL_CONFIG.estimatedTimeSeconds,
          default_outputs: m.MODEL_CONFIG.defaultOutputs,

          // Active status
          is_active: m.MODEL_CONFIG.isActive,

          // Groups - UI filters by this array, so populate from contentType
          groups: [m.MODEL_CONFIG.contentType],

          // UI metadata
          logo_url: m.MODEL_CONFIG.logoUrl || null,
          model_family: m.MODEL_CONFIG.modelFamily || null,
          variant_name: m.MODEL_CONFIG.variantName || null,
          display_order_in_family: m.MODEL_CONFIG.displayOrderInFamily || null,

          // Lock system
          is_locked: m.MODEL_CONFIG.isLocked,
          locked_file_path: m.MODEL_CONFIG.lockedFilePath,
          locked_at: null, // Not tracked in .ts files
          locked_by: null, // Not tracked in .ts files
        }));
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
};

export const useModelsByContentType = () => {
  const { data: models, ...rest } = useModels();

  const modelsByContentType = models?.reduce((acc, model) => {
    const contentType = model.content_type;
    if (!acc[contentType]) {
      acc[contentType] = [];
    }
    acc[contentType].push(model);
    return acc;
  }, {} as Record<string, AIModel[]>);

  return { modelsByContentType, models, ...rest };
};

// Hook for fetching a single model by record_id
export const useModelByRecordId = (recordId: string | undefined) => {
  return useQuery({
    queryKey: ["ai-model", recordId],
    queryFn: async () => {
      if (!recordId) return null;

      // Read directly from registry instead of database
      const modules = getAllModels();
      const module = modules.find(m => m.MODEL_CONFIG.recordId === recordId);

      if (!module) return null;

      // Transform to AIModel format
      const m = module;
      return {
        record_id: m.MODEL_CONFIG.recordId,
        id: m.MODEL_CONFIG.modelId,
        provider: m.MODEL_CONFIG.provider,
        model_name: m.MODEL_CONFIG.modelName,
        content_type: m.MODEL_CONFIG.contentType,
        base_token_cost: m.MODEL_CONFIG.baseCreditCost,
        cost_multipliers: m.MODEL_CONFIG.costMultipliers || null,
        input_schema: m.SCHEMA || null,
        api_endpoint: m.MODEL_CONFIG.apiEndpoint,
        payload_structure: m.MODEL_CONFIG.payloadStructure,
        max_images: m.MODEL_CONFIG.maxImages,
        estimated_time_seconds: m.MODEL_CONFIG.estimatedTimeSeconds,
        default_outputs: m.MODEL_CONFIG.defaultOutputs,
        is_active: m.MODEL_CONFIG.isActive,
        groups: [m.MODEL_CONFIG.contentType],
        logo_url: m.MODEL_CONFIG.logoUrl || null,
        model_family: m.MODEL_CONFIG.modelFamily || null,
        variant_name: m.MODEL_CONFIG.variantName || null,
        display_order_in_family: m.MODEL_CONFIG.displayOrderInFamily || null,
        is_locked: m.MODEL_CONFIG.isLocked,
        locked_file_path: m.MODEL_CONFIG.lockedFilePath,
        locked_at: null,
        locked_by: null,
      } as AIModel;
    },
    enabled: !!recordId,
    staleTime: 30 * 1000,
    gcTime: 60 * 1000,
  });
};
