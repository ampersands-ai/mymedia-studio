import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WorkflowExecutionParams {
  workflow_template_id: string;
  user_inputs: Record<string, any>;
}

interface WorkflowExecutionResult {
  execution_id: string;
  status: string;
  final_output_url: string | null;
  tokens_used: number;
}

export const useWorkflowExecution = () => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [progress, setProgress] = useState<{
    currentStep: number;
    totalSteps: number;
    stepName?: string;
  } | null>(null);

  const executeWorkflow = async (
    params: WorkflowExecutionParams
  ): Promise<WorkflowExecutionResult | null> => {
    setIsExecuting(true);
    setProgress(null);

    try {
      const { data, error } = await supabase.functions.invoke('workflow-executor', {
        body: params,
      });

      if (error) throw error;

      return data as WorkflowExecutionResult;
    } catch (error: any) {
      console.error('Workflow execution error:', error);
      toast.error(error.message || 'Failed to execute workflow');
      return null;
    } finally {
      setIsExecuting(false);
      setProgress(null);
    }
  };

  const pollExecutionStatus = async (executionId: string) => {
    try {
      const { data, error } = await supabase
        .from('workflow_executions')
        .select('status, current_step, total_steps, final_output_url, tokens_used')
        .eq('id', executionId)
        .single();

      if (error) throw error;

      if (data.current_step && data.total_steps) {
        setProgress({
          currentStep: data.current_step,
          totalSteps: data.total_steps,
        });
      }

      return data;
    } catch (error) {
      console.error('Polling error:', error);
      return null;
    }
  };

  return {
    executeWorkflow,
    pollExecutionStatus,
    isExecuting,
    progress,
  };
};
