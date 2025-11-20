/**
 * useAIModelsDB Hook - DATABASE-BACKED MODEL MANAGEMENT
 *
 * This hook provides direct database access for admin model management.
 * Unlike useModels (which reads from TypeScript registry files), this hook:
 * - Reads from the ai_models database table
 * - Supports full CRUD operations (Create, Read, Update, Delete)
 * - Provides immediate updates without requiring scripts
 * - Includes all model fields for complete control
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

export interface AIModelDB {
  record_id: string;
  id: string;
  provider: string;
  model_name: string;
  content_type: string;
  base_token_cost: number;
  cost_multipliers: Record<string, unknown> | null;
  input_schema: Record<string, unknown> | null;
  api_endpoint: string | null;
  is_active: boolean;
  groups: string[] | null;
  payload_structure: string;
  max_images: number | null;
  estimated_time_seconds: number | null;
  default_outputs: number | null;
  logo_url: string | null;
  model_family: string | null;
  variant_name: string | null;
  display_order_in_family: number | null;
  is_locked: boolean;
  locked_at: string | null;
  locked_by: string | null;
  locked_file_path: string | null;
  locked_file_contents: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch all models from database (for admin management)
 */
export const useAIModelsDB = () => {
  return useQuery<AIModelDB[]>({
    queryKey: ["ai-models-db"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_models")
        .select("*")
        .order("model_name", { ascending: true });

      if (error) {
        logger.error("Failed to fetch models from database", error, {
          component: "useAIModelsDB",
          operation: "fetchModels",
        });
        throw error;
      }

      return data || [];
    },
    staleTime: 30 * 1000, // 30 seconds
  });
};

/**
 * Fetch single model by record_id
 */
export const useAIModelDB = (recordId: string | undefined) => {
  return useQuery<AIModelDB | null>({
    queryKey: ["ai-model-db", recordId],
    queryFn: async () => {
      if (!recordId) return null;

      const { data, error } = await supabase
        .from("ai_models")
        .select("*")
        .eq("record_id", recordId)
        .single();

      if (error) {
        logger.error("Failed to fetch model from database", error, {
          component: "useAIModelDB",
          operation: "fetchModel",
          recordId,
        });
        throw error;
      }

      return data;
    },
    enabled: !!recordId,
  });
};

/**
 * Create new model
 */
export const useCreateAIModel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (model: Partial<AIModelDB>) => {
      const { data, error } = await supabase
        .from("ai_models")
        .insert([model])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-models-db"] });
      toast.success("Model created successfully");
    },
    onError: (error: any) => {
      logger.error("Failed to create model", error, {
        component: "useCreateAIModel",
      });
      toast.error(`Failed to create model: ${error.message}`);
    },
  });
};

/**
 * Update existing model
 */
export const useUpdateAIModel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      recordId,
      updates,
    }: {
      recordId: string;
      updates: Partial<AIModelDB>;
    }) => {
      const { data, error } = await supabase
        .from("ai_models")
        .update(updates)
        .eq("record_id", recordId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["ai-models-db"] });
      queryClient.invalidateQueries({
        queryKey: ["ai-model-db", variables.recordId],
      });
      toast.success("Model updated successfully");
    },
    onError: (error: any) => {
      logger.error("Failed to update model", error, {
        component: "useUpdateAIModel",
      });
      toast.error(`Failed to update model: ${error.message}`);
    },
  });
};

/**
 * Toggle model active status
 */
export const useToggleModelStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      recordId,
      isActive,
    }: {
      recordId: string;
      isActive: boolean;
    }) => {
      const { data, error} = await supabase
        .from("ai_models")
        .update({ is_active: isActive })
        .eq("record_id", recordId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-models-db"] });
      toast.success("Model status updated");
    },
    onError: (error: any) => {
      logger.error("Failed to toggle model status", error, {
        component: "useToggleModelStatus",
      });
      toast.error(`Failed to update status: ${error.message}`);
    },
  });
};

/**
 * Delete model (soft delete - set is_active to false)
 */
export const useDeleteAIModel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recordId: string) => {
      const { error } = await supabase
        .from("ai_models")
        .update({ is_active: false })
        .eq("record_id", recordId);

      if (error) throw error;
      return recordId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-models-db"] });
      toast.success("Model deactivated");
    },
    onError: (error: any) => {
      logger.error("Failed to delete model", error, {
        component: "useDeleteAIModel",
      });
      toast.error(`Failed to deactivate model: ${error.message}`);
    },
  });
};

/**
 * Hard delete model (permanently remove from database)
 */
export const useHardDeleteAIModel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recordId: string) => {
      const { error } = await supabase
        .from("ai_models")
        .delete()
        .eq("record_id", recordId);

      if (error) throw error;
      return recordId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-models-db"] });
      toast.success("Model permanently deleted");
    },
    onError: (error: any) => {
      logger.error("Failed to hard delete model", error, {
        component: "useHardDeleteAIModel",
      });
      toast.error(`Failed to delete model: ${error.message}`);
    },
  });
};

/**
 * Bulk update multiple models
 */
export const useBulkUpdateModels = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Array<{ recordId: string; updates: Partial<AIModelDB> }>) => {
      const promises = updates.map(({ recordId, updates: modelUpdates }) =>
        supabase
          .from("ai_models")
          .update(modelUpdates)
          .eq("record_id", recordId)
      );

      const results = await Promise.all(promises);
      const errors = results.filter((r) => r.error);

      if (errors.length > 0) {
        throw new Error(`Failed to update ${errors.length} model(s)`);
      }

      return results;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["ai-models-db"] });
      toast.success(`Successfully updated ${variables.length} model(s)`);
    },
    onError: (error: any) => {
      logger.error("Failed to bulk update models", error, {
        component: "useBulkUpdateModels",
      });
      toast.error(`Bulk update failed: ${error.message}`);
    },
  });
};
