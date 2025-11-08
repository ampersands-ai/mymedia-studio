/**
 * Multi-step workflow orchestration
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  replaceTemplateVariables,
  resolveInputMappings,
  coerceParametersToSchema,
  sanitizeParametersForProviders,
} from "./parameter-resolver.ts";

export async function orchestrateWorkflow(
  generation: any,
  storagePath: string | null,
  isMultiOutput: boolean,
  supabase: SupabaseClient
): Promise<void> {
  if (!generation.workflow_execution_id || !generation.workflow_step_number) {
    return; // Not part of a workflow
  }

  console.log('[orchestrator] Generation is part of workflow execution:', generation.workflow_execution_id);
  console.log('[orchestrator] Completed step:', generation.workflow_step_number);

  try {
    // Fetch workflow execution and template
    const { data: workflowExecution, error: execError } = await supabase
      .from('workflow_executions')
      .select('*, workflow_templates(*)')
      .eq('id', generation.workflow_execution_id)
      .single();

    if (execError || !workflowExecution) {
      console.error('[orchestrator] Failed to fetch workflow execution:', execError);
      return;
    }

    const currentStepNumber = generation.workflow_step_number;
    const template = workflowExecution.workflow_templates as any;
    const steps = template.workflow_steps as any[];
    const totalSteps = steps.length;
    const currentStep = steps.find((s: any) => s.step_number === currentStepNumber);

    console.log('[orchestrator] Current step:', currentStepNumber, '/', totalSteps);

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
      console.log('[orchestrator] Multi-output: using first child path:', stepOutputPath);
    }

    // Update step_outputs
    const existingOutputs = (workflowExecution.step_outputs as Record<string, any>) || {};
    const updatedOutputs = {
      ...existingOutputs,
      [`step${currentStepNumber}`]: {
        [currentStep?.output_key || 'output']: stepOutputPath,
        generation_id: generation.id,
      },
    };

    const currentTokens = (workflowExecution.tokens_used as number) || 0;
    const newTokens = currentTokens + (generation.tokens_used || 0);

    // Check if there are more steps
    if (currentStepNumber < totalSteps) {
      const nextStepNumber = currentStepNumber + 1;
      const nextStep = steps.find((s: any) => s.step_number === nextStepNumber);
      
      console.log('[orchestrator] More steps remaining. Starting step:', nextStepNumber);

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
          const { data: modelData } = await supabase
            .from('ai_models')
            .select('input_schema')
            .eq('record_id', nextStep.model_record_id)
            .single();
          if (modelData?.input_schema) {
            coercedParameters = coerceParametersToSchema(allParameters, modelData.input_schema);
          }
        }
      } catch (e) {
        console.warn('[orchestrator] Schema coercion skipped:', e);
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

      console.log('[orchestrator] Resolved prompt for step', nextStepNumber, ':', resolvedPrompt);

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
        console.error('[orchestrator] Failed to start next step:', generateResponse.error);
        await supabase
          .from('workflow_executions')
          .update({
            status: 'failed',
            error_message: `Step ${nextStepNumber} failed to start: ${generateResponse.error.message}`,
          })
          .eq('id', generation.workflow_execution_id);
      } else {
        console.log('[orchestrator] Step', nextStepNumber, 'started successfully');
      }
    } else {
      // All steps completed
      console.log('[orchestrator] All steps completed. Finalizing workflow...');

      const finalOutput = updatedOutputs[`step${totalSteps}`];
      const finalOutputUrl = finalOutput
        ? finalOutput[Object.keys(finalOutput).find(k => k !== 'generation_id') || 'output']
        : null;

      console.log('[orchestrator] Final output URL:', finalOutputUrl);

      await supabase
        .from('workflow_executions')
        .update({
          status: 'completed',
          step_outputs: updatedOutputs,
          tokens_used: newTokens,
          final_output_url: finalOutputUrl,
          completed_at: new Date().toISOString(),
        })
        .eq('id', generation.workflow_execution_id);

      console.log('[orchestrator] Workflow execution completed:', generation.workflow_execution_id);
    }
  } catch (orchestrationError: any) {
    console.error('[orchestrator] Error in workflow orchestration:', orchestrationError);
    // Don't fail the entire webhook - the generation is complete
  }
}
