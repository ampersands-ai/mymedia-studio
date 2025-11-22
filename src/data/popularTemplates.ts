import type { ContentTemplate } from "@/hooks/useTemplates";

// Popular template IDs - manually curated based on usage and versatility
export const POPULAR_TEMPLATE_IDS = [
  'portrait-headshots',
  'product-photos',
  'social-media-content'
];

/**
 * DEPRECATED: content_templates table has been removed
 * Returns empty array - templates functionality deprecated
 */
export const getPopularTemplates = async (): Promise<ContentTemplate[]> => {
  console.warn('getPopularTemplates: content_templates table removed');
  return [];
};
