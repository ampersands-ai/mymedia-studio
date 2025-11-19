import { useState, useEffect } from "react";
import type { ModelConfiguration } from "@/types/schema";
import type { ModelJsonSchema } from "@/types/model-schema";
import { logger } from "@/lib/logger";

/**
 * Hook to load model schema from physical .ts file
 * ALL models use physical files as single source of truth (NO dynamic imports)
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

    setLoading(true);
    setError(null);
    
    logger.info(`Loading schema from physical file: ${model.record_id}`);

    // Import directly from physical file via registry
    import("@/lib/models/locked")
      .then((registry) => {
        const modelModule = registry.getModelModule(model.record_id, model.id);
        
        if (!modelModule) {
          throw new Error(`Model file not found for ${model.model_name} (${model.record_id}). Generate the file first.`);
        }
        
        if (!modelModule.SCHEMA) {
          throw new Error(`Model file for ${model.id} is missing SCHEMA export`);
        }
        
        logger.info(`Loaded schema from physical file: ${model.id} (fields=${Object.keys(modelModule.SCHEMA.properties || {}).length})`);
        
        setSchema(modelModule.SCHEMA as ModelJsonSchema);
        setLoading(false);
      })
      .catch((err) => {
        logger.error(`Failed to load schema for ${model.id}: ${err.message}`);
        setError(err);
        setLoading(false);
      });
  }, [model?.record_id, model?.id]);

  return { schema, loading, error };
};
