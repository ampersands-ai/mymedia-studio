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
    webhookLogger.info('Starting content download', { url: url.substring(0, 100) });

    const response = await fetch(url);
    if (!response.ok) {
      webhookLogger.error('Download failed - HTTP error', {
        url: url.substring(0, 100),
        statusCode: response.status,
        statusText: response.statusText
      });
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const contentType = response.headers.get('content-type') || '';
    
    webhookLogger.download(url, true, {
      size: data.length,
      contentType
    });
    
    return {
      success: true,
      data,
      contentType
    };
  } catch (error) {
    webhookLogger.download(url, false, {
      error: error.message || 'Unknown download error'
    });
    return {
      success: false,
      error: error.message || 'Unknown download error'
    };
  }
}
