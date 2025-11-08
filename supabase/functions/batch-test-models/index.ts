import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_CONCURRENT = 5;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { modelRecordIds } = await req.json();

    if (!modelRecordIds || !Array.isArray(modelRecordIds) || modelRecordIds.length === 0) {
      throw new Error('modelRecordIds array is required');
    }

    console.log(`Batch testing ${modelRecordIds.length} models with max ${MAX_CONCURRENT} concurrent tests`);

    const results = [];

    // Process in batches of MAX_CONCURRENT
    for (let i = 0; i < modelRecordIds.length; i += MAX_CONCURRENT) {
      const batch = modelRecordIds.slice(i, i + MAX_CONCURRENT);
      
      const batchPromises = batch.map(async (modelRecordId) => {
        try {
          const { data, error } = await supabaseClient.functions.invoke('test-model', {
            body: { modelRecordId },
          });

          if (error) {
            return {
              modelRecordId,
              success: false,
              error: error.message,
            };
          }

          return {
            modelRecordId,
            success: true,
            ...data,
          };
        } catch (error) {
          console.error(`Error testing model ${modelRecordId}:`, error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          return {
            modelRecordId,
            success: false,
            error: errorMessage,
          };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      
      // Extract values from settled promises
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            error: result.reason?.message || 'Unknown error',
          });
        }
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    return new Response(
      JSON.stringify({
        success: true,
        total: results.length,
        successful: successCount,
        failed: failureCount,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Batch test error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
