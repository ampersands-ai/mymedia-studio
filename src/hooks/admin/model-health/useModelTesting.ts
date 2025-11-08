import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TestModelParams {
  modelRecordId: string;
  testConfig?: any;
}

interface BatchTestParams {
  modelRecordIds: string[];
}

export const useModelTesting = () => {
  const queryClient = useQueryClient();

  const testModel = useMutation({
    mutationFn: async ({ modelRecordId, testConfig }: TestModelParams) => {
      const { data, error } = await supabase.functions.invoke("test-model", {
        body: { modelRecordId, testConfig },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["model-health-summary"] });
      queryClient.invalidateQueries({ queryKey: ["model-test-history"] });
      
      if (data.success) {
        toast.success("Test completed successfully", {
          description: `Latency: ${(data.timing.total / 1000).toFixed(1)}s`,
        });
      } else {
        toast.error("Test failed", {
          description: data.error || "Unknown error",
        });
      }
    },
    onError: (error: Error) => {
      toast.error("Test execution failed", {
        description: error.message,
      });
    },
  });

  const batchTest = useMutation({
    mutationFn: async ({ modelRecordIds }: BatchTestParams) => {
      const { data, error } = await supabase.functions.invoke("batch-test-models", {
        body: { modelRecordIds },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["model-health-summary"] });
      queryClient.invalidateQueries({ queryKey: ["model-test-history"] });
      
      toast.success("Batch test completed", {
        description: `${data.successful} successful, ${data.failed} failed`,
      });
    },
    onError: (error: Error) => {
      toast.error("Batch test failed", {
        description: error.message,
      });
    },
  });

  return {
    testModel,
    batchTest,
  };
};
