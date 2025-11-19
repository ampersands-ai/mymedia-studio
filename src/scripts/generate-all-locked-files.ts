/**
 * Script to generate all 60 physical model files
 * Run this to create complete isolated system
 */

import { supabase } from "@/integrations/supabase/client";
import { generateModelFileContent } from "@/lib/models/locked/ModelFileGenerator";

export async function generateAllLockedFiles() {
  console.log("🚀 Generating all locked model files...");
  
  const { data: models, error } = await supabase
    .from('ai_models')
    .select('*')
    .order('provider', { ascending: true });

  if (error || !models) {
    throw new Error(`Failed to fetch models: ${error?.message}`);
  }

  const fileContents: { path: string; content: string }[] = [];

  for (const model of models) {
    const group = Array.isArray(model.groups) ? model.groups[0] : "uncategorized";
    const fileName = model.model_name.replace(/[^a-zA-Z0-9_-]/g, "_");
    const path = `src/lib/models/locked/${group}/${fileName}.ts`;
    const content = generateModelFileContent(model as any);
    
    fileContents.push({ path, content });
  }

  console.log(`✅ Generated ${fileContents.length} model files`);
  console.log("\n📋 Copy these files manually:");
  
  fileContents.forEach(({ path }) => {
    console.log(`   ${path}`);
  });

  return fileContents;
}
