/**
 * Audio-specific utilities
 * New module for audio content handling
 */

import { getOptimizedAudioUrl as getSupabaseAudioUrl } from '@/lib/supabase-videos';
import { type URLStrategy, type AudioMediaOptions } from './types';
import { MEDIA_CONFIG } from './config';

/**
 * Get audio URL based on strategy
 */
export function getAudioUrl(
  storagePath: string,
  options: AudioMediaOptions = {}
): string {
  const {
    strategy = MEDIA_CONFIG.defaults.audio,
    bucket = 'generated-content',
  } = options;

  // Route to correct function based on strategy
  switch (strategy) {
    case 'public-direct':
    case 'public-cdn':
      return getSupabaseAudioUrl(storagePath, bucket);
    
    case 'signed-short':
    case 'signed-long':
      // Signed URLs require async operation, handled by hook
      throw new Error('Signed URL strategy requires useAudioUrl hook');
    
    default:
      return getSupabaseAudioUrl(storagePath, bucket);
  }
}

/**
 * Check if browser supports audio format
 */
export function supportsAudioFormat(format: string): boolean {
  const audio = document.createElement('audio');
  return audio.canPlayType(`audio/${format}`) !== '';
}

/**
 * Get best audio format for browser
 */
export function getBestAudioFormat(): 'mp3' | 'ogg' | 'wav' {
  if (supportsAudioFormat('ogg')) return 'ogg';
  if (supportsAudioFormat('mp3')) return 'mp3';
  return 'wav';
}
