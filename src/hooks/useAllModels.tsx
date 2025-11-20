/**
 * useAllModels Hook - MIGRATED TO .TS FILE CONTROL
 *
 * Returns ALL models (active and inactive) for admin testing and management.
 * Now reads from registry instead of database.
 */
import { useQuery } from "@tanstack/react-query";
import { getAllModels } from "@/lib/models/registry";
import type { AIModel } from "./useModels";

/**
 * Fetch ALL models (active and inactive) for admin testing
 * Migrated to read from registry (.ts files) instead of database
 */
export const useAllModels = () => {
  return useQuery({
    queryKey: ['all-models'],
    queryFn: async () => {
      // Read directly from registry (no database query!)
      const modules = getAllModels();

      // Transform ModelModule[] to AIModel[] format
      // Include ALL models (don't filter by isActive)
      return modules.map(m => ({
        // Core fields
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
        groups: null,
        logo_url: m.MODEL_CONFIG.logoUrl || null,
        model_family: m.MODEL_CONFIG.modelFamily || null,
        variant_name: m.MODEL_CONFIG.variantName || null,
        display_order_in_family: m.MODEL_CONFIG.displayOrderInFamily || null,
        is_locked: m.MODEL_CONFIG.isLocked,
        locked_file_path: m.MODEL_CONFIG.lockedFilePath,
        locked_at: null,
        locked_by: null,
      } as AIModel));
    },
  });
};
