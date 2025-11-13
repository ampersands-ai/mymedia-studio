/**
 * Content download from provider URLs
 */

import { webhookLogger } from "../../_shared/logger.ts";

export interface DownloadResult {
  success: boolean;
  data?: Uint8Array;
  contentType?: string;
  error?: string;
}

export async function downloadContent(url: string): Promise<DownloadResult> {
  try {
    console.log('⬇️ Downloading content from:', url);

    const response = await fetch(url);
    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const contentType = response.headers.get('content-type') || '';
    
    console.log('✅ Downloaded successfully. Size:', data.length, 'bytes');
    
    return {
      success: true,
      data,
      contentType
    };
  } catch (error: any) {
    console.error('❌ Download failed:', error);
    return {
      success: false,
      error: error.message || 'Unknown download error'
    };
  }
}
