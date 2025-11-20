/**
 * ONE-TIME SCRIPT: Export ai_models metadata from database
 * This captures current state before migration to .ts file control
 */
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function exportMetadata() {
  console.log('📊 Exporting ai_models metadata from database...');

  const { data, error } = await supabase
    .from('ai_models')
    .select('*')
    .order('content_type', { ascending: true });

  if (error) {
    console.error('❌ Error fetching models:', error);
    process.exit(1);
  }

  console.log(`✅ Found ${data.length} models in database`);

  // Export to JSON
  const exportData = {
    exportDate: new Date().toISOString(),
    totalModels: data.length,
    models: data.map((model: any) => ({
      record_id: model.record_id,
      id: model.id,
      model_name: model.model_name,
      provider: model.provider,
      content_type: model.content_type,
      base_token_cost: model.base_token_cost,
      estimated_time_seconds: model.estimated_time_seconds,
      is_active: model.is_active,
      logo_url: model.logo_url,
      model_family: model.model_family,
      variant_name: model.variant_name,
      display_order_in_family: model.display_order_in_family,
      groups: model.groups,
      payload_structure: model.payload_structure,
      max_images: model.max_images,
      default_outputs: model.default_outputs,
      api_endpoint: model.api_endpoint,
      cost_multipliers: model.cost_multipliers,
      is_locked: model.is_locked,
      locked_file_path: model.locked_file_path,
    }))
  };

  fs.writeFileSync('migration_data.json', JSON.stringify(exportData, null, 2));
  console.log('✅ Exported to migration_data.json');

  // Print summary
  console.log('\n📊 EXPORT SUMMARY:');
  console.log(`Total models: ${exportData.totalModels}`);
  console.log(`Active models: ${exportData.models.filter((m: any) => m.is_active).length}`);
  console.log(`Inactive models: ${exportData.models.filter((m: any) => !m.is_active).length}`);

  const byContentType: Record<string, number> = {};
  exportData.models.forEach((m: any) => {
    byContentType[m.content_type] = (byContentType[m.content_type] || 0) + 1;
  });

  console.log('\nBy content type:');
  Object.entries(byContentType).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });
}

exportMetadata().catch(console.error);
