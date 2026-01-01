/**
 * Sync Handler Module
 * Handles synchronous generation flow (direct provider response)
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../../_shared/edge-logger.ts";
import { TestExecutionLogger } from "../../_shared/test-execution-logger.ts";
import { uploadGenerationOutput, getExistingStorageInfo, calculateTimingData } from "../services/storage-service.ts";
import { logGenerationEvent, markGenerationCompleted, triggerCompletionNotification } from "../services/audit-service.ts";
import type { Model } from "./validation.ts";

export interface SyncGenerationContext {
  supabase: SupabaseClient;
  logger: EdgeLogger;
  testLogger: TestExecutionLogger | null;
  userId: string;
  generationId: string;
  model: Model;
  tokenCost: number;
  startTime: number;
  providerRequest: Record<string, unknown>;
  providerResponse: {
    storage_path?: string;
    output_data?: Uint8Array;
    file_extension?: string;
    file_size?: number;
    metadata?: Record<string, unknown>;
    [key: string]: unknown;
  };
}

/**
 * Process synchronous generation completion in background
 * This is a fire-and-forget operation with proper error handling
 */
export function processBackgroundUpload(context: SyncGenerationContext): void {
  const {
    supabase,
    logger,
    testLogger,
    userId,
    generationId,
    model,
    tokenCost,
    startTime,
    providerRequest,
    providerResponse
  } = context;

  (async () => {
    try {
      const uploadStartTime = Date.now();
      let storagePath: string;
      let publicUrl: string;
      let fileSize = providerResponse.file_size;
      let uploadDuration: number;

      // Check if provider already uploaded to storage
      if (providerResponse.storage_path) {
        const existingInfo = await getExistingStorageInfo(
          supabase,
          providerResponse.storage_path,
          userId,
          logger
        );
        storagePath = providerResponse.storage_path;
        publicUrl = existingInfo.publicUrl;
        if (!fileSize) {
          fileSize = existingInfo.fileSize;
        }
        uploadDuration = Date.now() - uploadStartTime;
      } else {
        // Normal upload flow
        if (!providerResponse.file_extension) {
          throw new Error('Missing file extension from provider response');
        }
        const uploadResult = await uploadGenerationOutput(
          supabase,
          userId,
          generationId,
          providerResponse.output_data as Uint8Array,
          providerResponse.file_extension,
          model.content_type,
          logger
        );
        storagePath = uploadResult.storagePath;
        publicUrl = uploadResult.publicUrl;
        fileSize = uploadResult.fileSize;
        uploadDuration = uploadResult.uploadDuration;
      }

      // Log storage upload if in test mode
      if (testLogger) {
        await testLogger.logStorageUpload(storagePath, fileSize, uploadDuration);
      }

      // Calculate timing durations
      const completedAtMs = Date.now();
      const timingData = await calculateTimingData(supabase, generationId, completedAtMs);

      // Update generation record
      await markGenerationCompleted(
        supabase,
        generationId,
        publicUrl,
        storagePath,
        fileSize,
        timingData,
        providerRequest,
        providerResponse.metadata
      );

      logger.info('Timing data saved', {
        userId,
        metadata: { generationId, ...timingData }
      });

      // Log database update if in test mode
      if (testLogger) {
        await testLogger.logDatabaseUpdate(
          'generations',
          'update',
          generationId,
          { status: 'completed', output_url: publicUrl }
        );
      }

      // Log completion audit
      await logGenerationEvent(supabase, userId, generationId, 'generation_completed', {
        modelId: model.id,
        tokensUsed: tokenCost,
        contentType: model.content_type,
        durationMs: Date.now() - startTime
      });

      // Trigger notification for long-running generations
      const generationDuration = Math.floor((Date.now() - startTime) / 1000);
      await triggerCompletionNotification(
        supabase,
        generationId,
        userId,
        generationDuration,
        logger
      );

      logger.info('Background processing completed', {
        userId,
        metadata: { generation_id: generationId }
      });
    } catch (bgError) {
      logger.error('Background processing error', bgError instanceof Error ? bgError : undefined, {
        userId,
        metadata: { generation_id: generationId }
      });
      
      // Update to failed status if background task fails
      const errorMessage = bgError instanceof Error ? bgError.message : 'Background processing failed';
      await supabase
        .from('generations')
        .update({ 
          status: 'failed',
          provider_request: providerRequest,
          provider_response: { 
            error: errorMessage,
            full_error: bgError instanceof Error ? bgError.toString() : String(bgError),
            timestamp: new Date().toISOString()
          } 
        })
        .eq('id', generationId);
    }
  })();
}

/**
 * Build sync generation response
 */
export function buildSyncResponse(
  generationId: string,
  tokenCost: number,
  contentType: string,
  enhanced: boolean,
  responseHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      id: generationId,
      generation_id: generationId,
      status: 'processing',
      tokens_used: tokenCost,
      content_type: contentType,
      enhanced,
      is_async: true
    }),
    { status: 202, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
  );
}
