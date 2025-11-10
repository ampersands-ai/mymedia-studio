import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AIModel {
  record_id: string;
  id: string;
  provider: string;
  model_name: string;
  content_type: string;
  base_token_cost: number;
  cost_multipliers: any;
  input_schema: any;
  api_endpoint: string | null;
  is_active: boolean;
  groups?: any;
  payload_structure?: string;
  max_images?: number | null;
  estimated_time_seconds?: number | null;
  logo_url?: string | null;
  default_outputs?: number | null;
  model_family?: string | null;
  variant_name?: string | null;
  display_order_in_family?: number | null;
}

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

// Hook for fetching a single model by record_id (including inactive models for testing)
export const useModelByRecordId = (recordId: string | undefined) => {
  return useQuery({
    queryKey: ["ai-model", recordId],
    queryFn: async () => {
      if (!recordId) return null;
      
      const { data, error } = await supabase
        .from("ai_models")
        .select("*")
        .eq("record_id", recordId)
        .maybeSingle();

      if (error) throw error;
      return data as AIModel | null;
    },
    enabled: !!recordId,
    staleTime: 30 * 1000,
    gcTime: 60 * 1000,
  });
};
