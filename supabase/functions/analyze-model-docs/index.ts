import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getModel } from "../_shared/registry/index.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyzeRequest {
  model_record_id: string;
  regenerate?: boolean;
}

interface ParameterAnalysis {
  type: string;
  location: string;
  observed_values: any[];
  frequency: Record<string, number>;
  optional: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Model documentation analysis deprecated - model_documentation table removed
    // Model metadata now lives in file-based registry
    console.log('analyze-model-docs: Function deprecated - model_documentation table removed');

    return new Response(
      JSON.stringify({
        success: false,
        message: 'Model documentation analysis unavailable (database table removed)',
        error: 'model_documentation table has been removed - use file-based registry instead'
      }),
      { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

    const { model_record_id, regenerate = false }: AnalyzeRequest = await req.json();

    if (!model_record_id) {
      return new Response(
        JSON.stringify({ error: 'model_record_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analyzing model documentation', { model_record_id, regenerate });

    // Check if documentation already exists and is recent
    if (!regenerate) {
      const { data: existingDoc } = await supabaseClient
        .from('model_documentation')
        .select('id, last_analyzed_at')
        .eq('model_record_id', model_record_id)
        .single();

      if (existingDoc) {
        const hoursSinceUpdate = (Date.now() - new Date(existingDoc.last_analyzed_at).getTime()) / (1000 * 60 * 60);
        if (hoursSinceUpdate < 24) {
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Documentation is recent (< 24h old). Use regenerate=true to force refresh.',
              documentation_id: existingDoc.id
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // ADR 007: Fetch model information from registry
    let modelModule;
    let modelId;
    let provider;
    let contentType;
    try {
      modelModule = await getModel(model_record_id);
      modelId = modelModule.MODEL_CONFIG.modelId;
      provider = modelModule.MODEL_CONFIG.provider;
      contentType = modelModule.MODEL_CONFIG.contentType;
    } catch (e) {
      console.error('Model not found', { model_record_id, error: e });
      return new Response(
        JSON.stringify({ error: 'Model not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analyzing model', {
      model_id: modelId,
      provider: provider,
      content_type: contentType
    });

    // Fetch successful generations for this model (last 100)
    const { data: generations, error: genError } = await supabaseClient
      .from('generations')
      .select('id, prompt, settings, provider_request, provider_response, created_at, status, tokens_used')
      .eq('model_record_id', model_record_id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(100);

    if (genError) {
      console.error('Error fetching generations', genError);
      return new Response(
        JSON.stringify({ error: 'Error fetching generations' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const generationCount = generations?.length || 0;
    console.log('Found generations', { count: generationCount });

    if (generationCount === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'No successful generations found for this model. Generate some content first.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Analyze parameters from generations
    const parameterAnalysis: Record<string, ParameterAnalysis> = {};
    const successfulExamples: any[] = [];
    const providerPayloads: any[] = [];
    let totalProcessingTime = 0;
    let processedCount = 0;

    for (const gen of generations || []) {
      if (!gen.provider_request) continue;

      const request = gen.provider_request as any;
      providerPayloads.push(request);

      // Extract parameters from request
      const extractParams = (obj: any, prefix = '') => {
        for (const [key, value] of Object.entries(obj)) {
          const fullKey = prefix ? `${prefix}.${key}` : key;
          
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            extractParams(value, fullKey);
          } else {
            if (!parameterAnalysis[key]) {
              parameterAnalysis[key] = {
                type: Array.isArray(value) ? 'array' : typeof value,
                location: fullKey,
                observed_values: [],
                frequency: {},
                optional: true
              };
            }

            // Track frequency
            const valueStr = JSON.stringify(value);
            parameterAnalysis[key].frequency[valueStr] = 
              (parameterAnalysis[key].frequency[valueStr] || 0) + 1;

            // Store unique values (max 10)
            if (parameterAnalysis[key].observed_values.length < 10 && 
                !parameterAnalysis[key].observed_values.some(v => JSON.stringify(v) === valueStr)) {
              parameterAnalysis[key].observed_values.push(value);
            }
          }
        }
      };

      extractParams(request);

      // Add to successful examples (keep first 5)
      if (successfulExamples.length < 5) {
        successfulExamples.push({
          generation_id: gen.id,
          created_at: gen.created_at,
          prompt: gen.prompt,
          parameters_sent: gen.settings || {},
          api_payload: request,
          tokens_used: gen.tokens_used,
          success: true
        });
      }

      // Calculate processing time if available
      if (gen.created_at && gen.provider_response) {
        const response = gen.provider_response as any;
        if (response.completed_at) {
          const startTime = new Date(gen.created_at).getTime();
          const endTime = new Date(response.completed_at).getTime();
          const duration = (endTime - startTime) / 1000;
          totalProcessingTime += duration;
          processedCount++;
        }
      }
    }

    // Identify common payload structure
    const firstPayload = providerPayloads[0] || {};
    const payloadStructure = model.payload_structure || 'wrapper';
    const hasInput = 'input' in firstPayload;
    const hasModel = 'model' in firstPayload;
    const hasCallBackUrl = 'callBackUrl' in firstPayload;

    // Build documentation data
    const documentationData = {
      model_info: {
        api_id: model.id,
        display_name: model.model_name,
        provider: model.provider,
        content_type: model.content_type,
        model_family: model.model_family || null,
        payload_structure: payloadStructure,
        base_token_cost: model.base_token_cost,
        estimated_time_seconds: model.estimated_time_seconds
      },
      request_structure: {
        base_payload: {
          ...(hasModel && { model: model.id }),
          ...(hasCallBackUrl && { callBackUrl: '<webhook-url>' }),
          ...(hasInput && { input: {} })
        },
        parameter_format: payloadStructure,
        prompt_field: hasInput ? 'input.prompt' : 'prompt',
        required_fields: Object.keys(firstPayload).filter(k => 
          providerPayloads.every(p => k in p)
        )
      },
      common_parameters: Object.fromEntries(
        Object.entries(parameterAnalysis)
          .sort(([, a], [, b]) => {
            const aTotal = Object.values(a.frequency).reduce((sum, v) => sum + v, 0);
            const bTotal = Object.values(b.frequency).reduce((sum, v) => sum + v, 0);
            return bTotal - aTotal;
          })
          .slice(0, 20) // Top 20 most common
      ),
      successful_examples: successfulExamples,
      parameter_transformations: [
        {
          from: 'User settings object',
          to: 'API request payload',
          transformation: `Converted to ${payloadStructure} format with provider-specific field names`
        }
      ],
      provider_specifics: {
        [model.provider]: {
          webhook_required: hasCallBackUrl,
          async_processing: hasCallBackUrl,
          typical_processing_time: processedCount > 0 
            ? `${Math.round(totalProcessingTime / processedCount)} seconds`
            : 'Unknown'
        }
      },
      known_issues: [],
      debugging_tips: [
        `Check payload structure matches ${payloadStructure} format`,
        'Verify parameter naming conventions (camelCase vs snake_case)',
        hasCallBackUrl ? 'Ensure webhook token is included for async models' : null,
        'Review successful examples for correct parameter patterns'
      ].filter(Boolean),
      statistics: {
        total_analyzed: generationCount,
        avg_processing_time: processedCount > 0 
          ? Math.round(totalProcessingTime / processedCount * 10) / 10 
          : null,
        success_rate: 100, // We only analyzed successful ones
        most_used_parameters: Object.entries(parameterAnalysis)
          .sort(([, a], [, b]) => {
            const aTotal = Object.values(a.frequency).reduce((sum, v) => sum + v, 0);
            const bTotal = Object.values(b.frequency).reduce((sum, v) => sum + v, 0);
            return bTotal - aTotal;
          })
          .slice(0, 5)
          .map(([key]) => key)
      }
    };

    // Upsert documentation
    const { data: doc, error: upsertError } = await supabaseClient
      .from('model_documentation')
      .upsert({
        model_record_id,
        provider: model.provider,
        model_id: model.id,
        model_name: model.model_name,
        content_type: model.content_type,
        model_family: model.model_family,
        documentation_data: documentationData,
        analyzed_generations_count: generationCount,
        last_successful_generation_id: generations?.[0]?.id || null,
        last_analyzed_at: new Date().toISOString(),
        documentation_version: 1
      }, {
        onConflict: 'model_record_id'
      })
      .select()
      .single();

    if (upsertError) {
      console.error('Error upserting documentation', upsertError);
      return new Response(
        JSON.stringify({ error: 'Error saving documentation', details: upsertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Documentation created successfully', { doc_id: doc.id });

    return new Response(
      JSON.stringify({
        success: true,
        documentation_id: doc.id,
        generations_analyzed: generationCount,
        message: `Successfully analyzed ${generationCount} generations and created documentation`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-model-docs:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

