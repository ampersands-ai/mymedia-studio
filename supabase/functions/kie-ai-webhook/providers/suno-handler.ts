/**
 * Suno-specific payload handling
 * Suno returns audio in stream_audio_url fields without file extensions
 */

import { webhookLogger } from "../../_shared/logger.ts";

interface SunoDataItem {
  stream_audio_url?: string;
  source_stream_audio_url?: string;
  audio_url?: string;
  source_audio_url?: string;
}

// Use a permissive type to accept various webhook payload structures
// deno-lint-ignore no-explicit-any
type SunoPayload = Record<string, any>;

/**
 * Detect if the model is a Suno music generation model
 */
export function isSunoModel(modelId?: string): boolean {
  if (!modelId) return false;
  const id = modelId.toLowerCase();
  return (
    id.includes("suno") ||
    id === "v5" ||
    id === "v4" ||
    id.startsWith("v4_") ||
    id.startsWith("v3_")
  );
}

/**
 * Extract audio URLs from Suno-specific payload structure
 * Suno uses stream_audio_url which may not have file extensions
 */
export function extractSunoAudioUrls(payload: SunoPayload): string[] {
  const items = payload?.data?.data;
  if (!Array.isArray(items)) {
    webhookLogger.info("[SUNO] No data.data array found in payload");
    return [];
  }

  const urls = items
    .map(
      (item: SunoDataItem) =>
        item?.stream_audio_url ||
        item?.source_stream_audio_url ||
        item?.audio_url ||
        item?.source_audio_url
    )
    .filter((url): url is string => Boolean(url));

  webhookLogger.info("[SUNO] Extracted audio URLs", {
    metadata: { count: urls.length, hasStreamUrls: urls.some((u) => u.includes("stream")) },
  });

  return urls;
}
