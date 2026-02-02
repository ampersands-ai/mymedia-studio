/**
 * Provider Display Utility
 * 
 * Centralizes provider name mapping to hide internal providers
 * (Kie.ai, Runware) and display them as "ARTIFIO" instead.
 * 
 * Usage:
 * ```typescript
 * import { getDisplayProvider } from '@/lib/utils/provider-display';
 * 
 * const displayName = getDisplayProvider('Kie AI'); // Returns 'ARTIFIO'
 * const displayName = getDisplayProvider('OpenAI'); // Returns 'OpenAI'
 * ```
 */

/**
 * Internal providers that should be hidden from users
 * These are infrastructure providers, not the actual model creators
 */
export const HIDDEN_PROVIDERS = [
  'Kie AI',
  'Kie.ai',
  'kie_ai',
  'Runware',
  'runware',
  'lovable_ai_sync',
] as const;

/**
 * Display name to show instead of hidden providers
 */
export const DEFAULT_DISPLAY_PROVIDER = 'ARTIFIO';

/**
 * Convert an internal provider name to a display-friendly name
 * Hides Kie.ai and Runware, showing "ARTIFIO" instead
 * 
 * @param provider - The internal provider name from MODEL_CONFIG
 * @returns The display-friendly provider name
 */
export function getDisplayProvider(provider: string): string {
  if (!provider) return DEFAULT_DISPLAY_PROVIDER;
  
  const normalizedProvider = provider.toLowerCase().replace(/[.\s_-]/g, '');
  
  // Check if this is a hidden provider
  const isHidden = HIDDEN_PROVIDERS.some(hidden => {
    const normalizedHidden = hidden.toLowerCase().replace(/[.\s_-]/g, '');
    return normalizedProvider === normalizedHidden || 
           normalizedProvider.includes(normalizedHidden);
  });
  
  return isHidden ? DEFAULT_DISPLAY_PROVIDER : provider;
}

/**
 * Check if a provider should be hidden
 * 
 * @param provider - The provider name to check
 * @returns true if the provider should be hidden
 */
export function isHiddenProvider(provider: string): boolean {
  if (!provider) return true;
  
  const normalizedProvider = provider.toLowerCase().replace(/[.\s_-]/g, '');
  
  return HIDDEN_PROVIDERS.some(hidden => {
    const normalizedHidden = hidden.toLowerCase().replace(/[.\s_-]/g, '');
    return normalizedProvider === normalizedHidden || 
           normalizedProvider.includes(normalizedHidden);
  });
}

/**
 * Format content type for display
 * Converts snake_case to Title Case
 * 
 * @param contentType - The content type (e.g., 'prompt_to_image')
 * @returns Formatted display string (e.g., 'Text to Image')
 */
export function formatContentType(contentType: string): string {
  const typeMap: Record<string, string> = {
    'prompt_to_image': 'Text to Image',
    'image_editing': 'Image Editing',
    'image_to_image': 'Image to Image',
    'image_to_video': 'Image to Video',
    'prompt_to_video': 'Text to Video',
    'video_to_video': 'Video to Video',
    'lip_sync': 'Lip Sync',
    'prompt_to_audio': 'Text to Audio',
  };
  
  return typeMap[contentType] || contentType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get category from content type
 * Maps detailed content types to broader categories
 * 
 * @param contentType - The content type
 * @returns The category string
 */
export function contentTypeToCategory(contentType: string): string {
  const categoryMap: Record<string, string> = {
    'prompt_to_image': 'Image Generation',
    'image_editing': 'Image Editing',
    'image_to_image': 'Image Editing',
    'image_to_video': 'Video Generation',
    'prompt_to_video': 'Video Generation',
    'video_to_video': 'Video Editing',
    'lip_sync': 'Lip Sync',
    'prompt_to_audio': 'Audio Generation',
  };
  
  return categoryMap[contentType] || 'AI Generation';
}

/**
 * Get icon name for content type
 * 
 * @param contentType - The content type
 * @returns Lucide icon name
 */
export function getContentTypeIcon(contentType: string): string {
  const iconMap: Record<string, string> = {
    'prompt_to_image': 'Image',
    'image_editing': 'Wand2',
    'image_to_image': 'RefreshCw',
    'image_to_video': 'Video',
    'prompt_to_video': 'Film',
    'video_to_video': 'Clapperboard',
    'lip_sync': 'Mic',
    'prompt_to_audio': 'Music',
  };
  
  return iconMap[contentType] || 'Sparkles';
}

/**
 * Get provider logo path
 * Maps provider names to their logo files in /logos/
 * 
 * @param provider - The provider name
 * @returns Path to the provider logo
 */
export function getProviderLogo(provider: string): string {
  const logoMap: Record<string, string> = {
    'openai': '/logos/openai.png',
    'google': '/logos/google.png',
    'flux': '/logos/flux.png',
    'black forest labs': '/logos/flux.png',
    'blackforestlabs': '/logos/flux.png',
    'kling': '/logos/kling.png',
    'minimax': '/logos/minimax.png',
    'elevenlabs': '/logos/elevenlabs.png',
    'suno': '/logos/suno.png',
    'runway': '/logos/runway.png',
    'midjourney': '/logos/midjourney.png',
    'anthropic': '/logos/anthropic.png',
    'hailuo': '/logos/hailuo.png',
    'recraft': '/logos/recraft.png',
    'seedream': '/logos/seedream.png',
    'sora': '/logos/sora.png',
    'wan': '/logos/wan.png',
    'xai': '/logos/xai.png',
    'hidream': '/logos/hidream.png',
    'ideogram': '/logos/ideogram.png',
    'topaz': '/logos/topaz.png',
    'qwen': '/logos/qwen.png',
    'plum': '/logos/plum.png',
    'grok': '/logos/grok.png',
  };
  
  if (!provider) return '/logos/artifio.png';
  
  const normalizedProvider = provider.toLowerCase().replace(/[.\s_-]/g, '');
  
  for (const [key, path] of Object.entries(logoMap)) {
    if (normalizedProvider.includes(key)) {
      return path;
    }
  }
  
  return '/logos/artifio.png';
}
