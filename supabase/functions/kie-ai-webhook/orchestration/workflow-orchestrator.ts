/**
 * Multi-step workflow orchestration
 *
 * ADR 007: Uses model registry for schema instead of database
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../../_shared/edge-logger.ts";
import { getModel } from "../../_shared/registry/index.ts";
import { GENERATION_STATUS } from "../../_shared/constants.ts";
import {
  replaceTemplateVariables,
  resolveInputMappings,
  coerceParametersToSchema,
  sanitizeParametersForProviders,
} from "./parameter-resolver.ts";

interface Generation {
  id: string;
  workflow_execution_id?: string;
  workflow_step_number?: number;
  storage_path?: string | null;
  tokens_used?: number;
}

export async function orchestrateWorkflow(
  generation: Generation,
  storagePath: string | null,
  isMultiOutput: boolean,
  supabase: SupabaseClient
): Promise<void> {
  const logger = new EdgeLogger('workflow-orchestrator', crypto.randomUUID());
  
  if (!generation.workflow_execution_id || !generation.workflow_step_number) {
    return; // Not part of a workflow
  }

  logger.info('Generation is part of workflow', { 
    metadata: { 
      workflowExecutionId: generation.workflow_execution_id, 
      completedStep: generation.workflow_step_number 
    } 
  });

  try {
    // Fetch workflow execution and template
    const { data: workflowExecution, error: execError } = await supabase
      .from('workflow_executions')
      .select('*, workflow_templates(*)')
      .eq('id', generation.workflow_execution_id)
      .single();

    if (execError || !workflowExecution) {
      logger.error('Failed to fetch workflow execution', execError as Error);
      return;
    }

    const currentStepNumber = generation.workflow_step_number;
    const template = workflowExecution.workflow_templates as Record<string, unknown>;
    const steps = (template.workflow_steps as unknown[]) || [];
    const totalSteps = steps.length;
    const currentStep = steps.find((s: Record<string, unknown>) => s.step_number === currentStepNumber);

    logger.info('Current step status', { 
      metadata: { currentStep: currentStepNumber, totalSteps } 
    });

    // Determine output storage path
    let stepOutputPath = storagePath || generation.storage_path;
    if (!stepOutputPath && isMultiOutput) {
      const { data: firstChild } = await supabase
        .from('generations')
        .select('storage_path, output_url')
        .eq('parent_generation_id', generation.id)
        .eq('output_index', 0)
        .maybeSingle();
      stepOutputPath = firstChild?.storage_path || firstChild?.output_url || null;
      logger.debug('Multi-output: using first child path', { 
        metadata: { stepOutputPath } 
      });
    }

    // Update step_outputs
    const existingOutputs = (workflowExecution.step_outputs as Record<string, unknown>) || {};
    const updatedOutputs = {
      ...existingOutputs,
      [`step${currentStepNumber}`]: {
        [(currentStep as Record<string, unknown>)?.output_key as string || 'output']: stepOutputPath,
        generation_id: generation.id,
      },
    };

    const currentTokens = (workflowExecution.tokens_used as number) || 0;
    const newTokens = currentTokens + (generation.tokens_used || 0);

    // Check if there are more steps
    if (currentStepNumber < totalSteps) {
      const nextStepNumber = currentStepNumber + 1;
      const nextStep = steps.find((s: Record<string, unknown>) => s.step_number === nextStepNumber) as Record<string, unknown> | undefined;

      if (!nextStep) {
        logger.error('Next step not found in workflow', new Error('Missing step'), {
          metadata: { nextStepNumber, totalSteps }
        });
        await supabase
          .from('workflow_executions')
          .update({
            status: GENERATION_STATUS.FAILED,
            error_message: `Step ${nextStepNumber} not found in workflow template`,
          })
          .eq('id', generation.workflow_execution_id);
        return;
      }

      logger.info('Starting next step', {
        metadata: { nextStepNumber, totalSteps }
      });

      await supabase
        .from('workflow_executions')
        .update({
          step_outputs: updatedOutputs,
          tokens_used: newTokens,
          current_step: nextStepNumber,
        })
        .eq('id', generation.workflow_execution_id);

      // Build context and resolve parameters
      const context = {
        user: workflowExecution.user_inputs,
        ...updatedOutputs,
      };

      const resolvedMappings = resolveInputMappings(nextStep.input_mappings || {}, context);
      const allParameters = { ...nextStep.parameters, ...resolvedMappings };

      // Coerce parameters to schema
      let coercedParameters = allParameters;
      try {
        if (nextStep.model_record_id) {
          // ADR 007: Get schema from model registry instead of database
          const model = await getModel(nextStep.model_record_id);
          if (model.SCHEMA) {
            coercedParameters = coerceParametersToSchema(allParameters, model.SCHEMA);
          }
        }
      } catch (e) {
        logger.warn('Schema coercion skipped', {
          metadata: { error: e instanceof Error ? e.message : String(e) }
        });
      }

      const sanitizedParameters = await sanitizeParametersForProviders(
        coercedParameters,
        workflowExecution.user_id,
        supabase
      );

      // Generate prompt
      let resolvedPrompt: string;
      if (sanitizedParameters.prompt) {
        const promptString = typeof sanitizedParameters.prompt === 'string'
          ? sanitizedParameters.prompt
          : String(sanitizedParameters.prompt);
        resolvedPrompt = replaceTemplateVariables(promptString, context);
      } else {
        resolvedPrompt = replaceTemplateVariables(nextStep.prompt_template, context);
      }

      logger.info('Resolved prompt for next step', { 
        metadata: { nextStepNumber, prompt: resolvedPrompt.substring(0, 100) } 
      });

      // Start next step
      const generateResponse = await supabase.functions.invoke('generate-content', {
        body: {
          model_id: nextStep.model_id,
          model_record_id: nextStep.model_record_id,
          prompt: resolvedPrompt,
          custom_parameters: sanitizedParameters,
          workflow_execution_id: generation.workflow_execution_id,
          workflow_step_number: nextStepNumber,
        },
      });

      if (generateResponse.error) {
        logger.error('Failed to start next step', generateResponse.error, { 
          metadata: { nextStepNumber } 
        });
        await supabase
          .from('workflow_executions')
          .update({
            status: GENERATION_STATUS.FAILED,
            error_message: `Step ${nextStepNumber} failed to start: ${generateResponse.error.message}`,
          })
          .eq('id', generation.workflow_execution_id);
      } else {
        logger.info('Next step started successfully', { 
          metadata: { nextStepNumber } 
        });
      }
    } else {
      // All steps completed
      logger.info('All steps completed - finalizing workflow');

      const finalOutput = updatedOutputs[`step${totalSteps}`];
      const finalOutputUrl = finalOutput
        ? finalOutput[Object.keys(finalOutput).find(k => k !== 'generation_id') || 'output']
        : null;

      logger.info('Final output URL determined', { metadata: { finalOutputUrl } });

      await supabase
        .from('workflow_executions')
        .update({
          status: GENERATION_STATUS.COMPLETED,
          step_outputs: updatedOutputs,
          tokens_used: newTokens,
          final_output_url: finalOutputUrl,
          completed_at: new Date().toISOString(),
        })
        .eq('id', generation.workflow_execution_id);

      logger.info('Workflow execution completed', {
        metadata: { workflowExecutionId: generation.workflow_execution_id }
      });
    }
  } catch (orchestrationError) {
    const err = orchestrationError instanceof Error ? orchestrationError : new Error(String(orchestrationError));
    logger.error('Error in workflow orchestration', err);
    // Don't fail the entire webhook - the generation is complete
  }
}
