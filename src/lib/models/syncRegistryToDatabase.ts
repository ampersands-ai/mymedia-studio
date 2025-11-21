/**
 * Sync Registry to Database
 *
 * This utility syncs the TypeScript model registry to the ai_models database table.
 * This is necessary because the generations table has a foreign key constraint
 * that requires matching record_ids in the ai_models table.
 *
 * The TypeScript registry remains the single source of truth for model execution,
 * but the database needs stub records for referential integrity.
 */

import { supabase } from "@/integrations/supabase/client";
import { getAllModels } from "@/lib/models/registry";

export interface SyncResult {
  success: boolean;
  inserted: number;
  updated: number;
  errors: string[];
}

/**
 * Syncs all models from the TypeScript registry to the ai_models database table.
 * Uses upsert to insert new records or update existing ones.
 */
export async function syncRegistryToDatabase(): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    inserted: 0,
    updated: 0,
    errors: [],
  };

  try {
    const allModels = getAllModels();

    // Transform registry models to database format
    const modelsToSync = allModels.map(m => ({
      record_id: m.MODEL_CONFIG.recordId,
      id: m.MODEL_CONFIG.modelId,
      model_name: m.MODEL_CONFIG.modelName,
      provider: m.MODEL_CONFIG.provider,
      content_type: m.MODEL_CONFIG.contentType,
      is_active: m.MODEL_CONFIG.isActive ?? true,
      base_token_cost: m.MODEL_CONFIG.baseTokenCost || m.MODEL_CONFIG.baseCreditCost || 1,
      estimated_time_seconds: m.MODEL_CONFIG.estimatedTimeSeconds || null,
      max_images: m.MODEL_CONFIG.maxImages || null,
      default_outputs: m.MODEL_CONFIG.defaultOutputs || 1,
      api_endpoint: m.MODEL_CONFIG.apiEndpoint || null,
      model_family: m.MODEL_CONFIG.modelFamily || null,
      cost_multipliers: m.MODEL_CONFIG.costMultipliers || {},
      input_schema: m.MODEL_CONFIG.inputSchema || m.SCHEMA || {},
      logo_url: m.MODEL_CONFIG.logoUrl || null,
      display_order_in_family: m.MODEL_CONFIG.displayOrderInFamily || null,
    }));

    // Get existing records to determine inserts vs updates
    const { data: existingRecords, error: fetchError } = await supabase
      .from("ai_models")
      .select("record_id");

    if (fetchError) {
      result.errors.push(`Failed to fetch existing records: ${fetchError.message}`);
      return result;
    }

    const existingIds = new Set(existingRecords?.map(r => r.record_id) || []);

    // Split into new and existing
    const newModels = modelsToSync.filter(m => !existingIds.has(m.record_id));
    const existingModels = modelsToSync.filter(m => existingIds.has(m.record_id));

    // Insert new models
    if (newModels.length > 0) {
      const { error: insertError } = await supabase
        .from("ai_models")
        .insert(newModels);

      if (insertError) {
        result.errors.push(`Failed to insert new models: ${insertError.message}`);
      } else {
        result.inserted = newModels.length;
      }
    }

    // Update existing models
    for (const model of existingModels) {
      const { error: updateError } = await supabase
        .from("ai_models")
        .update({
          id: model.id,
          model_name: model.model_name,
          provider: model.provider,
          content_type: model.content_type,
          is_active: model.is_active,
          base_token_cost: model.base_token_cost,
          estimated_time_seconds: model.estimated_time_seconds,
          max_images: model.max_images,
          default_outputs: model.default_outputs,
          api_endpoint: model.api_endpoint,
          model_family: model.model_family,
          cost_multipliers: model.cost_multipliers,
          input_schema: model.input_schema,
          logo_url: model.logo_url,
          display_order_in_family: model.display_order_in_family,
        })
        .eq("record_id", model.record_id);

      if (updateError) {
        result.errors.push(`Failed to update ${model.model_name}: ${updateError.message}`);
      } else {
        result.updated++;
      }
    }

    result.success = result.errors.length === 0;
    return result;

  } catch (error) {
    result.errors.push(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
}

/**
 * Check if the database is in sync with the registry.
 * Returns true if all registry models have corresponding database records.
 */
export async function checkRegistrySync(): Promise<{
  inSync: boolean;
  missingCount: number;
  missingRecordIds: string[];
}> {
  const allModels = getAllModels();
  const registryIds = new Set(allModels.map(m => m.MODEL_CONFIG.recordId));

  const { data: dbRecords, error } = await supabase
    .from("ai_models")
    .select("record_id");

  if (error) {
    return { inSync: false, missingCount: registryIds.size, missingRecordIds: [] };
  }

  const dbIds = new Set(dbRecords?.map(r => r.record_id) || []);
  const missingRecordIds = [...registryIds].filter(id => !dbIds.has(id));

  return {
    inSync: missingRecordIds.length === 0,
    missingCount: missingRecordIds.length,
    missingRecordIds,
  };
}
