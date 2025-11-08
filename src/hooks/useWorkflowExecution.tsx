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
      // Start the workflow
      const { data, error } = await supabase.functions.invoke('workflow-executor', {
        body: params,
      });

      if (error) throw error;

      const executionId = data?.execution_id;
      
      if (!executionId) {
        throw new Error('No execution ID returned');
      }

      // Poll for completion
      let attempts = 0;
      const maxAttempts = 60; // 60 attempts * 2 seconds = 2 minutes max
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        
        const status = await pollExecutionStatus(executionId);
        
        if (status?.status === 'completed' && status.final_output_url) {
          return {
            execution_id: executionId,
            status: 'completed',
            final_output_url: status.final_output_url,
            tokens_used: status.tokens_used || 0
          };
        }
        
        if (status?.status === 'failed') {
          throw new Error('Workflow execution failed');
        }

        if (status?.status === 'cancelled') {
          throw new Error('Workflow execution cancelled');
        }
        
        attempts++;
      }
      
      throw new Error('Workflow execution timed out');
      
    } catch (error: any) {
      console.error('Workflow execution error:', error);
      
      let errorMessage = 'Failed to execute workflow';
      if (error.message?.includes('Missing required parameter')) {
        errorMessage = `Configuration error: ${error.message}`;
      } else if (error.message?.includes('timed out')) {
        errorMessage = 'Workflow is taking longer than expected. Check the backend for status.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage, { duration: 5000 });
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
