/**
 * One-time migration script: Generate .ts files for ALL existing models
 * 
 * Run this after deployment to ensure all models have their .ts files.
 * 
 * Usage:
 * 1. Admin opens browser console in production
 * 2. Manually trigger this via admin UI or edge function
 */

import { supabase } from "@/integrations/supabase/client";
import { generateModelFile, generateFileName } from "@/lib/models/generateModelFile";
import { logger } from "@/lib/logger";

export async function generateAllModelFiles() {
  logger.info("Starting model file generation for all models");

  try {
    // Fetch all models from database
    const { data: models, error } = await supabase
      .from("ai_models")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) throw error;

    if (!models || models.length === 0) {
      logger.info("No models found in database");
      return { success: true, message: "No models to process" };
    }

    logger.info(`Found ${models.length} models to process`);

    const results = {
      total: models.length,
      success: 0,
      failed: 0,
      errors: [] as Array<{ modelId: string; error: string }>,
    };

    // Process each model
    for (const model of models) {
      try {
        logger.info(`Generating file for model: ${model.id}`);

        // Generate the file content
        const fileContent = generateModelFile(model as any, "system-migration");

        // Generate the file path
        const fileName = generateFileName(model as any);

        // Call edge function to write the file
        const { data, error: writeError } = await supabase.functions.invoke(
          "write-model-file",
          {
            body: {
              filePath: fileName,
              content: fileContent,
              modelRecordId: model.record_id,
              modelId: model.id,
            },
          }
        );

        if (writeError) throw writeError;

        // Update database with file path
        const { error: updateError } = await supabase
          .from("ai_models")
          .update({ locked_file_path: fileName })
          .eq("record_id", model.record_id);

        if (updateError) throw updateError;

        logger.info(`✅ Successfully generated file for ${model.id}: ${fileName}`);
        results.success++;
      } catch (err) {
        logger.error(`❌ Failed to generate file for ${model.id}:`, err instanceof Error ? err : undefined);
        results.failed++;
        results.errors.push({
          modelId: model.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    logger.info("Model file generation complete", { results });

    return {
      success: results.failed === 0,
      message: `Generated ${results.success} files, ${results.failed} failures`,
      results,
    };
  } catch (err) {
    logger.error("Fatal error in generateAllModelFiles:", err instanceof Error ? err : undefined);
    throw err;
  }
}
