import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AIModelComplete {
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
  groups?: Record<string, unknown> | null;
  payload_structure?: string;
  max_images?: number | null;
  estimated_time_seconds?: number | null;
  logo_url?: string | null;
  default_outputs?: number | null;
  model_family?: string | null;
  variant_name?: string | null;
  display_order_in_family?: number | null;
}

export const useAllModels = () => {
  return useQuery<AIModelComplete[]>({
    queryKey: ["all-ai-models"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_models")
        .select("*")
        .order("provider", { ascending: true })
        .order("model_name", { ascending: true });

      if (error) throw error;
      return (data || []) as AIModelComplete[];
    },
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};
