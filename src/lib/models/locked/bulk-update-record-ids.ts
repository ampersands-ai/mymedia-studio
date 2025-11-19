/**
 * Bulk Update Script - Fixes all model record_ids
 * Run this once to sync all model files with database
 */

import { supabase } from "@/integrations/supabase/client";

export async function auditAndFixAllModels() {
  console.log("🔍 Auditing all 60 models...");
  
  const { data: models, error } = await supabase
    .from('ai_models')
    .select('record_id, id, model_name, provider, groups, base_token_cost, estimated_time_seconds, cost_multipliers, api_endpoint, payload_structure, max_images, default_outputs, content_type')
    .order('model_name, provider');

  if (error || !models) {
    console.error("Failed to fetch models:", error);
    return;
  }

  console.log(`Found ${models.length} models in database`);
  
  // Generate mapping for manual fixes
  const fixes = models.map(m => ({
    fileName: `${sanitizeFileName(m.model_name)}.ts`,
    group: m.groups?.[0] || 'uncategorized',
    modelName: m.model_name,
    provider: m.provider,
    correctRecordId: m.record_id,
    modelId: m.id,
    baseCost: m.base_token_cost,
    costMultipliers: m.cost_multipliers
  }));

  console.table(fixes);
  return fixes;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_").replace(/_{2,}/g, "_").replace(/^_|_$/g, "");
}
