/**
 * URL normalization for various payload formats
 */

import { isMidjourneyModel } from "./midjourney-handler.ts";
import { webhookLogger } from "../../_shared/logger.ts";

export function normalizeResultUrls(
  payload: any, 
  resultJson: string | null, 
  generationType: string, 
  modelId?: string
): string[] {
  const urls: string[] = [];
  const isMidjourney = isMidjourneyModel(modelId);
  
  // Try resultJson first (old format)
  if (resultJson) {
    try {
      const parsed = JSON.parse(resultJson);
      if (Array.isArray(parsed.resultUrls)) {
        urls.push(...parsed.resultUrls);
        webhookLogger.info('Normalized URLs from resultJson', { metadata: { count: urls.length } });
      } else if (parsed.resultUrl) {
        urls.push(parsed.resultUrl);
        webhookLogger.info('Normalized single URL from resultJson');
      }
    } catch (e) {
      webhookLogger.error('Failed to parse resultJson', e instanceof Error ? e : new Error(String(e)));
    }
  }
  
  // MIDJOURNEY SPECIFIC: Check for direct data.resultUrls format
  if (urls.length === 0 && isMidjourney && payload.data?.resultUrls) {
    if (Array.isArray(payload.data.resultUrls)) {
      urls.push(...payload.data.resultUrls);
      webhookLogger.info('[MIDJOURNEY] Normalized URLs from data.resultUrls', { metadata: { count: urls.length } });
    }
  }
  
  // Try new data.info format (snake_case and camelCase)
  if (urls.length === 0 && payload.data?.info) {
    const info = payload.data.info;
    
    // Try plural formats first
    const infoUrls = info.result_urls ?? info.resultUrls;
    if (Array.isArray(infoUrls) && infoUrls.length > 0) {
      urls.push(...infoUrls);
      webhookLogger.info('Normalized URLs from data.info (plural)', { metadata: { count: urls.length } });
    } 
    // Try singular formats (FLUX Kontext, etc.)
    else {
      const singleUrl = info.resultImageUrl ?? info.result_image_url ?? info.resultUrl ?? info.result_url;
      if (singleUrl) {
        urls.push(singleUrl);
        webhookLogger.info('Normalized single URL from data.info');
      }
    }
  }
  
  // Fallback to old data.data format
  if (urls.length === 0 && Array.isArray(payload.data?.data)) {
    webhookLogger.info('Using old data.data format');
    return []; // Return empty to signal we should use items format
  }
  
  webhookLogger.info('URL normalization complete', { metadata: { count: urls.length, type: generationType, modelId: modelId || 'unknown' } });
  return urls;
}

export function mapUrlsToItems(urls: string[], generationType: string): any[] {
  return urls.map((url: string) => {
    const item: any = {};
    
    if (generationType === 'image') {
      item.image_url = url;
      item.source_image_url = url;
    } else if (generationType === 'audio') {
      item.audio_url = url;
      item.source_audio_url = url;
    } else if (generationType === 'video') {
      item.video_url = url;
      item.source_video_url = url;
    }
    
    return item;
  });
}
