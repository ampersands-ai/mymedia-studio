/**
 * Model Router - Directs execution to locked model files or dynamic system
 * 
 * When a model is locked, it uses a dedicated generated TypeScript file
 * When unlocked, it uses the standard dynamic executeGeneration flow
 */

import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { logger } from "@/lib/logger";

interface LockedModelExecutor {
  execute: (params: ExecuteGenerationParams) => Promise<string>;
}

/**
 * Route model generation to locked file or dynamic system
 */
export async function executeModelGeneration(
  params: ExecuteGenerationParams
): Promise<string> {
  const { model } = params;

  // Validate locked model has file path
  if (!model.locked_file_path) {
    logger.error("Locked model missing file path", undefined, { modelId: model.id });
    throw new Error(`Locked model ${model.id} is missing locked_file_path`);
  }

  try {
    // Dynamically import the locked model file
    const lockedModelPath = `/src/lib/models/locked/${model.locked_file_path}`;
    
    logger.info("Using locked model file", {
      modelId: model.id,
      filePath: lockedModelPath,
    });

    // Import the locked model executor
    const lockedModel = await import(
      /* @vite-ignore */
      lockedModelPath
    ) as LockedModelExecutor;

    if (!lockedModel.execute) {
      throw new Error(
        `Locked model file ${model.locked_file_path} is missing execute() function`
      );
    }

    // Execute using the isolated locked model
    const generationId = await lockedModel.execute(params);
    
    return generationId;
  } catch (error) {
    logger.error("Failed to execute locked model", error instanceof Error ? error : undefined, {
      modelId: model.id,
      filePath: model.locked_file_path,
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    // Provide helpful error message
    if (error instanceof Error && error.message.includes("Cannot find module")) {
      throw new Error(
        `Locked model file not found: ${model.locked_file_path}. ` +
        `The model may need to be unlocked and re-locked.`
      );
    }

    throw error;
  }
}
