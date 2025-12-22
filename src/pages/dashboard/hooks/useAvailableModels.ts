import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getModel } from "@/lib/models/registry";
import { logger } from "@/lib/logger";

interface AvailableModel {
  id: string;
  name: string;
}

/**
 * Fetches distinct models that the user has used in their generation history.
 * This provides a filtered list of models relevant to the user's content.
 */
export const useAvailableModels = () => {
  const { user } = useAuth();

  return useQuery<AvailableModel[]>({
    queryKey: ["available-models", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Fetch distinct model_record_ids from user's generations
      const { data, error } = await supabase
        .from("generations")
        .select("model_record_id")
        .eq("user_id", user.id)
        .not("model_record_id", "is", null);

      if (error) {
        logger.error("Failed to fetch available models", error);
        return [];
      }

      // Get unique model IDs
      const uniqueModelIds = [...new Set(data?.map((g: { model_record_id: string | null }) => g.model_record_id).filter(Boolean) as string[])];

      // Enrich with model names from registry
      const models: AvailableModel[] = uniqueModelIds
        .map((modelId) => {
          try {
            const model = getModel(modelId);
            return {
              id: modelId,
              name: model.MODEL_CONFIG.modelName,
            };
          } catch {
            // Model not found in registry, skip it
            return null;
          }
        })
        .filter((m): m is AvailableModel => m !== null)
        .sort((a, b) => a.name.localeCompare(b.name));

      return models;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};