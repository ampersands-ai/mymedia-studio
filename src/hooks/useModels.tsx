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
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
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
