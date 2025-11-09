import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TestModelParams {
  modelRecordId: string;
  testConfig?: any;
  parameters?: Record<string, any>;
}

interface BatchTestParams {
  modelRecordIds: string[];
}

interface UseModelTestingOptions {
  enableToasts?: boolean;
}

export const useModelTesting = (options: UseModelTestingOptions = {}) => {
  const { enableToasts = true } = options;
  const queryClient = useQueryClient();

  const testModel = useMutation({
    mutationFn: async ({ modelRecordId, testConfig, parameters }: TestModelParams) => {
      const { data, error } = await supabase.functions.invoke("test-model", {
        body: { modelRecordId, testConfig, parameters },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["model-health-summary"] });
      queryClient.invalidateQueries({ queryKey: ["model-test-history"] });
      
      if (enableToasts) {
        if (data.success) {
          toast.success("Test completed successfully", {
            description: `Latency: ${(data.timing.total / 1000).toFixed(1)}s`,
          });
        } else {
          toast.error("Test failed", {
            description: data.error || "Unknown error",
          });
        }
      }
    },
    onError: (error: Error) => {
      if (enableToasts) {
        toast.error("Test execution failed", {
          description: error.message,
        });
      }
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
      
      if (enableToasts) {
        toast.success("Batch test completed", {
          description: `${data.successful} successful, ${data.failed} failed`,
        });
      }
    },
    onError: (error: Error) => {
      if (enableToasts) {
        toast.error("Batch test failed", {
          description: error.message,
        });
      }
    },
  });

  return {
    testModel,
    batchTest,
  };
};
