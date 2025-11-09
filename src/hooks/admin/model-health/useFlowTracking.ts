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
      const data = query.state.data;
      if (!data) return false;
      
      // Poll aggressively while running
      if (data.status === 'running') return 1000;
      
      // Poll slower for long waits
      if (data.flow_steps?.some((s: any) => 
        s.step_name.toLowerCase().includes('polling') && s.status === 'running'
      )) {
        return 2000;
      }
      
      // Stop polling when complete
      return false;
    },
  });
};
