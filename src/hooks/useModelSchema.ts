import { useState, useEffect } from "react";
import type { ModelConfiguration } from "@/types/schema";
import type { ModelJsonSchema } from "@/types/model-schema";
import { logger } from "@/lib/logger";

/**
 * Hook to get the correct schema for a model:
 * - If locked: imports and returns SCHEMA from generated file (frozen at lock time)
 * - If unlocked: returns input_schema from database (live, can be edited)
 * 
 * This ensures locked models are immune to schema changes in the database.
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

    // If model is locked, dynamically import the generated file
    if (model.is_locked && model.locked_file_path) {
      setLoading(true);
      setError(null);
      
      logger.info(`Loading schema from locked model file: ${model.id} at ${model.locked_file_path}`);

      import(`@/lib/models/locked/${model.locked_file_path}`)
        .then((module) => {
          if (!module.SCHEMA) {
            throw new Error("Locked file missing SCHEMA export");
          }
          
          logger.info(`Loaded schema from locked file: ${model.id} (prompt=${module.SCHEMA.usePromptRenderer}, image=${module.SCHEMA.useImageRenderer}, fields=${Object.keys(module.SCHEMA.properties || {}).length})`);
          
          setSchema(module.SCHEMA as ModelJsonSchema);
          setLoading(false);
        })
        .catch((err) => {
          logger.error(`Failed to load locked schema for ${model.id}: ${err.message}`);
          
          // Fallback to database schema
          setSchema(model.input_schema as ModelJsonSchema);
          setError(err);
          setLoading(false);
        });
    } else {
      // Unlocked model: use database schema (can be edited in admin UI)
      logger.info(`Using database schema for unlocked model: ${model.id}`);
      
      setSchema(model.input_schema as ModelJsonSchema);
      setLoading(false);
      setError(null);
    }
  }, [model?.record_id, model?.is_locked, model?.locked_file_path]);

  return { schema, loading, error };
};
