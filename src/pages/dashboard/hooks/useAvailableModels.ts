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
 * Convert contentType to user-friendly label
 */
const getContentTypeLabel = (contentType: string): string => {
  const labelMap: Record<string, string> = {
    'prompt_to_image': 'Text to Image',
    'image_editing': 'Image Editing',
    'image_to_video': 'Image to Video',
    'prompt_to_video': 'Text to Video',
    'video_to_video': 'Video to Video',
    'lip_sync': 'Lip Sync',
    'prompt_to_audio': 'Audio',
  };
  return labelMap[contentType] || contentType;
};

/**
 * Fetches distinct models that the user has used in their generation history.
 * This provides a filtered list of models relevant to the user's content.
 * Deduplicates by model name and includes content type prefix.
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

      // Enrich with model names from registry and deduplicate by display name
      const seenNames = new Set<string>();
      const models: AvailableModel[] = [];

      for (const modelId of uniqueModelIds) {
        try {
          const model = getModel(modelId);
          const contentTypeLabel = getContentTypeLabel(model.MODEL_CONFIG.contentType);
          const displayName = `${contentTypeLabel}: ${model.MODEL_CONFIG.modelName}`;
          
          // Only add if we haven't seen this display name before
          if (!seenNames.has(displayName)) {
            seenNames.add(displayName);
            models.push({
              id: modelId,
              name: displayName,
            });
          }
        } catch {
          // Model not found in registry, skip it
        }
      }

      // Sort alphabetically by display name
      return models.sort((a, b) => a.name.localeCompare(b.name));
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};