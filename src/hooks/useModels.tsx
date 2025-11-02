import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AIModel } from "./useTemplates";

export const useModels = () => {
  return useQuery({
    queryKey: ["ai-models"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_models")
        .select("*")
        .eq("is_active", true)
        .order("content_type", { ascending: true });

      if (error) throw error;
      return data as AIModel[];
    },
    staleTime: 30 * 1000, // 30 seconds (reduced from 5 minutes to prevent stale cache)
    gcTime: 60 * 1000, // 1 minute (reduced from 10 minutes)
  });
};

export const useModelsByContentType = () => {
  const { data: models, ...rest } = useModels();

  const modelsByContentType = models?.reduce((acc, model) => {
    const contentType = model.content_type;
    if (!acc[contentType]) {
      acc[contentType] = [];
    }
    acc[contentType].push(model);
    return acc;
  }, {} as Record<string, AIModel[]>);

  return { modelsByContentType, models, ...rest };
};
