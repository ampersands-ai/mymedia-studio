import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ModelHealthSummary } from "@/types/admin/model-health";

export const useModelHealth = () => {
  return useQuery({
    queryKey: ["model-health-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("model_health_summary")
        .select("*")
        .order("model_name");

      if (error) throw error;
      return data as ModelHealthSummary[];
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });
};
