import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { workflow_template_id, user_inputs } = await req.json();

    console.log('Executing workflow:', workflow_template_id, 'for user:', user.id);

    // 1. Load workflow template
    const { data: workflow, error: workflowError } = await supabase
      .from('workflow_templates')
      .select('*')
      .eq('id', workflow_template_id)
      .single();

    if (workflowError || !workflow) {
      throw new Error('Workflow template not found');
    }

    const steps = workflow.workflow_steps as any[];
    const totalSteps = steps.length;

    // 2. Create workflow execution record
    const { data: execution, error: executionError } = await supabase
      .from('workflow_executions')
      .insert({
        workflow_template_id,
        user_id: user.id,
        total_steps: totalSteps,
        user_inputs,
        status: 'processing',
      })
      .select()
      .single();

    if (executionError || !execution) {
      throw new Error('Failed to create workflow execution');
    }

    console.log('Created execution:', execution.id);

    // 3. Execute steps sequentially
    const stepOutputs: Record<string, any> = {};
    const generationIds: string[] = [];
    let totalTokens = 0;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      console.log(`Executing step ${step.step_number}:`, step.step_name);

      // Update current step
      await supabase
        .from('workflow_executions')
        .update({ current_step: step.step_number })
        .eq('id', execution.id);

      // Build context with all available data
      const context = {
        user: user_inputs,
        ...stepOutputs,
      };

      // Replace template variables in prompt
      const resolvedPrompt = replaceTemplateVariables(
        step.prompt_template,
        context
      );

      // Resolve input mappings to get dynamic parameter values
      const resolvedMappings = resolveInputMappings(
        step.input_mappings || {},
        context
      );

      // Merge static parameters with resolved mappings
      const allParameters = { ...step.parameters, ...resolvedMappings };

      console.log('Resolved prompt:', resolvedPrompt);
      console.log('Static parameters:', step.parameters);
      console.log('Resolved mappings:', resolvedMappings);
      console.log('All parameters:', allParameters);

      // Call generate-content for this step
      const generateResponse = await supabase.functions.invoke('generate-content', {
        body: {
          model_id: step.model_id,
          model_record_id: step.model_record_id,
          prompt: resolvedPrompt,
          custom_parameters: allParameters,
          workflow_execution_id: execution.id,
          workflow_step_number: step.step_number,
        },
      });

      if (generateResponse.error) {
        throw new Error(`Step ${step.step_number} failed: ${generateResponse.error.message}`);
      }

      const stepResult = generateResponse.data;
      console.log('Step result:', stepResult);

      // Store step output with key
      stepOutputs[`step${step.step_number}`] = {
        [step.output_key]: stepResult.output_url || stepResult.output_data,
        generation_id: stepResult.generation_id,
      };

      if (stepResult.generation_id) {
        generationIds.push(stepResult.generation_id);
      }

      totalTokens += stepResult.tokens_used || 0;

      // Update execution with step outputs
      await supabase
        .from('workflow_executions')
        .update({
          step_outputs: stepOutputs,
          generation_ids: generationIds,
          tokens_used: totalTokens,
        })
        .eq('id', execution.id);
    }

    // 4. Mark workflow as completed
    const finalOutput = stepOutputs[`step${totalSteps}`];
    const finalOutputUrl = extractFinalOutput(finalOutput);

    await supabase
      .from('workflow_executions')
      .update({
        status: 'completed',
        final_output_url: finalOutputUrl,
        completed_at: new Date().toISOString(),
      })
      .eq('id', execution.id);

    console.log('Workflow completed:', execution.id);

    return new Response(
      JSON.stringify({
        execution_id: execution.id,
        status: 'completed',
        final_output_url: finalOutputUrl,
        tokens_used: totalTokens,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Workflow execution error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Helper function to replace template variables
function replaceTemplateVariables(
  template: string,
  context: Record<string, any>
): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const value = getNestedValue(context, path.trim());
    return value ?? match;
  });
}

// Helper function to get nested object values
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

// Helper function to resolve input mappings
// This resolves parameter mappings like "user.quality" or "step1.output_url"
function resolveInputMappings(
  mappings: Record<string, string>,
  context: Record<string, any>
): Record<string, any> {
  const resolved: Record<string, any> = {};
  for (const [paramKey, mapping] of Object.entries(mappings)) {
    // Get the value by traversing the context path
    const value = getNestedValue(context, mapping);
    if (value !== undefined && value !== null) {
      resolved[paramKey] = value;
    }
  }
  return resolved;
}

// Helper function to extract final output
function extractFinalOutput(finalStepOutput: any): string | null {
  if (!finalStepOutput) return null;
  
  // Get the first output key value
  const outputKeys = Object.keys(finalStepOutput).filter(k => k !== 'generation_id');
  if (outputKeys.length === 0) return null;
  
  return finalStepOutput[outputKeys[0]];
}
