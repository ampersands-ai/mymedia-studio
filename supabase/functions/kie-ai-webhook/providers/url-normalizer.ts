/**
 * URL normalization for various payload formats
 */

import { isMidjourneyModel } from "./midjourney-handler.ts";

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
        console.log('📄 Normalized URLs from resultJson:', urls.length);
      } else if (parsed.resultUrl) {
        urls.push(parsed.resultUrl);
        console.log('📄 Normalized single URL from resultJson');
      }
    } catch (e) {
      console.error('Failed to parse resultJson:', e);
    }
  }
  
  // MIDJOURNEY SPECIFIC: Check for direct data.resultUrls format
  if (urls.length === 0 && isMidjourney && payload.data?.resultUrls) {
    if (Array.isArray(payload.data.resultUrls)) {
      urls.push(...payload.data.resultUrls);
      console.log('🎨 [MIDJOURNEY] Normalized URLs from data.resultUrls:', urls.length);
    }
  }
  
  // Try new data.info format (snake_case and camelCase)
  if (urls.length === 0 && payload.data?.info) {
    const info = payload.data.info;
    
    // Try plural formats first
    const infoUrls = info.result_urls ?? info.resultUrls;
    if (Array.isArray(infoUrls) && infoUrls.length > 0) {
      urls.push(...infoUrls);
      console.log('ℹ️ Normalized URLs from data.info (plural):', urls.length);
    } 
    // Try singular formats (FLUX Kontext, etc.)
    else {
      const singleUrl = info.resultImageUrl ?? info.result_image_url ?? info.resultUrl ?? info.result_url;
      if (singleUrl) {
        urls.push(singleUrl);
        console.log('ℹ️ Normalized single URL from data.info');
      }
    }
  }
  
  // Fallback to old data.data format
  if (urls.length === 0 && Array.isArray(payload.data?.data)) {
    console.log('📦 Using old data.data format');
    return []; // Return empty to signal we should use items format
  }
  
  console.log(`✅ Normalized ${urls.length} URL(s) for type: ${generationType} (model: ${modelId || 'unknown'})`);
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
