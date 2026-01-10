/**
 * Test function to verify Deno registry works
 * Tests: Model import, config access, module caching
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getModelConfig, getAvailableModelRecordIds } from "../_shared/registry/index.ts";
import { EdgeLogger } from "../_shared/edge-logger.ts";

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('test-registry', requestId);

  try {
    // Test 1: List available models
    const availableIds = getAvailableModelRecordIds();
    logger.info('Found models in registry', { metadata: { count: availableIds.length } });

    // Test 2: Get a specific model (Kling 2.6 Motion Control)
    const testRecordId = "d6e7f8a9-0b1c-2d3e-4f5a-6b7c8d9e0f1a";
    logger.info('Testing model import', { metadata: { recordId: testRecordId } });

    const config = getModelConfig(testRecordId);
    logger.info('Model config retrieved');
    logger.info('Model details', {
      metadata: {
        name: config.modelName,
        provider: config.provider
      }
    });
    logger.info('Model config retrieved');

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
    logger.error('Registry test failed', error instanceof Error ? error : new Error(String(error)));
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
