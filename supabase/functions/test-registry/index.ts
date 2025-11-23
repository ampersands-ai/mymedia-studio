/**
 * Test function to verify Deno registry works
 * Tests: Model import, config access, module caching
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getModel, getModelConfig, getAvailableModelRecordIds } from "../_shared/registry/index.ts";

serve(async (req) => {
  try {
    // Test 1: List available models
    const availableIds = getAvailableModelRecordIds();
    console.log(`✅ Found ${availableIds.length} models in registry`);

    // Test 2: Get a specific model (ElevenLabs Fast)
    const testRecordId = "7cd9f31d-82d6-49a8-a4ae-13dbe9b73c2f";
    console.log(`Testing model import for record_id: ${testRecordId}`);

    const model = await getModel(testRecordId);
    console.log(`✅ Model imported successfully`);
    console.log(`Model name: ${model.MODEL_CONFIG.modelName}`);
    console.log(`Provider: ${model.MODEL_CONFIG.provider}`);

    // Test 3: Get config only
    const config = await getModelConfig(testRecordId);
    console.log(`✅ Model config retrieved`);

    return new Response(
      JSON.stringify({
        success: true,
        availableModels: availableIds.length,
        testModel: {
          recordId: testRecordId,
          name: config.modelName,
          provider: config.provider,
          contentType: config.contentType,
        },
      }, null, 2),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("❌ Registry test failed:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }, null, 2),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
