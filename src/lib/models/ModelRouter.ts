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
    logger.info("Executing model from database", {
      modelId: model.id,
      hasContent: !!model.locked_file_contents,
    });

    if (!model.locked_file_contents) {
      throw new Error(`Model ${model.id} has no locked_file_contents. Regenerate the model.`);
    }

    // Create data URL from stored TypeScript code
    const code = model.locked_file_contents;
    const dataUrl = `data:text/javascript;base64,${btoa(code)}`;
    
    // Dynamic import from data URL
    const modelModule = await import(/* @vite-ignore */ dataUrl) as ModelExecutor;

    if (!modelModule.execute) {
      throw new Error(`Model code for ${model.id} is missing execute() function`);
    }

    // Execute using the model code
    const generationId = await modelModule.execute(params);
    
    return generationId;
  } catch (error) {
    logger.error("Failed to execute model", error instanceof Error ? error : undefined, {
      modelId: model.id,
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    throw new Error(`Model execution failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
