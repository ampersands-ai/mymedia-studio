import { useState, useEffect } from "react";
import type { ModelConfiguration } from "@/types/schema";
import type { ModelJsonSchema } from "@/types/model-schema";
import { logger } from "@/lib/logger";

/**
 * Hook to load model schema from generated .ts file
 * ALL models (locked and unlocked) now use .ts files as source of truth
 */
export const useModelSchema = (model: ModelConfiguration | null) => {
  const [schema, setSchema] = useState<ModelJsonSchema | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!model) {
      setSchema(null);
      setLoading(false);
      setError(null);
      return;
    }

    // All models must have code content
    if (!model.locked_file_contents) {
      const err = new Error(`Model ${model.id} is missing locked_file_contents. Regenerate the model.`);
      logger.error(err.message);
      setError(err);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    logger.info(`Loading schema from model code: ${model.id}`);

    // Import from data URL (code stored in database)
    const code = model.locked_file_contents;
    const dataUrl = `data:text/javascript;base64,${btoa(code)}`;
    
    import(/* @vite-ignore */ dataUrl)
      .then((module) => {
        if (!module.SCHEMA) {
          throw new Error(`Model code for ${model.id} is missing SCHEMA export`);
        }
        
        logger.info(`Loaded schema from database: ${model.id} (fields=${Object.keys(module.SCHEMA.properties || {}).length})`);
        
        setSchema(module.SCHEMA as ModelJsonSchema);
        setLoading(false);
      })
      .catch((err) => {
        logger.error(`Failed to load schema for ${model.id}: ${err.message}`);
        setError(err);
        setLoading(false);
      });
  }, [model?.record_id, model?.locked_file_contents]);

  return { schema, loading, error };
};
