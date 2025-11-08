import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { createSafeErrorResponse } from "../_shared/error-handler.ts";

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

    console.log('[workflow-executor] Kickoff workflow:', workflow_template_id, 'for user:', user.id);

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

    console.log('[workflow-executor] Created execution:', execution.id);

    // 3. Start ONLY the first step (orchestration will be handled by webhook)
    const firstStep = steps[0];
    console.log('[workflow-executor] Starting step 1:', firstStep.step_name);

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

    // Load model input schema to coerce parameters
    let coercedParameters = allParameters;
    try {
      if (firstStep.model_record_id) {
        const { data: modelData, error: modelLoadError } = await supabase
          .from('ai_models')
          .select('input_schema')
          .eq('record_id', firstStep.model_record_id)
          .single();
        if (modelLoadError) {
          console.warn('[workflow-executor] Could not load model schema:', modelLoadError);
        } else if (modelData?.input_schema) {
          coercedParameters = coerceParametersToSchema(allParameters, modelData.input_schema);
        }
      }
    } catch (e) {
      console.warn('[workflow-executor] Schema coercion skipped:', e);
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

    console.log('[workflow-executor] Resolved prompt for step 1:', resolvedPrompt);
    console.log('[workflow-executor] Parameters:', sanitizedParameters);

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
      console.error('[workflow-executor] Step 1 failed:', generateResponse.error);
      throw new Error(`Step 1 failed: ${generateResponse.error.message}`);
    }

    console.log('[workflow-executor] Step 1 initiated, returning immediately');

    // Return immediately - webhook will handle orchestration
    return new Response(
      JSON.stringify({
        execution_id: execution.id,
        status: 'processing',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return createSafeErrorResponse(error, 'workflow-executor', corsHeaders);
  }
});


// Helper function to sanitize parameters and convert base64 images to signed URLs
async function sanitizeParametersForProviders(
  params: Record<string, any>,
  userId: string,
  supabaseClient: any
): Promise<Record<string, any>> {
  const mediaKeys = ['image_url', 'image_urls', 'input_image', 'reference_image', 'mask_image', 'image', 'images', 'thumbnail', 'cover'];
  const processed = { ...params };
  let convertedCount = 0;
  
  for (const [key, value] of Object.entries(params)) {
    const isMediaKey = mediaKeys.includes(key.toLowerCase());
    
    if (typeof value === 'string' && value.startsWith('data:image/')) {
      try {
        const signedUrl = await uploadBase64Image(value, userId, supabaseClient);
        processed[key] = signedUrl;
        convertedCount++;
      } catch (error) {
        console.error(`Error processing image for ${key}:`, error);
        throw error;
      }
    }
    else if (Array.isArray(value) && isMediaKey) {
      const processedArray = [];
      for (const item of value) {
        if (typeof item === 'string' && item.startsWith('data:image/')) {
          try {
            const signedUrl = await uploadBase64Image(item, userId, supabaseClient);
            processedArray.push(signedUrl);
            convertedCount++;
          } catch (error) {
            console.error(`Error processing array image for ${key}:`, error);
            throw error;
          }
        } else if (typeof item === 'string' && (item.startsWith('http://') || item.startsWith('https://'))) {
          processedArray.push(item);
        } else {
          processedArray.push(item);
        }
      }
      processed[key] = processedArray;
    }
  }
  
  if (convertedCount > 0) {
    console.log(`Sanitized parameters: converted ${convertedCount} base64 image(s) to signed URLs`);
  }
  
  return processed;
}

// Helper function to upload a base64 image and return signed URL
async function uploadBase64Image(
  dataUrl: string,
  userId: string,
  supabaseClient: any
): Promise<string> {
  const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid data URL format');
  }
  
  const contentType = matches[1];
  const base64Data = matches[2];
  
  const extension = contentType.split('/')[1] || 'jpg';
  const fileName = `workflow-input-${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
  const filePath = `${userId}/${fileName}`;
  
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  const { error: uploadError } = await supabaseClient.storage
    .from('generated-content')
    .upload(filePath, bytes, {
      contentType,
      upsert: false
    });
  
  if (uploadError) {
    throw new Error(`Failed to upload image: ${uploadError.message}`);
  }
  
  const { data: urlData, error: urlError } = await supabaseClient.storage
    .from('generated-content')
    .createSignedUrl(filePath, 86400);
  
  if (urlError || !urlData?.signedUrl) {
    throw new Error(`Failed to generate signed URL: ${urlError?.message}`);
  }
  
  return urlData.signedUrl;
}

// Helper function to process image uploads and generate signed URLs
async function processImageUploads(
  inputs: Record<string, any>,
  userId: string,
  supabaseClient: any
): Promise<Record<string, any>> {
  const processed = { ...inputs };
  
  for (const [key, value] of Object.entries(inputs)) {
    if (typeof value === 'string' && value.startsWith('data:image/')) {
      try {
        console.log(`Processing image upload for field: ${key}`);
        
        const matches = value.match(/^data:(.+);base64,(.+)$/);
        if (!matches) {
          console.warn(`Invalid data URL format for ${key}`);
          continue;
        }
        
        const contentType = matches[1];
        const base64Data = matches[2];
        
        const extension = contentType.split('/')[1] || 'jpg';
        const fileName = `workflow-input-${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
        const filePath = `${userId}/${fileName}`;
        
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
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
        
        const { data: urlData, error: urlError } = await supabaseClient.storage
          .from('generated-content')
          .createSignedUrl(filePath, 86400);
        
        if (urlError || !urlData?.signedUrl) {
          console.error(`Signed URL error for ${key}:`, urlError);
          throw new Error(`Failed to generate signed URL: ${urlError?.message}`);
        }
        
        console.log(`Signed URL generated for ${key}`);
        
        processed[key] = urlData.signedUrl;
        
      } catch (error) {
        console.error(`Error processing image for ${key}:`, error);
        throw error;
      }
    }
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
function resolveInputMappings(
  mappings: Record<string, string>,
  context: Record<string, any>
): Record<string, any> {
  const resolved: Record<string, any> = {};
  for (const [paramKey, rawMapping] of Object.entries(mappings)) {
    let mapping = rawMapping;
    if (typeof mapping === 'string') {
      mapping = mapping.replace(/^user_input\./, 'user.');
    }

    let value = getNestedValue(context, mapping as string);

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

// Dynamically coerce parameters to the model's input schema
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
