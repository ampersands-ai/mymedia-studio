import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logger, generateRequestId } from "@/lib/logger";
import { handleError, GenerationError } from "@/lib/errors";
import {
  WorkflowExecutionParams,
  WorkflowExecutionResult,
  WorkflowExecutionParamsSchema,
  WorkflowExecutionStateSchema,
  WorkflowProgress,
} from "@/types/workflow";

const workflowLogger = logger.child({ component: 'useWorkflowExecution' });

export const useWorkflowExecution = () => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [progress, setProgress] = useState<WorkflowProgress | null>(null);

  const executeWorkflow = async (
    params: WorkflowExecutionParams,
    shouldGenerateCaption: boolean = false
  ): Promise<WorkflowExecutionResult | null> => {
    const requestId = generateRequestId();
    const timer = workflowLogger.startTimer('executeWorkflow', { 
      requestId,
      workflow_template_id: params.workflow_template_id 
    });
    
    setIsExecuting(true);
    setProgress(null);

    try {
      // Validate input parameters
      const validatedParams = WorkflowExecutionParamsSchema.parse(params);
      // Start the workflow (kickoff only)
      const { data, error } = await supabase.functions.invoke('workflow-executor', {
        body: validatedParams,
      });

      if (error) {
        const handledError = handleError(error, {
          requestId,
          component: 'useWorkflowExecution',
          operation: 'executeWorkflow'
        });
        throw handledError;
      }

      const executionId = data?.execution_id;
      
      if (!executionId) {
        workflowLogger.error('No execution ID returned from workflow executor', undefined, { requestId });
        throw new GenerationError('NO_EXECUTION_ID', 'No execution ID returned from workflow');
      }

      workflowLogger.info('Workflow execution started', { 
        requestId, 
        executionId,
        workflow_template_id: params.workflow_template_id 
      });

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
              try {
                // Validate execution state
                const execution = WorkflowExecutionStateSchema.parse(payload.new);
                
                workflowLogger.info('Realtime workflow update received', {
                  requestId,
                  executionId,
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
                timer.end({ 
                  success: true, 
                  final_output_url: execution.final_output_url,
                  tokens_used: execution.tokens_used 
                });
                
                workflowLogger.info('Workflow completed successfully', {
                  requestId,
                  executionId,
                  final_output_url: execution.final_output_url,
                  tokens_used: execution.tokens_used
                });
                
                // Generate caption if requested (fire and forget)
                if (shouldGenerateCaption && params.user_inputs.prompt) {
                  (async () => {
                    try {
                      await supabase.functions.invoke('generate-caption', {
                        body: {
                          generation_id: executionId,
                          prompt: params.user_inputs.prompt,
                          content_type: 'image',
                          model_name: 'workflow'
                        }
                      });
                      workflowLogger.info('Caption generation initiated', { requestId, executionId });
                    } catch (captionError) {
                      workflowLogger.error('Caption generation failed', captionError as Error, {
                        requestId,
                        executionId
                      });
                      // Don't throw - caption is optional, don't fail workflow
                    }
                  })();
                }
                
                supabase.removeChannel(channel);
                setIsExecuting(false);
                resolve({
                  execution_id: executionId,
                  status: 'completed',
                  final_output_url: execution.final_output_url as string,
                  tokens_used: (execution.tokens_used as number) || 0,
                });
              }

              // Check for failure
              if (execution.status === 'failed') {
                workflowLogger.error('Workflow execution failed', new Error(execution.error_message as string), {
                  requestId,
                  executionId,
                  error_message: execution.error_message
                });
                supabase.removeChannel(channel);
                setIsExecuting(false);
                reject(new Error((execution.error_message as string) || 'Workflow execution failed'));
              }

              // Check for cancellation
              if (execution.status === 'cancelled') {
                workflowLogger.warn('Workflow execution cancelled', { requestId, executionId });
                supabase.removeChannel(channel);
                setIsExecuting(false);
                reject(new Error('Workflow execution cancelled'));
              }
              } catch (error) {
                workflowLogger.error('Error processing realtime update', error as Error, {
                  requestId,
                  executionId,
                });
              }
            }
          )
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              workflowLogger.info('Subscribed to realtime workflow updates', { requestId, executionId });
              
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
                  workflowLogger.info('Workflow already completed on subscription', { 
                    requestId, 
                    executionId,
                    final_output_url: currentExecution.final_output_url 
                  });
                  supabase.removeChannel(channel);
                  setIsExecuting(false);
                  resolve({
                    execution_id: executionId,
                    status: 'completed',
                    final_output_url: currentExecution.final_output_url,
                    tokens_used: currentExecution.tokens_used || 0,
                  });
                } else if (currentExecution.status === 'failed') {
                  workflowLogger.error('Workflow already failed on subscription', 
                    new Error(currentExecution.error_message || 'Unknown error'), 
                    { requestId, executionId }
                  );
                  supabase.removeChannel(channel);
                  setIsExecuting(false);
                  reject(new Error(currentExecution.error_message || 'Workflow execution failed'));
                } else if (currentExecution.status === 'cancelled') {
                  workflowLogger.warn('Workflow already cancelled on subscription', { requestId, executionId });
                  supabase.removeChannel(channel);
                  setIsExecuting(false);
                  reject(new Error('Workflow execution cancelled'));
                }
              }
            }
          });

        // Safety timeout (20 minutes)
        const timeout = setTimeout(() => {
          workflowLogger.warn('Workflow execution timed out', { 
            requestId, 
            executionId,
            timeout_minutes: 20 
          });
          supabase.removeChannel(channel);
          setIsExecuting(false);
          reject(new Error('Workflow execution timed out after 20 minutes. Check your generations history.'));
        }, 20 * 60 * 1000);

        // Store cleanup function
        const originalResolve = resolve;
        const originalReject = reject;
        resolve = (value: WorkflowExecutionResult | null) => {
          clearTimeout(timeout);
          originalResolve(value);
        };
        reject = (error: Error) => {
          clearTimeout(timeout);
          originalReject(error);
        };
      });
      
    } catch (error) {
      const err = error as Error;
      workflowLogger.error('Workflow execution error', err, { 
        requestId,
        workflow_template_id: params.workflow_template_id 
      });
      
      let errorMessage = 'Failed to execute workflow';
      if (err.message?.includes('Missing required parameter')) {
        errorMessage = `Configuration error: ${err.message}`;
      } else if (err.message?.includes('timed out')) {
        errorMessage = err.message;
      } else if (err.message) {
        errorMessage = err.message;
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
