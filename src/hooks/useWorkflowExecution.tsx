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
    params: WorkflowExecutionParams,
    shouldGenerateCaption: boolean = false
  ): Promise<WorkflowExecutionResult | null> => {
    setIsExecuting(true);
    setProgress(null);

    try {
      // Start the workflow (kickoff only)
      const { data, error } = await supabase.functions.invoke('workflow-executor', {
        body: params,
      });

      if (error) throw error;

      const executionId = data?.execution_id;
      
      if (!executionId) {
        throw new Error('No execution ID returned');
      }

      console.log('[useWorkflowExecution] Workflow started:', executionId);

      // Subscribe to Realtime updates on workflow_executions
      return new Promise((resolve, reject) => {
        const channel = supabase
          .channel(`workflow-execution-${executionId}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'workflow_executions',
              filter: `id=eq.${executionId}`,
            },
            (payload) => {
              const execution = payload.new as any;
              console.log('[Realtime] Workflow execution updated:', {
                id: executionId,
                status: execution.status,
                current_step: execution.current_step,
                total_steps: execution.total_steps,
              });

              // Update progress
              if (execution.current_step && execution.total_steps) {
                setProgress({
                  currentStep: execution.current_step,
                  totalSteps: execution.total_steps,
                });
              }

              // Check for completion
              if (execution.status === 'completed' && execution.final_output_url) {
                console.log('[Realtime] Workflow completed:', execution.final_output_url);
                
                // Generate caption if requested (fire and forget)
                if (shouldGenerateCaption && params.user_inputs.prompt) {
                  supabase.functions.invoke('generate-caption', {
                    body: {
                      generation_id: executionId,
                      prompt: params.user_inputs.prompt,
                      content_type: 'image',
                      model_name: 'workflow'
                    }
                  }).then(() => {
                    console.log('[Realtime] Caption generation initiated');
                  }).catch((captionError) => {
                    console.error('[Realtime] Caption generation failed:', captionError);
                  });
                }
                
                supabase.removeChannel(channel);
                setIsExecuting(false);
                resolve({
                  execution_id: executionId,
                  status: 'completed',
                  final_output_url: execution.final_output_url,
                  tokens_used: execution.tokens_used || 0,
                });
              }

              // Check for failure
              if (execution.status === 'failed') {
                console.error('[Realtime] Workflow failed:', execution.error_message);
                supabase.removeChannel(channel);
                setIsExecuting(false);
                reject(new Error(execution.error_message || 'Workflow execution failed'));
              }

              // Check for cancellation
              if (execution.status === 'cancelled') {
                console.log('[Realtime] Workflow cancelled');
                supabase.removeChannel(channel);
                setIsExecuting(false);
                reject(new Error('Workflow execution cancelled'));
              }
            }
          )
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              console.log('[Realtime] Subscribed to workflow execution:', executionId);
              
              // Check initial status immediately in case it already completed
              const { data: currentExecution } = await supabase
                .from('workflow_executions')
                .select('status, final_output_url, tokens_used, current_step, total_steps, error_message')
                .eq('id', executionId)
                .single();

              if (currentExecution) {
                if (currentExecution.current_step && currentExecution.total_steps) {
                  setProgress({
                    currentStep: currentExecution.current_step,
                    totalSteps: currentExecution.total_steps,
                  });
                }

                if (currentExecution.status === 'completed' && currentExecution.final_output_url) {
                  console.log('[Realtime] Initial status: completed');
                  supabase.removeChannel(channel);
                  setIsExecuting(false);
                  resolve({
                    execution_id: executionId,
                    status: 'completed',
                    final_output_url: currentExecution.final_output_url,
                    tokens_used: currentExecution.tokens_used || 0,
                  });
                } else if (currentExecution.status === 'failed') {
                  console.error('[Realtime] Initial status: failed');
                  supabase.removeChannel(channel);
                  setIsExecuting(false);
                  reject(new Error(currentExecution.error_message || 'Workflow execution failed'));
                } else if (currentExecution.status === 'cancelled') {
                  console.log('[Realtime] Initial status: cancelled');
                  supabase.removeChannel(channel);
                  setIsExecuting(false);
                  reject(new Error('Workflow execution cancelled'));
                }
              }
            }
          });

        // Safety timeout (20 minutes)
        const timeout = setTimeout(() => {
          console.warn('[Realtime] Workflow execution timed out after 20 minutes');
          supabase.removeChannel(channel);
          setIsExecuting(false);
          reject(new Error('Workflow execution timed out after 20 minutes. Check your generations history.'));
        }, 20 * 60 * 1000);

        // Store cleanup function
        const originalResolve = resolve;
        const originalReject = reject;
        resolve = (value: any) => {
          clearTimeout(timeout);
          originalResolve(value);
        };
        reject = (error: any) => {
          clearTimeout(timeout);
          originalReject(error);
        };
      });
      
    } catch (error: any) {
      console.error('Workflow execution error:', error);
      
      let errorMessage = 'Failed to execute workflow';
      if (error.message?.includes('Missing required parameter')) {
        errorMessage = `Configuration error: ${error.message}`;
      } else if (error.message?.includes('timed out')) {
        errorMessage = error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage, { duration: 5000 });
      setIsExecuting(false);
      setProgress(null);
      return null;
    }
  };

  return {
    executeWorkflow,
    isExecuting,
    progress,
  };
};
