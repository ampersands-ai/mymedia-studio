/**
 * Type-specific result validation
 */

interface PayloadWithInfo {
  data?: {
    info?: {
      resultUrls?: string[];
      result_urls?: string[];
    };
    video_url?: string;
  };
}

export function hasUrlsInInfo(payload: PayloadWithInfo): boolean {
  const info = payload.data?.info;
  const urls = (info?.resultUrls ?? info?.result_urls) as string[] | undefined;
  return Array.isArray(urls) && urls.length > 0;
}

export function hasUrlsInResultJson(resultJson: string | null): boolean {
  if (!resultJson) return false;
  try {
    const parsed = JSON.parse(resultJson);
    const urls = parsed?.resultUrls || (parsed?.resultUrl ? [parsed.resultUrl] : []);
    return Array.isArray(urls) && urls.length > 0;
  } catch { 
    return false; 
  }
}

interface ResultItem {
  image_url?: string;
  source_image_url?: string;
  audio_url?: string;
  source_audio_url?: string;
  stream_audio_url?: string;
  video_url?: string;
  source_video_url?: string;
}

export function hasImageResults(items: ResultItem[], payload: PayloadWithInfo, resultJson: string | null): boolean {
  const fromItems = Array.isArray(items) && items.length > 0 &&
         items.every(item => item?.image_url || item?.source_image_url);
  return fromItems || hasUrlsInInfo(payload) || hasUrlsInResultJson(resultJson);
}

export function hasAudioResults(items: ResultItem[], payload: PayloadWithInfo, resultJson: string | null): boolean {
  const fromItems = Array.isArray(items) && items.length > 0 &&
         items.every(item => item?.audio_url || item?.source_audio_url || item?.stream_audio_url);
  return fromItems || hasUrlsInInfo(payload) || hasUrlsInResultJson(resultJson);
}

export function hasVideoResults(items: ResultItem[], payload: PayloadWithInfo, resultJson: string | null): boolean {
  const fromItems = Array.isArray(items) && items.length > 0 &&
            items.every(item => item?.video_url || item?.source_video_url);
  return Boolean(payload.data?.video_url) || fromItems || hasUrlsInInfo(payload) || hasUrlsInResultJson(resultJson);
}
