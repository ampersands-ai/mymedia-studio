/**
 * Model Router - Executes model generation from .ts files
 * ALL models (locked and unlocked) use their respective .ts files
 */

import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { logger } from "@/lib/logger";

interface ModelExecutor {
  execute: (params: ExecuteGenerationParams) => Promise<string>;
}

/**
 * Execute model generation from .ts file
 */
export async function executeModelGeneration(
  params: ExecuteGenerationParams
): Promise<string> {
  const { model } = params;

  if (!model.locked_file_path) {
    throw new Error(`Model ${model.id} is missing locked_file_path. Regenerate the model file.`);
  }

  try {
    logger.info("Executing model from file", {
      modelId: model.id,
      filePath: model.locked_file_path,
    });

    // Import the model file
    const modelModule = await import(
      /* @vite-ignore */
      `@/lib/models/${model.locked_file_path}`
    ) as ModelExecutor;

    if (!modelModule.execute) {
      throw new Error(`Model file ${model.locked_file_path} is missing execute() function`);
    }

    // Execute using the model file
    const generationId = await modelModule.execute(params);
    
    return generationId;
  } catch (error) {
    logger.error("Failed to execute model", error instanceof Error ? error : undefined, {
      modelId: model.id,
      filePath: model.locked_file_path,
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    throw new Error(`Model execution failed. Check if file exists: ${model.locked_file_path}`);
  }
}
