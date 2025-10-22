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

    // Process any image uploads to generate signed URLs
    const processedInputs = await processImageUploads(user_inputs, user.id, supabase);

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
        user_inputs: processedInputs,
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
        user: processedInputs,
        ...stepOutputs,
      };

      // Resolve input mappings to get dynamic parameter values
      const resolvedMappings = resolveInputMappings(
        step.input_mappings || {},
        context
      );

      // Merge static parameters with resolved mappings
      const allParameters = { ...step.parameters, ...resolvedMappings };

      // Load model input schema to dynamically coerce parameters (same behavior as Custom Creation)
      let coercedParameters = allParameters;
      try {
        if (step.model_record_id) {
          const { data: modelData, error: modelLoadError } = await supabase
            .from('ai_models')
            .select('input_schema')
            .eq('record_id', step.model_record_id)
            .single();
          if (modelLoadError) {
            console.warn('Could not load model schema for step', step.step_number, modelLoadError);
          } else if (modelData?.input_schema) {
            coercedParameters = coerceParametersToSchema(allParameters, modelData.input_schema);
          }
        }
      } catch (e) {
        console.warn('Schema coercion skipped due to error:', e);
      }

      // Generate prompt - always replace template variables regardless of source
      let resolvedPrompt: string;
      if (coercedParameters.prompt) {
        // Prompt comes from parameters - still need to replace variables
        const promptString = typeof coercedParameters.prompt === 'string' 
          ? coercedParameters.prompt 
          : String(coercedParameters.prompt);
        resolvedPrompt = replaceTemplateVariables(promptString, context);
      } else {
        // Prompt comes from prompt_template (legacy)
        resolvedPrompt = replaceTemplateVariables(step.prompt_template, context);
      }

      console.log('Resolved prompt:', resolvedPrompt);
      console.log('Static parameters:', step.parameters);
      console.log('Resolved mappings:', resolvedMappings);
      console.log('All parameters (after schema coercion):', coercedParameters);
      // Call generate-content for this step (returns immediately with status: 'processing')
      const generateResponse = await supabase.functions.invoke('generate-content', {
        body: {
          model_id: step.model_id,
          model_record_id: step.model_record_id,
          prompt: resolvedPrompt,
          custom_parameters: coercedParameters,
          workflow_execution_id: execution.id,
          workflow_step_number: step.step_number,
        },
      });

      if (generateResponse.error) {
        throw new Error(`Step ${step.step_number} failed: ${generateResponse.error.message}`);
      }

      const stepResult = generateResponse.data;
      const generationId = stepResult.id || stepResult.generation_id;

      if (!generationId) {
        throw new Error(`No generation ID returned for step ${step.step_number}`);
      }

      console.log(`Waiting for generation ${generationId} to complete...`);

      // POLL THE DATABASE (exactly like Custom Creation does)
      let generation: any = null;
      const startTime = Date.now();
      const MAX_POLLING_DURATION = 20 * 60 * 1000; // 20 minutes (same as Custom Creation)

      while (!generation) {
        const elapsed = Date.now() - startTime;
        
        // Timeout check
        if (elapsed >= MAX_POLLING_DURATION) {
          throw new Error(`Generation timed out for step ${step.step_number} after 20 minutes`);
        }
        
        // Wait before polling (5 seconds, same as Custom Creation starts with)
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Fetch generation status from database
        const { data: genData, error: genError } = await supabase
          .from('generations')
          .select('id, status, storage_path, output_url, tokens_used, provider_response')
          .eq('id', generationId)
          .single();
        
        if (genError) {
          console.error('Error polling generation:', genError);
          continue; // Keep trying
        }
        
        console.log(`Generation status: ${genData.status} (${Math.round(elapsed / 1000)}s elapsed)`);
        
        // Check for completion (exactly like Custom Creation)
        if (genData.status === 'completed') {
          generation = genData;
          break;
        }
        
        // Check for failure (exactly like Custom Creation)
        if (genData.status === 'failed') {
          const providerResponse = genData.provider_response as any;
          const errorMessage = providerResponse?.error || 
                              providerResponse?.full_response?.data?.failMsg ||
                              'Generation failed';
          throw new Error(`Step ${step.step_number} failed: ${errorMessage}`);
        }
        
        // Otherwise, keep polling (status is still 'processing' or 'pending')
      }

      console.log('Generation completed:', generation);

      // Store step output with storage_path (same as Custom Creation uses)
      stepOutputs[`step${step.step_number}`] = {
        [step.output_key]: generation.storage_path,
        generation_id: generation.id,
      };

      generationIds.push(generation.id);
      totalTokens += generation.tokens_used || 0;

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


// Helper function to process image uploads and generate signed URLs
async function processImageUploads(
  inputs: Record<string, any>,
  userId: string,
  supabaseClient: any
): Promise<Record<string, any>> {
  const processed = { ...inputs };
  
  for (const [key, value] of Object.entries(inputs)) {
    // Check if value is a data URL (base64 image)
    if (typeof value === 'string' && value.startsWith('data:image/')) {
      try {
        console.log(`Processing image upload for field: ${key}`);
        
        // Extract base64 data and content type
        const matches = value.match(/^data:(.+);base64,(.+)$/);
        if (!matches) {
          console.warn(`Invalid data URL format for ${key}`);
          continue;
        }
        
        const contentType = matches[1];
        const base64Data = matches[2];
        
        // Determine file extension
        const extension = contentType.split('/')[1] || 'jpg';
        const fileName = `workflow-input-${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
        const filePath = `${userId}/${fileName}`;
        
        // Convert base64 to Uint8Array
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Upload to Supabase storage
        const { data: uploadData, error: uploadError } = await supabaseClient.storage
          .from('generated-content')
          .upload(filePath, bytes, {
            contentType,
            upsert: false
          });
        
        if (uploadError) {
          console.error(`Upload error for ${key}:`, uploadError);
          throw new Error(`Failed to upload image: ${uploadError.message}`);
        }
        
        console.log(`Image uploaded successfully: ${filePath}`);
        
        // Generate signed URL (valid for 24 hours)
        const { data: urlData, error: urlError } = await supabaseClient.storage
          .from('generated-content')
          .createSignedUrl(filePath, 86400);
        
        if (urlError || !urlData?.signedUrl) {
          console.error(`Signed URL error for ${key}:`, urlError);
          throw new Error(`Failed to generate signed URL: ${urlError?.message}`);
        }
        
        console.log(`Signed URL generated for ${key}`);
        
        // Replace data URL with signed URL
        processed[key] = urlData.signedUrl;
        
      } catch (error) {
        console.error(`Error processing image for ${key}:`, error);
        throw error;
      }
    }
    // Handle array of images
    else if (Array.isArray(value)) {
      const processedArray = [];
      for (const item of value) {
        if (typeof item === 'string' && item.startsWith('data:image/')) {
          const temp = await processImageUploads({ temp: item }, userId, supabaseClient);
          processedArray.push(temp.temp);
        } else {
          processedArray.push(item);
        }
      }
      processed[key] = processedArray;
    }
  }
  
  return processed;
}

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
// Accepts both "user_input.<field>" and "user.<field>" prefixes for backward compatibility
function resolveInputMappings(
  mappings: Record<string, string>,
  context: Record<string, any>
): Record<string, any> {
  const resolved: Record<string, any> = {};
  for (const [paramKey, rawMapping] of Object.entries(mappings)) {
    let mapping = rawMapping;
    if (typeof mapping === 'string') {
      // Normalize user_input.* to user.* (context exposes user inputs under "user")
      mapping = mapping.replace(/^user_input\./, 'user.');
    }

    // Try primary mapping
    let value = getNestedValue(context, mapping as string);

    // If not found, try alternate prefix for resilience
    if ((value === undefined || value === null) && typeof rawMapping === 'string') {
      const alternate = rawMapping.startsWith('user.')
        ? rawMapping.replace(/^user\./, 'user_input.')
        : rawMapping.replace(/^user_input\./, 'user.');
      value = getNestedValue(context, alternate);
    }

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

// Dynamically coerce parameters to the model's input schema
// Mirrors Custom Creation behavior so payload matches model expectations
function coerceParametersToSchema(
  params: Record<string, any>,
  inputSchema: any
): Record<string, any> {
  if (!inputSchema || typeof inputSchema !== 'object') return params;
  const props = (inputSchema as any).properties || {};
  const out: Record<string, any> = { ...params };

  for (const [key, schema] of Object.entries<any>(props)) {
    if (!(key in out)) continue;
    out[key] = coerceValueToSchema(out[key], schema);
  }

  return out;
}

function coerceValueToSchema(value: any, schema: any): any {
  const declaredType = Array.isArray(schema?.type) ? schema.type[0] : schema?.type;
  if (!declaredType) return value;

  switch (declaredType) {
    case 'array': {
      if (Array.isArray(value)) return value;
      if (value === undefined || value === null) return value;
      return [value];
    }
    case 'string': {
      if (value === undefined || value === null) return value;
      if (Array.isArray(value)) return String(value[0]);
      return typeof value === 'string' ? value : String(value);
    }
    case 'number': {
      if (value === undefined || value === null) return value;
      const n = Array.isArray(value) ? parseFloat(value[0]) : parseFloat(value);
      return Number.isNaN(n) ? value : n;
    }
    case 'integer': {
      if (value === undefined || value === null) return value;
      const n = Array.isArray(value) ? parseInt(value[0]) : parseInt(value);
      return Number.isNaN(n) ? value : n;
    }
    case 'boolean': {
      let v = value;
      if (Array.isArray(v)) v = v[0];
      if (typeof v === 'boolean') return v;
      if (typeof v === 'string') {
        const s = v.toLowerCase();
        if (s === 'true') return true;
        if (s === 'false') return false;
      }
      return !!v;
    }
    case 'object':
    default:
      return value;
  }
}
