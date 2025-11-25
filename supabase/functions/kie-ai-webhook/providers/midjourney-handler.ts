/**
 * Midjourney-specific provider logic
 */

interface MidjourneyPayload {
  data?: {
    resultUrls?: string[];
  };
}

export function isMidjourneyModel(modelId: string | undefined): boolean {
  if (!modelId) return false;
  // Match any Midjourney model variant (current: mj_txt2img, future: mj_img2img, mj_upscale, etc.)
  return modelId.startsWith('mj_') || modelId.includes('midjourney');
}

export function hasMidjourneyResults(payload: MidjourneyPayload, modelId?: string): boolean {
  return isMidjourneyModel(modelId) &&
         !!payload.data?.resultUrls &&
         Array.isArray(payload.data.resultUrls);
}

export function extractMidjourneyUrls(payload: MidjourneyPayload): string[] {
  if (payload.data?.resultUrls && Array.isArray(payload.data.resultUrls)) {
    return payload.data.resultUrls;
  }
  return [];
}
