import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ModelTestResult } from "@/types/admin/model-health";

interface UseTestHistoryParams {
  modelRecordId?: string;
  limit?: number;
  offset?: number;
}

export const useTestHistory = ({ 
  modelRecordId, 
  limit = 50, 
  offset = 0 
}: UseTestHistoryParams = {}) => {
  return useQuery({
    queryKey: ["model-test-history", modelRecordId, limit, offset],
    queryFn: async () => {
      let query = supabase
        .from("model_test_results")
        .select(`
          *,
          ai_models!inner(model_name, provider, content_type)
        `)
        .order("test_started_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (modelRecordId) {
        query = query.eq("model_record_id", modelRecordId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Parse flow_steps from Json[] to FlowStep[] for each result
      return data.map(item => ({
        ...item,
        flow_steps: Array.isArray(item.flow_steps) 
          ? item.flow_steps.map((step: any) => typeof step === 'string' ? JSON.parse(step) : step)
          : [],
      })) as (ModelTestResult & { ai_models: { model_name: string; provider: string; content_type: string } })[];
    },
  });
};
