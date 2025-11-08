import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ModelTestResult } from "@/types/admin/model-health";

export const useFlowTracking = (testResultId: string | null) => {
  return useQuery({
    queryKey: ["flow-tracking", testResultId],
    queryFn: async () => {
      if (!testResultId) return null;

      const { data, error } = await supabase
        .from("model_test_results")
        .select("*")
        .eq("id", testResultId)
        .single();

      if (error) throw error;
      
      // Parse flow_steps from Json[] to FlowStep[]
      const flowSteps = Array.isArray(data?.flow_steps) 
        ? data.flow_steps.map(step => typeof step === 'string' ? JSON.parse(step) : step)
        : [];
      
      return {
        ...data,
        flow_steps: flowSteps,
      } as ModelTestResult;
    },
    enabled: !!testResultId,
    refetchInterval: (query) => {
      // Poll every 2 seconds while test is running
      const data = query.state.data;
      return data?.status === 'running' ? 2000 : false;
    },
  });
};
