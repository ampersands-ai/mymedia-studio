import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches all locked models with their file contents from the database
 * Used by AI to sync locked model files to the codebase
 */
export async function fetchLockedModelsForSync() {
  const { data, error } = await supabase
    .from("ai_models")
    .select("record_id, id, model_name, locked_file_path, locked_file_contents, groups")
    .eq("is_locked", true)
    .not("locked_file_path", "is", null)
    .not("locked_file_contents", "is", null);

  if (error) {
    throw error;
  }

  return data.map((model) => ({
    recordId: model.record_id,
    modelId: model.id,
    modelName: model.model_name,
    filePath: `src/lib/models/locked/${model.locked_file_path}`,
    content: model.locked_file_contents!,
    groups: model.groups,
  }));
}

/**
 * Helper type for locked model sync data
 */
export interface LockedModelSyncData {
  recordId: string;
  modelId: string;
  modelName: string;
  filePath: string;
  content: string;
  groups: any;
}
