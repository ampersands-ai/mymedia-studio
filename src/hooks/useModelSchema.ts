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

    // Only log in development mode to avoid exposing sensitive model metadata
    if (process.env.NODE_ENV === 'development') {
      logger.debug(`Loading schema for model: ${model.model_name}`);
    }

    // Import directly from physical file via registry
    (async () => {
      try {
        const registry = await import("@/lib/models/locked");
        const modelModule = registry.getModelModule(model.record_id, model.id);

        if (!modelModule) {
          throw new Error(`Model file not found for ${model.model_name}. Generate the file first.`);
        }

        if (!modelModule.SCHEMA) {
          throw new Error(`Model file for ${model.model_name} is missing SCHEMA export`);
        }

        // Only log detailed info in development
        if (process.env.NODE_ENV === 'development') {
          logger.debug(`Loaded schema for ${model.model_name} (${Object.keys(modelModule.SCHEMA.properties || {}).length} fields)`);
        }

        setSchema(modelModule.SCHEMA as ModelJsonSchema);
        setLoading(false);
      } catch (err) {
        logger.error(`Failed to load schema: ${(err as Error).message}`, err as Error, {
          component: 'useModelSchema',
          operation: 'loadSchema',
          modelName: model.model_name
        });
        setError(err as Error);
        setLoading(false);
      }
    })();
  }, [model?.record_id, model?.id]);

  return { schema, loading, error };
};
