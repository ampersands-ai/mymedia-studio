import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createSafeErrorResponse } from "../_shared/error-handler.ts";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getModel } from "../_shared/registry/index.ts";
import { validateWorkflowInputs } from "../_shared/jsonb-validation-schemas.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import {
  processImageUploads,
  sanitizeParametersForProviders
} from "./helpers/image-upload.ts";
import {
  replaceTemplateVariables,
  resolveInputMappings,
  coerceParametersToSchema
} from "./helpers/parameter-resolver.ts";
import {
import { GENERATION_STATUS } from "../_shared/constants.ts";
  WorkflowExecutorRequestSchema,
  WorkflowStepSchema,
  type WorkflowExecutorRequest,
  type WorkflowStep
} from "../_shared/schemas.ts";



Deno.serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  const startTime = Date.now();
  const requestId = crypto.randomUUID();

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

    const logger = new EdgeLogger('workflow-executor', requestId, supabase, true);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      logger.error('Authentication failed', userError ?? undefined);
      throw new Error('Unauthorized');
    }

    // Validate request body with Zod
    const requestBody = await req.json();
    const validatedRequest: WorkflowExecutorRequest = WorkflowExecutorRequestSchema.parse(requestBody);
    const { workflow_template_id, user_inputs } = validatedRequest;

    logger.info('Workflow execution started', {
      userId: user.id,
      metadata: { workflow_template_id }
    });

    // Process any image uploads to generate signed URLs
    const processedInputs = await processImageUploads(user_inputs, user.id, supabase);

    // Validate user inputs JSONB before storing (DoS prevention + schema validation)
    const inputValidation = validateWorkflowInputs(processedInputs);
    if (!inputValidation.success) {
      logger.error('Workflow inputs validation failed', undefined, {
        userId: user.id,
        metadata: { error: inputValidation.error }
      });
      throw new Error(`Invalid workflow inputs: ${inputValidation.error}`);
    }

    logger.debug('User inputs validated successfully', { userId: user.id });

    // 1. Load workflow template
    const { data: workflow, error: workflowError } = await supabase
      .from('workflow_templates')
      .select('*')
      .eq('id', workflow_template_id)
      .single();

    if (workflowError || !workflow) {
      throw new Error('Workflow template not found');
    }

    // Validate workflow steps with Zod
    const steps: WorkflowStep[] = WorkflowStepSchema.array().parse(workflow.workflow_steps);
    const totalSteps = steps.length;

    // 2. Create workflow execution record
    const { data: execution, error: executionError } = await supabase
      .from('workflow_executions')
      .insert({
        workflow_template_id,
        user_id: user.id,
        total_steps: totalSteps,
        user_inputs: processedInputs,
        status: GENERATION_STATUS.PROCESSING,
      })
      .select()
      .single();

    if (executionError || !execution) {
      throw new Error('Failed to create workflow execution');
    }

    logger.info('Workflow execution created', {
      userId: user.id,
      metadata: { 
        execution_id: execution.id,
        total_steps: totalSteps 
      }
    });

    // 3. Start ONLY the first step (orchestration will be handled by webhook)
    const firstStep = steps[0];
    logger.info('Starting first step', {
      userId: user.id,
      metadata: { 
        step_number: 1,
        step_name: firstStep.step_name 
      }
    });

    // Update current step
    await supabase
      .from('workflow_executions')
      .update({ current_step: firstStep.step_number })
      .eq('id', execution.id);

    // Build context for step 1
    const context = {
      user: processedInputs,
    };

    // Resolve input mappings
    const resolvedMappings = resolveInputMappings(
      firstStep.input_mappings || {},
      context
    );

    // Merge static parameters with resolved mappings
    const allParameters = { ...firstStep.parameters, ...resolvedMappings };

    // ADR 007: Load model input schema from registry to coerce parameters
    let coercedParameters = allParameters;
    try {
      if (firstStep.model_record_id) {
        const model = await getModel(firstStep.model_record_id);
        if (model.SCHEMA) {
          coercedParameters = coerceParametersToSchema(allParameters, model.SCHEMA);
        }
      }
    } catch (e) {
      logger.warn('Schema coercion skipped', { metadata: { error: e instanceof Error ? e.message : String(e) } });
    }

    // Sanitize parameters to convert base64 images
    const sanitizedParameters = await sanitizeParametersForProviders(coercedParameters, user.id, supabase);

    // Generate prompt
    let resolvedPrompt: string;
    if (sanitizedParameters.prompt) {
      const promptString = typeof sanitizedParameters.prompt === 'string' 
        ? sanitizedParameters.prompt 
        : String(sanitizedParameters.prompt);
      resolvedPrompt = replaceTemplateVariables(promptString, context);
    } else {
      resolvedPrompt = replaceTemplateVariables(firstStep.prompt_template, context);
    }

    logger.debug('Step 1 configuration resolved', {
      userId: user.id,
      metadata: { 
        prompt_length: resolvedPrompt.length,
        parameter_keys: Object.keys(sanitizedParameters)
      }
    });

    // Call generate-content for step 1
    const generateResponse = await supabase.functions.invoke('generate-content', {
      body: {
        model_id: firstStep.model_id,
        model_record_id: firstStep.model_record_id,
        prompt: resolvedPrompt,
        custom_parameters: sanitizedParameters,
        workflow_execution_id: execution.id,
        workflow_step_number: firstStep.step_number,
      },
    });

    if (generateResponse.error) {
      logger.error('Step 1 generation failed', generateResponse.error, {
        userId: user.id,
        metadata: { execution_id: execution.id }
      });
      throw new Error(`Step 1 failed: ${generateResponse.error.message}`);
    }

    logger.logDuration('Workflow execution initiated', startTime, {
      userId: user.id,
      metadata: { 
        execution_id: execution.id,
        workflow_template_id 
      }
    });

    // Return immediately - webhook will handle orchestration
    return new Response(
      JSON.stringify({
        execution_id: execution.id,
        status: GENERATION_STATUS.PROCESSING,
      }),
      { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return createSafeErrorResponse(error, 'workflow-executor', corsHeaders);
  }
});
